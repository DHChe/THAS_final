"""
통합 급여 지급 내역 생성 시스템

주요 기능:
1. 직원 기본 정보 관리 및 검증
2. 4대보험 계산 (2025년 요율 기준)
3. 급여 소득세 계산 (간이세액표 기반)
4. 급여 지급 내역 생성 (2019.10 ~ 2024.09)
5. 일할계산 지원 (30일 기준)
6. 입/퇴사자 급여처리

작성자: Claude
작성일: 2024.01.17
버전: 1.1.0
"""

import pandas as pd
import numpy as np
from datetime import datetime, date, timedelta
from dataclasses import dataclass
from typing import List, Dict, Optional
import json
import logging
from pathlib import Path
from functools import lru_cache

# 로깅 설정
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@dataclass
class Employee:
    """직원 정보 클래스"""

    employee_id: str
    name: str
    department: str
    position: str
    join_date: date
    birth: date
    sex: str
    base_salary: int
    status: str
    resignation_date: Optional[date] = None  # 퇴사일 필드 추가
    dependents: int = 1  # 공제대상가족 수
    children: List[date] = None  # 자녀 생년월일 리스트

    @property
    def tax_deductible_children(self) -> int:
        """세액공제 대상 자녀 수 계산 (8-20세)"""
        if not self.children:
            return 0

        today = date.today()
        return sum(1 for birth in self.children if 8 <= (today.year - birth.year) <= 20)

    def validate(self):
        """직원 정보 유효성 검증"""
        if not self.employee_id or not isinstance(self.employee_id, str):
            raise ValueError("유효하지 않은 직원번호")

        if not (1 <= self.dependents <= 11):
            raise ValueError("공제대상가족 수는 1-11 사이여야 함")

        if self.base_salary <= 0:
            raise ValueError("기본급이 0보다 커야 함")

        if (
            self.resignation_date and self.resignation_date < self.join_date
        ):  # 퇴사일 검증 추가
            raise ValueError("퇴사일이 입사일보다 빠를 수 없음")


@dataclass
class PaymentRecord:
    """급여 지급 내역 클래스"""

    payment_id: str  # 지급번호 (YYYYMM + 일련번호)
    employee_id: str  # 직원번호
    payment_date: date  # 지급일
    base_salary: int  # 기본급
    position_allowance: int  # 직책수당
    overtime_pay: int  # 연장근로수당
    night_shift_pay: int  # 야간근로수당
    holiday_pay: int  # 휴일근로수당
    meal_allowance: int  # 식대
    transportation_allowance: int  # 교통비
    bonus: int  # 상여금
    gross_salary: int  # 지급총액
    national_pension: int  # 국민연금
    health_insurance: int  # 건강보험
    long_term_care: int  # 장기요양보험
    employment_insurance: int  # 고용보험
    income_tax: int  # 소득세
    local_income_tax: int  # 지방소득세
    net_salary: int  # 실지급액


class InsuranceCalculator:
    """4대보험 계산기 (2025년 요율 기준)"""

    # 국민연금 기준소득월액 상한/하한
    NP_MIN_INCOME = 390_000  # 하한액
    NP_MAX_INCOME = 6_170_000  # 상한액

    # 보험요율 (근로자 부담분)
    NP_RATE = 0.045  # 국민연금 4.5%
    HI_RATE = 0.03545  # 건강보험 3.545%
    LTC_RATE = 0.1295  # 장기요양보험 12.95%
    EI_RATE = 0.009  # 고용보험 0.9%

    @classmethod
    def calculate_national_pension(cls, monthly_income: int) -> int:
        """국민연금 계산"""
        base_income = max(min(monthly_income, cls.NP_MAX_INCOME), cls.NP_MIN_INCOME)
        return int(base_income * cls.NP_RATE)

    @classmethod
    def calculate_health_insurance(cls, monthly_income: int) -> int:
        """건강보험료 계산"""
        return int(monthly_income * cls.HI_RATE)

    @classmethod
    def calculate_long_term_care(cls, health_insurance: int) -> int:
        """장기요양보험료 계산 (건강보험료의 12.95% × 0.5)"""
        return int(health_insurance * cls.LTC_RATE * 0.5)

    @classmethod
    def calculate_employment_insurance(cls, monthly_income: int) -> int:
        """고용보험료 계산"""
        return int(monthly_income * cls.EI_RATE)


