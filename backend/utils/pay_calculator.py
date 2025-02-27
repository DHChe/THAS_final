from datetime import datetime, time
import pandas as pd
import holidays

# 급여 지급일 설정 (매월 25일로 가정)
PAYROLL_DAY = 25  # *** 급여 지급일 설정 (변경 시 이 값을 수정하세요) ***


class PayCalculator:
    def __init__(self):
        self.WORK_HOURS_PER_MONTH = 209
        self.DAYS_PER_MONTH = 30
        self.kr_holidays = holidays.KR()

    def is_full_month(self, start_date, end_date):
        """지정한 기간이 완전한 급여 기간인지 확인"""
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")

        # 시작일이 급여지급일인지 확인
        if start.day == PAYROLL_DAY:
            # 종료일 계산: 다음달 (급여지급일-1)일
            expected_end_month = start.month % 12 + 1  # 다음달 (12월이면 1월)
            expected_end_year = start.year + (1 if start.month == 12 else 0)
            expected_end_day = (
                PAYROLL_DAY - 1 if PAYROLL_DAY > 1 else 31
            )  # 급여지급일이 1일이면 전달 말일

            # 월말까지 조정 (2월 등 월말이 예상일보다 적은 경우)
            month_days = pd.Period(
                year=expected_end_year, month=expected_end_month, freq="M"
            ).days_in_month
            if expected_end_day > month_days:
                expected_end_day = month_days

            expected_end = datetime(
                expected_end_year, expected_end_month, expected_end_day
            )
            return end.date() == expected_end.date()
        return False

    def calculate_base_pay(
        self,
        base_salary,
        start_date,
        end_date,
        attendance_data,
        join_date=None,
        resignation_date=None,
    ):
        monthly_salary = base_salary / 12
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")

        # 급여 기간의 일수 계산
        period_days = (end_dt - start_dt).days + 1

        # 정상 급여 기간인지 확인 (급여지급일 ~ 다음달 급여지급일-1)
        is_normal_period = self.is_full_month(start_date, end_date)

        # 정상 급여 기간이면 월급여 전체 반환
        if is_normal_period and not (join_date or resignation_date):
            return int(monthly_salary)

        # 중도 입사/퇴사 또는 부분 기간인 경우 일할 계산
        # 월급여 ÷ 30 × 8 = 하루 통상임금
        daily_wage = (monthly_salary / 30) * 8

        # 실제 근무 기간 계산 (입사일/퇴사일 고려)
        if join_date or resignation_date:
            join_dt = (
                datetime.strptime(join_date, "%Y-%m-%d") if join_date else start_dt
            )
            resign_dt = (
                datetime.strptime(resignation_date, "%Y-%m-%d")
                if resignation_date
                else end_dt
            )

            # 실제 시작일은 선택 기간과 입사일 중 더 늦은 날짜
            effective_start = max(start_dt, join_dt)

            # 실제 종료일은 선택 기간과 퇴사일 중 더 이른 날짜
            effective_end = min(end_dt, resign_dt)

            # 실제 근무 일수 계산
            working_days = (effective_end - effective_start).days + 1
        else:
            # 입사일/퇴사일이 없으면 선택 기간 전체가 근무 기간
            working_days = period_days

        # 하루 통상임금 × 근무 일수 = 기본급
        base_pay = daily_wage * working_days

        return int(base_pay)

    def calculate_overtime_pay(self, attendance_data, hourly_rate):
        total_overtime_pay = 0
        for record in attendance_data:
            work_hours = self._calculate_work_hours(
                record["check_in"], record["check_out"], record["attendance_type"]
            )
            overtime_hours = max(0, work_hours - 8)
            total_overtime_pay += overtime_hours * hourly_rate * 1.5
        return int(total_overtime_pay)

    def calculate_night_pay(self, attendance_data, hourly_rate):
        total_night_pay = 0
        for record in attendance_data:
            night_hours = self._calculate_night_hours(
                record["check_in"], record["check_out"]
            )
            total_night_pay += night_hours * hourly_rate * 0.5
        return int(total_night_pay)

    def _calculate_work_hours(self, check_in, check_out, attendance_type):
        if not check_in or not check_out:
            return 0
        check_in_dt = datetime.strptime(check_in, "%Y-%m-%d %H:%M:%S")
        check_out_dt = datetime.strptime(check_out, "%Y-%m-%d %H:%M:%S")
        total_hours = (check_out_dt - check_in_dt).total_seconds() / 3600

        if total_hours >= 9:
            total_hours -= 1
        return total_hours

    def _calculate_night_hours(self, check_in, check_out):
        if not check_in or not check_out:
            return 0
        check_in_dt = datetime.strptime(check_in, "%Y-%m-%d %H:%M:%S")
        check_out_dt = datetime.strptime(check_out, "%Y-%m-%d %H:%M:%S")
        night_start = datetime.combine(check_in_dt.date(), time(22, 0))
        night_end = datetime.combine(check_in_dt.date(), time(6, 0)) + pd.Timedelta(
            days=1
        )

        if check_out_dt <= night_start or check_in_dt >= night_end:
            return 0
        start = max(check_in_dt, night_start)
        end = min(check_out_dt, night_end)
        return (end - start).total_seconds() / 3600

    def _is_holiday(self, date_str):
        date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
        return date_obj in self.kr_holidays or date_obj.weekday() >= 5

    def calculate_holiday_pay(self, attendance_data, hourly_rate):
        total_holiday_pay = 0
        for record in attendance_data:
            if record["attendance_type"] == "휴일" or self._is_holiday(record["date"]):
                work_hours = self._calculate_work_hours(
                    record["check_in"], record["check_out"], record["attendance_type"]
                )
                if work_hours <= 8:
                    total_holiday_pay += work_hours * hourly_rate * 1.5
                else:
                    total_holiday_pay += (8 * hourly_rate * 1.5) + (
                        (work_hours - 8) * hourly_rate * 2.0
                    )
        return int(total_holiday_pay)

    def get_total_pay(
        self,
        base_salary,
        start_date,
        end_date,
        attendance_data,
        join_date=None,
        resignation_date=None,
    ):
        hourly_rate = (base_salary / 12) / self.WORK_HOURS_PER_MONTH
        base_pay = self.calculate_base_pay(
            base_salary,
            start_date,
            end_date,
            attendance_data,
            join_date,
            resignation_date,
        )
        overtime_pay = self.calculate_overtime_pay(attendance_data, hourly_rate)
        night_pay = self.calculate_night_pay(attendance_data, hourly_rate)
        holiday_pay = self.calculate_holiday_pay(attendance_data, hourly_rate)
        return base_pay + overtime_pay + night_pay + holiday_pay
