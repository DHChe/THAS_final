from datetime import datetime, time, timedelta
import pandas as pd
import holidays

# 급여 지급일 설정 (매월 1일 또는 25일 등으로 설정 가능)
PAYROLL_DAY = 1  # *** 급여 지급일 설정 (변경 시 이 값을 수정하세요) ***

# 소정근로시간 설정
REGULAR_WORKDAY_START = 9  # 일반 근로일 근무 시작 시간 (09:00)
REGULAR_WORKDAY_END = 18  # 일반 근로일 근무 종료 시간 (18:00)


class PayCalculator:
    def __init__(
        self,
        employee=None,
        attendance_records=None,
        period_start_date=None,
        period_end_date=None,
    ):
        # 월 소정 근로시간: 8시간 × 6일 × 365일 ÷ 12개월 ÷ 7일 = 약 209시간
        self.WORK_HOURS_PER_MONTH = 209
        self.kr_holidays = holidays.KR()
        self.employee = employee
        self.attendance_records = attendance_records
        self.period_start_date = period_start_date
        self.period_end_date = period_end_date

    def is_full_month(self, start_date, end_date):
        """
        지정한 기간이 완전한 급여 기간인지 확인

        급여 지급일이 1일인 경우: 이전 달 1일부터 이전 달 말일까지
        급여 지급일이 25일인 경우: 이전 달 25일부터 현재 달 24일까지
        """
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")

        # 급여 지급일이 1일인 경우
        if PAYROLL_DAY == 1:
            # 시작일이 월초(1일)인지 확인
            if start.day == 1:
                # 종료일이 해당 월의 말일인지 확인
                last_day_of_month = pd.Period(
                    year=start.year, month=start.month, freq="M"
                ).days_in_month
                expected_end = datetime(start.year, start.month, last_day_of_month)
                return end.date() == expected_end.date()
        # 급여 지급일이 1일이 아닌 경우 (예: 25일)
        else:
            # 시작일이 급여지급일인지 확인
            if start.day == PAYROLL_DAY:
                # 종료일 계산: 다음달 (급여지급일-1)일
                next_month = start.month % 12 + 1  # 다음달 (12월이면 1월)
                next_year = start.year + (1 if start.month == 12 else 0)
                expected_end_day = PAYROLL_DAY - 1

                # 급여지급일이 1일인 경우 예외 처리 (이 부분은 PAYROLL_DAY가 1이 아닐 때만 실행됨)
                if expected_end_day == 0:
                    # 이전 달의 마지막 날로 설정
                    prev_month = (next_month - 2) % 12 + 1  # 이전달
                    prev_year = next_year - (1 if next_month == 1 else 0)
                    expected_end_day = pd.Period(
                        year=prev_year, month=prev_month, freq="M"
                    ).days_in_month

                expected_end = datetime(next_year, next_month, expected_end_day)
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
        """
        기본급 계산 함수

        완전한 급여 기간인 경우: 월급여 전체 지급 (날짜 수와 무관하게 고정)
        중도 입사/퇴사 또는 부분 기간인 경우: 일할 계산 (역일수 기준)

        역일수란: 주말, 공휴일 등 실제 근로 제공 여부와 관계없이 해당 기간의 모든 날짜를 포함
        예) 10월 1일~10일까지 10일 중 주말, 공휴일이 3일 포함되어도 10일 모두 계산

        급여 지급일이 1일인 경우: 이전 달 1일~말일까지
        급여 지급일이 5일인 경우: 이전 달 5일~현재 달 4일까지
        """
        # 월급여 계산 (연봉 ÷ 12)
        monthly_salary = base_salary / 12

        # 시작일과 종료일을 datetime 객체로 변환
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")

        # 급여 기간의 일수 계산 (역일수 기준)
        period_days = (end_dt - start_dt).days + 1

        # 정상 급여 기간인지 확인 (급여지급일 기준 완전한 한 달)
        is_normal_period = self.is_full_month(start_date, end_date)

        # 중도 입사/퇴사 여부를 확인하기 위해 입사일과 퇴사일을 datetime 객체로 변환
        join_dt = datetime.strptime(join_date, "%Y-%m-%d") if join_date else None
        resign_dt = (
            datetime.strptime(resignation_date, "%Y-%m-%d")
            if resignation_date
            else None
        )

        # 입사일이 급여 기간 내에 있는지 확인
        is_mid_entry = join_dt and join_dt > start_dt
        # 퇴사일이 급여 기간 내에 있는지 확인
        is_mid_exit = resign_dt and resign_dt < end_dt

        # 정상 급여 기간이고 중도 입사/퇴사가 아닌 경우 월급여 전체 반환 (완전한 월)
        if is_normal_period and not is_mid_entry and not is_mid_exit:
            calculation_note = "완전한 월 근무: 월급여 전체 지급"
            return int(monthly_salary)

        # 중도 입사/퇴사 또는 부분 기간인 경우 일할 계산
        # 일급 계산: 월급여 ÷ 209 × 8 = 하루 통상임금
        hourly_wage = monthly_salary / self.WORK_HOURS_PER_MONTH  # 시간당 임금
        daily_wage = hourly_wage * 8  # 일급 (8시간 기준)

        # 실제 근무 기간 계산
        if is_mid_entry or is_mid_exit:
            # 실제 시작일은 선택 기간과 입사일 중 더 늦은 날짜
            effective_start = max(start_dt, join_dt) if join_dt else start_dt

            # 실제 종료일은 선택 기간과 퇴사일 중 더 이른 날짜
            effective_end = min(end_dt, resign_dt) if resign_dt else end_dt

            # 역일수 계산 (주말, 공휴일 포함한 모든 날짜)
            calendar_days = (effective_end - effective_start).days + 1
            calculation_note = (
                f"중도 입사/퇴사 기간: {calendar_days}일 (주말/공휴일 포함 역일수)"
            )
        else:
            # 입사일/퇴사일이 없지만 부분 기간인 경우
            calendar_days = period_days
            calculation_note = f"부분 기간: {calendar_days}일 (주말/공휴일 포함 역일수)"

        # 하루 통상임금 × 역일수 = 기본급
        base_pay = daily_wage * calendar_days

        # 계산 내역 로깅 (디버그 정보)
        calculation_details = {
            "연봉": f"{base_salary:,}원",
            "월급여": f"{monthly_salary:,.2f}원",
            "시간당 임금": f"{hourly_wage:,.2f}원",
            "일급": f"{daily_wage:,.2f}원",
            "역일수": f"{calendar_days}일 (주말/공휴일 포함)",
            "계산방식": calculation_note,
            "기본급": f"{base_pay:,.2f}원",
        }

        # 결과값 정수로 반환
        return int(base_pay)

    def calculate_overtime_pay(self, attendance_data, hourly_rate):
        """
        연장근로수당 계산 함수 (개선됨)

        - 소정근로시간(9시~18시) 이외의 시간에 대해 연장근로 계산
        - 연속 근무 시 다음날이 근로일인 경우 해당일 09:00~18:00은 소정근로시간
        - 휴일 근무의 경우 모든 시간을 연장근로로, 평일 근무는 소정근로시간 외 시간만 연장근로로 계산
        """
        total_overtime_pay = 0

        for record in attendance_data:
            # 출퇴근 시간이 없으면 건너뛰기
            if not record["check_in"] or not record["check_out"]:
                continue

            check_in_dt = datetime.strptime(record["check_in"], "%Y-%m-%d %H:%M:%S")
            check_out_dt = datetime.strptime(record["check_out"], "%Y-%m-%d %H:%M:%S")

            # 출근일이 휴일인지 확인
            first_day_is_holiday = record[
                "attendance_type"
            ] == "휴일" or self._is_holiday(check_in_dt.strftime("%Y-%m-%d"))

            # 날짜가 바뀌는지 확인
            if check_in_dt.date() != check_out_dt.date():
                # ===== 첫째 날 처리 =====
                if first_day_is_holiday:
                    # 휴일인 경우 모든 시간이 연장근로
                    first_day_end = datetime.combine(
                        check_in_dt.date(), time(23, 59, 59)
                    )
                    first_day_hours = (
                        first_day_end - check_in_dt
                    ).total_seconds() / 3600

                    # 9시간 이상 근무 시 휴게시간 1시간 제외
                    if first_day_hours >= 9:
                        first_day_hours -= 1

                    total_overtime_pay += first_day_hours * hourly_rate * 1.5
                else:
                    # 평일인 경우 소정근로시간(9:00~18:00) 외 시간만 연장근로
                    first_day_end = datetime.combine(
                        check_in_dt.date(), time(23, 59, 59)
                    )
                    workday_start = datetime.combine(
                        check_in_dt.date(), time(REGULAR_WORKDAY_START, 0, 0)
                    )
                    workday_end = datetime.combine(
                        check_in_dt.date(), time(REGULAR_WORKDAY_END, 0, 0)
                    )

                    # 09:00 이전 근무 시간 (연장근로)
                    if check_in_dt < workday_start:
                        early_hours = (
                            workday_start - check_in_dt
                        ).total_seconds() / 3600
                        total_overtime_pay += early_hours * hourly_rate * 1.5

                    # 18:00 이후 근무 시간 (연장근로)
                    late_hours = (first_day_end - workday_end).total_seconds() / 3600
                    total_overtime_pay += late_hours * hourly_rate * 1.5

                # ===== 둘째 날부터 처리 =====
                current_date = check_in_dt.date() + timedelta(days=1)

                while current_date <= check_out_dt.date():
                    # 현재 날짜가 휴일인지 확인
                    current_day_is_holiday = self._is_holiday(
                        current_date.strftime("%Y-%m-%d")
                    )

                    # 해당 날짜의 시작과 종료 시간 설정
                    if current_date == check_out_dt.date():
                        # 마지막 날
                        day_end = check_out_dt
                    else:
                        # 중간 날짜
                        day_end = datetime.combine(current_date, time(23, 59, 59))

                    day_start = datetime.combine(current_date, time(0, 0, 0))

                    # 현재 날짜가 평일이고, 첫날이 평일인 경우 (연속 근무)
                    if not current_day_is_holiday and not first_day_is_holiday:
                        # 소정근로시간(09:00~18:00) 설정
                        workday_start = datetime.combine(
                            current_date, time(REGULAR_WORKDAY_START, 0, 0)
                        )
                        workday_end = datetime.combine(
                            current_date, time(REGULAR_WORKDAY_END, 0, 0)
                        )

                        # 00:00부터 09:00까지 연장근로
                        if day_start < workday_start:
                            early_hours = min(
                                (workday_start - day_start).total_seconds() / 3600,
                                (
                                    min(workday_start, day_end) - day_start
                                ).total_seconds()
                                / 3600,
                            )
                            total_overtime_pay += early_hours * hourly_rate * 1.5

                        # 18:00부터 퇴근시간까지 연장근로
                        if day_end > workday_end:
                            late_hours = (
                                day_end - max(workday_end, day_start)
                            ).total_seconds() / 3600
                            total_overtime_pay += late_hours * hourly_rate * 1.5
                    else:
                        # 현재 날짜가 휴일이거나, 첫날이 휴일인 경우
                        # 모든 시간을 연장근로로 계산
                        day_hours = (day_end - day_start).total_seconds() / 3600

                        # 9시간 이상 근무 시 휴게시간 1시간 제외
                        if day_hours >= 9:
                            day_hours -= 1

                        total_overtime_pay += day_hours * hourly_rate * 1.5

                    # 다음 날로 이동
                    current_date += timedelta(days=1)
            else:
                # ===== 같은 날 출퇴근인 경우 =====
                if first_day_is_holiday:
                    # 휴일인 경우 모든 시간이 연장근로
                    total_hours = (check_out_dt - check_in_dt).total_seconds() / 3600

                    # 9시간 이상 근무 시 휴게시간 1시간 제외
                    if total_hours >= 9:
                        total_hours -= 1

                    total_overtime_pay += total_hours * hourly_rate * 1.5
                else:
                    # 평일인 경우 소정근로시간(9:00~18:00) 외 시간만 연장근로
                    workday_start = datetime.combine(
                        check_in_dt.date(), time(REGULAR_WORKDAY_START, 0, 0)
                    )
                    workday_end = datetime.combine(
                        check_in_dt.date(), time(REGULAR_WORKDAY_END, 0, 0)
                    )

                    # 09:00 이전 근무 시간 (연장근로)
                    if check_in_dt < workday_start:
                        early_hours = (
                            workday_start - check_in_dt
                        ).total_seconds() / 3600
                        total_overtime_pay += early_hours * hourly_rate * 1.5

                    # 18:00 이후 근무 시간 (연장근로)
                    if check_out_dt > workday_end:
                        late_hours = (check_out_dt - workday_end).total_seconds() / 3600
                        total_overtime_pay += late_hours * hourly_rate * 1.5

        return int(total_overtime_pay)

    def _calculate_work_hours(self, check_in, check_out, attendance_type):
        """
        근무 시간 계산 함수 (변경 없음)

        출퇴근 시간으로부터 실제 근무 시간 계산 (휴게시간 1시간 제외)
        """
        if not check_in or not check_out:
            return 0
        check_in_dt = datetime.strptime(check_in, "%Y-%m-%d %H:%M:%S")
        check_out_dt = datetime.strptime(check_out, "%Y-%m-%d %H:%M:%S")
        total_hours = (check_out_dt - check_in_dt).total_seconds() / 3600

        # 9시간 이상 근무 시 휴게시간 1시간 제외
        if total_hours >= 9:
            total_hours -= 1
        return total_hours

    def calculate_night_pay(self, attendance_data, hourly_rate):
        """
        야간근로수당 계산 함수 (개선됨)

        - 철야 근무의 경우 모든 날짜의 야간 시간(22시-06시)을 정확히 계산
        - 야간근로는 근무일 여부와 상관없이 22:00~06:00 시간대 근무 시 적용
        """
        total_night_pay = 0
        for record in attendance_data:
            # 출퇴근 시간이 없으면 건너뛰기
            if not record["check_in"] or not record["check_out"]:
                continue

            check_in_dt = datetime.strptime(record["check_in"], "%Y-%m-%d %H:%M:%S")
            check_out_dt = datetime.strptime(record["check_out"], "%Y-%m-%d %H:%M:%S")

            # 모든 날짜에 대한 야간 근무 계산
            current_date = check_in_dt.date()

            while current_date <= check_out_dt.date():
                # 현재 날짜의 야간 시간대 설정
                night_start = datetime.combine(current_date, time(22, 0))
                night_end = datetime.combine(current_date, time(6, 0)) + timedelta(
                    days=1
                )

                # 실제 근무 시간과 야간 시간대의 교집합 계산
                if check_out_dt <= night_start or check_in_dt >= night_end:
                    # 야간 시간대와 겹치지 않음
                    pass
                else:
                    # 야간 시간대와 겹치는 시간 계산
                    start = max(check_in_dt, night_start)
                    end = min(check_out_dt, night_end)

                    if end > start:  # 유효한 겹침이 있는지 확인
                        night_hours = (end - start).total_seconds() / 3600
                        total_night_pay += night_hours * hourly_rate * 0.5

                # 다음 날로 이동
                current_date += timedelta(days=1)

        return int(total_night_pay)

    def _calculate_night_hours(self, check_in, check_out):
        """
        야간 근무 시간 계산 함수 (기존 함수 유지, 하위 호환성을 위해)

        신규 calculate_night_pay 함수에서는 이 함수를 직접 사용하지 않음
        """
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
        """
        공휴일 또는 주말 여부 확인 함수
        """
        date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
        return date_obj in self.kr_holidays or date_obj.weekday() >= 5

    def calculate_holiday_pay(self, attendance_data, hourly_rate):
        """
        휴일근로수당 계산 함수 (개선됨)

        - 휴일에 시작한 근로만 휴일근로수당 적용
        - 휴일 8시간 이내: 시간당 임금의 1.5배
        - 휴일 8시간 초과: 초과분에 대해 시간당 임금의 2.0배
        - 평일에 시작한 근로가 휴일로 이어지는 경우는 휴일근로수당 미적용
        - 휴일에 시작한 근로가 평일로 이어지는 경우, 평일 09:00까지만 휴일근로수당 적용
        """
        total_holiday_pay = 0

        for record in attendance_data:
            if not record["check_in"] or not record["check_out"]:
                continue

            check_in_dt = datetime.strptime(record["check_in"], "%Y-%m-%d %H:%M:%S")
            check_out_dt = datetime.strptime(record["check_out"], "%Y-%m-%d %H:%M:%S")

            # 출근일이 휴일인지 확인
            is_holiday_work = record["attendance_type"] == "휴일" or self._is_holiday(
                check_in_dt.strftime("%Y-%m-%d")
            )

            # 평일에 시작한 근로는 휴일근로수당 적용 안함
            if not is_holiday_work:
                continue

            # 이제부터 휴일에 시작한 근로만 처리
            total_holiday_hours = 0  # 휴일근로 누적 시간 (8시간 기준 계산용)
            current_date = check_in_dt.date()

            while current_date <= check_out_dt.date():
                # 현재 날짜의 시작과 종료 시간 설정
                if current_date == check_in_dt.date():
                    # 첫째 날
                    day_start = check_in_dt
                else:
                    # 그 외 날짜
                    day_start = datetime.combine(current_date, time(0, 0, 0))

                if current_date == check_out_dt.date():
                    # 마지막 날
                    day_end = check_out_dt
                else:
                    # 그 외 날짜
                    day_end = datetime.combine(current_date, time(23, 59, 59))

                # 현재 날짜가 휴일이 아니고 평일인 경우, 09:00까지만 계산
                if current_date != check_in_dt.date() and not self._is_holiday(
                    current_date.strftime("%Y-%m-%d")
                ):
                    workday_start = datetime.combine(
                        current_date, time(REGULAR_WORKDAY_START, 0, 0)
                    )
                    if day_start < workday_start:
                        # 00:00부터 09:00까지만 휴일근로로 계산
                        day_end = min(day_end, workday_start)
                    else:
                        # 이미 평일 09:00 이후라면 휴일근로 계산 종료
                        break

                # 해당 날짜의 근무 시간 계산
                day_hours = (day_end - day_start).total_seconds() / 3600

                # 휴게시간 적용 (9시간 이상 근무 시)
                if day_hours >= 9:
                    day_hours -= 1

                # 휴일근로 누적 및 계산 (8시간 기준)
                if total_holiday_hours < 8:
                    # 8시간 이내 부분
                    if total_holiday_hours + day_hours <= 8:
                        # 모두 1.5배 적용
                        total_holiday_pay += day_hours * hourly_rate * 1.5
                        total_holiday_hours += day_hours
                    else:
                        # 일부는 1.5배, 일부는 2.0배 적용
                        hours_within_8 = 8 - total_holiday_hours
                        hours_over_8 = day_hours - hours_within_8

                        total_holiday_pay += hours_within_8 * hourly_rate * 1.5
                        total_holiday_pay += hours_over_8 * hourly_rate * 2.0
                        total_holiday_hours += day_hours
                else:
                    # 이미 8시간 초과한 경우, 모두 2.0배 적용
                    total_holiday_pay += day_hours * hourly_rate * 2.0
                    total_holiday_hours += day_hours

                # 다음 날로 이동
                current_date += timedelta(days=1)

        return int(total_holiday_pay)

    def calculate_total_pay(self):
        """
        직원의 총 급여를 계산하는 함수

        Returns:
            dict: 급여 계산 결과를 포함하는 딕셔너리
        """
        try:
            if not self.employee or not self.attendance_records:
                raise ValueError("직원 정보와 근태 기록이 필요합니다.")

            # 급여 기간 문자열로 변환
            start_date = self.period_start_date.strftime("%Y-%m-%d")
            end_date = self.period_end_date.strftime("%Y-%m-%d")

            # 시급 계산
            hourly_rate = (self.employee.base_salary / 12) / self.WORK_HOURS_PER_MONTH

            # 기본급 계산
            base_pay = self.calculate_base_pay(
                self.employee.base_salary,
                start_date,
                end_date,
                self.attendance_records,
                (
                    self.employee.join_date.strftime("%Y-%m-%d")
                    if self.employee.join_date
                    else None
                ),
                (
                    self.employee.resignation_date.strftime("%Y-%m-%d")
                    if self.employee.resignation_date
                    else None
                ),
            )

            # 추가 수당 계산
            overtime_pay = self.calculate_overtime_pay(
                self.attendance_records, hourly_rate
            )
            night_pay = self.calculate_night_pay(self.attendance_records, hourly_rate)
            holiday_pay = self.calculate_holiday_pay(
                self.attendance_records, hourly_rate
            )

            # 직급 수당 계산 (직급에 따라 다른 수당 적용)
            position_allowance = 0
            if self.employee.position == "부장":
                position_allowance = 500000
            elif self.employee.position == "과장":
                position_allowance = 300000
            elif self.employee.position == "대리":
                position_allowance = 200000
            elif self.employee.position == "주임":
                position_allowance = 100000

            # 총 지급액 계산
            total_pay = base_pay + overtime_pay + holiday_pay + position_allowance

            return {
                "base_pay": base_pay,
                "overtime_pay": overtime_pay,
                "holiday_pay": holiday_pay,
                "position_allowance": position_allowance,
                "total_pay": total_pay,
            }
        except Exception as e:
            print(f"급여 계산 중 오류 발생: {str(e)}")
            raise e