class TaxCalculator:
    """급여 소득세 계산기"""

    def __init__(self, tax_table_path: str = "Data/tax_table_2024.json"):
        """세액표 로드"""
        self.tax_table = self._load_tax_table(tax_table_path)

    def _load_tax_table(self, file_path: str) -> dict:
        """간이세액표 데이터 로드"""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"세액표 로드 실패: {str(e)}")
            raise

    @lru_cache(maxsize=1000)
    def calculate_tax(
        self, monthly_income: int, dependents: int, num_children: int
    ) -> tuple:
        """
        소득세 및 지방소득세 계산
        Returns:
            tuple: (소득세, 지방소득세)
        """
        # 간이세액표에서 세액 조회
        base_tax = self._lookup_tax_table(monthly_income, dependents)

        # 자녀 세액공제
        child_credit = self._calculate_child_tax_credit(num_children)

        # 최종 세액 계산
        income_tax = max(0, base_tax - child_credit)
        local_tax = int(income_tax * 0.1)  # 지방소득세는 소득세의 10%

        return income_tax, local_tax

    def _lookup_tax_table(self, income: int, dependents: int) -> int:
        """간이세액표에서 해당 구간 세액 조회"""
        # 1천만원 이하 구간
        if income <= 10_000_000:
            bracket = self._find_tax_bracket(income)
            if bracket:
                return self.tax_table["tax_brackets"][bracket][str(dependents)]
            return 0

        # 1천만원 초과 구간
        for bracket, calc_info in self.tax_table["high_income_brackets"].items():
            start, end = map(int, bracket.split("-"))  # 문자열 키를 숫자로 분리
            if start <= income <= end:
                return self._calculate_high_income_tax(income, calc_info, dependents)
        return 0

    def _calculate_child_tax_credit(self, num_children: int) -> int:
        """자녀 세액공제액 계산"""
        if num_children == 0:
            return 0
        elif num_children == 1:
            return 12_500
        elif num_children == 2:
            return 29_160
        else:
            return 29_160 + ((num_children - 2) * 25_000)

    def _find_tax_bracket(self, income: int) -> Optional[str]:
        """해당 소득이 속한 구간 찾기 (이진 검색)"""
        brackets = sorted(
            [
                (int(start), int(end))
                for bracket in self.tax_table["tax_brackets"].keys()
                for start, end in [bracket.split("-")]
            ]
        )

        left, right = 0, len(brackets) - 1
        while left <= right:
            mid = (left + right) // 2
            start, end = brackets[mid]

            if start <= income <= end:
                return f"{start}-{end}"
            elif income < start:
                right = mid - 1
            else:
                left = mid + 1

        return None

    def _calculate_high_income_tax(
        self, income: int, calc_info: dict, dependents: int
    ) -> int:
        """고액 구간 세액 계산"""
        # 부양가족 수에 따른 기준세액 가져오기
        base_tax = calc_info["base_tax"][str(dependents)]
        rate = calc_info["rate"]
        addition = calc_info["addition"]

        # 계산식: 기준세액 + (초과금액 × 98% × 세율) + 추가금액
        excess_amount = income - 10_000_000
        return base_tax + int(excess_amount * 0.98 * rate) + addition


class SalaryCalculator:
    """급여 계산 클래스"""

    @staticmethod
    def calculate_daily_rate(monthly_salary: int) -> float:
        """일급 계산 (30일 기준)"""
        return monthly_salary / 30

    @staticmethod
    def calculate_prorated_salary(
        monthly_salary: int,
        start_date: date,
        end_date: date,
        payment_period_start: date,
        payment_period_end: date,
    ) -> int:
        """일할 계산 수행"""
        daily_rate = SalaryCalculator.calculate_daily_rate(monthly_salary)
        actual_start = max(start_date, payment_period_start)
        actual_end = min(end_date, payment_period_end)
        working_days = (actual_end - actual_start).days + 1
        return int(daily_rate * working_days)

    @staticmethod
    def calculate_position_allowance(position: str) -> int:
        """직책수당 계산"""
        allowance_table = {
            "사원": 0,
            "대리": 50000,
            "과장": 100000,
            "차장": 150000,
            "부장": 200000,
            "이사": 300000,
        }
        return allowance_table.get(position, 0)

    @staticmethod
    def calculate_bonus(employee: Employee, payment_date: date) -> int:
        """상여금 계산"""
        if payment_date.month in [1, 9]:  # 설날/추석 상여 지급월
            return int(employee.base_salary / 12)
        return 0

    @staticmethod
    def calculate_severance_pay(
        employee: Employee, resignation_date: date, avg_salary_periods: int = 3
    ) -> int:
        """퇴직금 계산"""
        # 근속연수 계산 (입사일, 퇴사일 포함)
        total_days = (resignation_date - employee.join_date).days + 1
        years_of_service = round(total_days / 365, 3)  # 소수점 3자리까지 계산

        if years_of_service < 1:
            return 0

        monthly_payments = []
        for i in range(avg_salary_periods):
            month_salary = (
                employee.base_salary / 12
                + SalaryCalculator.calculate_position_allowance(employee.position)
                + 100000  # 식대
                + 100000  # 교통비
                + (employee.base_salary / 12) / 6  # 상여금 월 평균
            )
            monthly_payments.append(month_salary)

        monthly_avg = sum(monthly_payments) / len(monthly_payments)
        return int(monthly_avg * years_of_service)


class PayrollGenerator:
    """급여 지급 내역 생성기"""

    def __init__(self):
        """계산기 초기화"""
        self.insurance_calc = InsuranceCalculator()
        self.tax_calc = TaxCalculator()
        self.salary_calc = SalaryCalculator()

    def generate_payroll(
        self,
        employee_file: str,
        start_date: date,
        end_date: date,
        output_file: Optional[str] = None,  # output_file 매개변수 추가
    ) -> List[PaymentRecord]:
        """
        급여 지급 내역 생성
        Args:
            employee_file: 직원 정보 파일 경로
            start_date: 시작일
            end_date: 종료일
            output_file: 출력 파일 경로 (선택)
        Returns:
            List[PaymentRecord]: 급여 지급 내역 리스트
        """
        try:
            employees = self._load_employees(employee_file)
            payment_records = []

            current_date = start_date
            while current_date <= end_date:
                # 급여 계산 기간 설정
                work_period_start = current_date - timedelta(
                    days=current_date.day - 21
                )  # 전월 21일
                if current_date.day < 21:
                    work_period_start = (
                        work_period_start - timedelta(days=32)
                    ).replace(day=21)

                work_period_end = (work_period_start + timedelta(days=32)).replace(
                    day=20
                )  # 익월 20일
                payment_date = work_period_end + timedelta(
                    days=5
                )  # 급여 지급일 (20일 + 5일 = 25일)

                for employee in employees:
                    record = self._create_monthly_record(
                        employee,
                        payment_date=payment_date,
                        work_period_start=work_period_start,
                        work_period_end=work_period_end,
                    )
                    if record:
                        payment_records.append(record)

                # 다음 달로 이동
                current_date = (current_date + timedelta(days=32)).replace(day=1)

            if output_file:
                self._save_payroll_to_file(payment_records, output_file)

            return payment_records

        except Exception as e:
            logger.error(f"급여 지급 내역 생성 실패: {str(e)}")
            raise

    def _load_employees(self, file_path: str) -> List[Employee]:
        """직원 정보 로드 및 검증"""
        df = pd.read_csv(file_path)
        employees = []

        for _, row in df.iterrows():
            try:
                employee = Employee(
                    employee_id=row["employee_id"],
                    name=row["name"],
                    department=row["department"],
                    position=row["position"],
                    join_date=datetime.strptime(row["join_date"], "%Y-%m-%d").date(),
                    birth=datetime.strptime(row["birth"], "%Y-%m-%d").date(),
                    sex=row["sex"],
                    base_salary=row["base_salary"],
                    status=row["status"],
                )
                employee.validate()
                employees.append(employee)

            except Exception as e:
                logger.error(f"직원 정보 처리 오류 - {row['employee_id']}: {str(e)}")
                continue

        return employees

    def _create_monthly_record(
        self,
        employee: Employee,
        payment_date: date,
        work_period_start: date,
        work_period_end: date,
    ) -> Optional[PaymentRecord]:
        """월별 급여 지급 내역 생성"""
        try:
            # 퇴사자 처리
            if employee.status == "퇴사" and employee.resignation_date:
                if work_period_start > employee.resignation_date:
                    return None

                # 퇴직금 계산 (퇴사월에만 지급)
                severance_pay = self.salary_calc.calculate_severance_pay(
                    employee=employee, resignation_date=employee.resignation_date
                )

                # 일할계산
                monthly_base = self.salary_calc.calculate_prorated_salary(
                    monthly_salary=employee.base_salary / 12,
                    start_date=work_period_start,
                    end_date=employee.resignation_date,
                    payment_period_start=work_period_start,
                    payment_period_end=work_period_end,
                )
            else:
                monthly_base = int(employee.base_salary / 12)
                severance_pay = 0

            position_allowance = int(
                self.salary_calc.calculate_position_allowance(employee.position)
            )
            bonus = self.salary_calc.calculate_bonus(employee, payment_date)

            gross_salary = (
                monthly_base
                + position_allowance
                + 100000  # 식대
                + 100000  # 교통비
                + bonus
                + severance_pay  # 퇴직금 추가
            )

            # 2. 공제액 계산
            national_pension = self.insurance_calc.calculate_national_pension(
                gross_salary
            )
            health_insurance = self.insurance_calc.calculate_health_insurance(
                gross_salary
            )
            long_term_care = self.insurance_calc.calculate_long_term_care(
                health_insurance
            )
            employment_insurance = self.insurance_calc.calculate_employment_insurance(
                gross_salary
            )

            income_tax, local_tax = self.tax_calc.calculate_tax(
                monthly_income=gross_salary,
                dependents=employee.dependents,
                num_children=employee.tax_deductible_children,
            )

            # 3. 실지급액 계산
            deductions = (
                national_pension
                + health_insurance
                + long_term_care
                + employment_insurance
                + income_tax
                + local_tax
            )
            net_salary = gross_salary - deductions

            # 4. 지급 내역 생성
            return PaymentRecord(
                payment_id=f"{work_period_end.year}{work_period_end.month:02d}{employee.employee_id}",
                employee_id=employee.employee_id,
                payment_date=payment_date,
                base_salary=monthly_base,
                position_allowance=position_allowance,
                overtime_pay=0,  # 추후 근태기록 기반으로 계산
                night_shift_pay=0,  # 추후 근태기록 기반으로 계산
                holiday_pay=0,  # 추후 근태기록 기반으로 계산
                meal_allowance=100000,
                transportation_allowance=100000,
                bonus=bonus,
                gross_salary=gross_salary,
                national_pension=national_pension,
                health_insurance=health_insurance,
                long_term_care=long_term_care,
                employment_insurance=employment_insurance,
                income_tax=income_tax,
                local_income_tax=local_tax,
                net_salary=net_salary,
            )
        except Exception as e:
            logger.error(f"월별 급여 지급 내역 생성 실패: {str(e)}")
            return None

    def _save_payroll_to_file(
        self, payment_records: List[PaymentRecord], file_path: str
    ):
        """급여 지급 내역을 파일에 저장"""
        df = pd.DataFrame(payment_records)
        df.to_csv(file_path, index=False)


if __name__ == "__main__":
    try:
        # 급여 생성기 초기화
        generator = PayrollGenerator()

        # 시작일과 종료일 설정
        start_date = date(2019, 10, 1)
        end_date = date(2024, 9, 30)

        # 급여 데이터 생성
        records = generator.generate_payroll(
            employee_file="Data/employees.csv",  # 직원 정보 파일 경로 수정
            start_date=start_date,
            end_date=end_date,
            output_file="Data/payroll_records.csv",  # 결과 저장 파일 경로도 수정
        )

        logger.info(f"급여 데이터 생성 완료: {len(records)}건")

    except Exception as e:
        logger.error(f"급여 데이터 생성 실패: {str(e)}")
