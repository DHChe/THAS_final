from datetime import datetime, time, timedelta
import pandas as pd
import holidays
import logging
import math


class OvertimeCalculator:
    def __init__(self):
        self.REGULAR_WORK_HOURS_PER_DAY = 8  # 1일 소정근로시간
        self.MONTHLY_WORK_HOURS = 209  # 월 소정근로시간
        self.NIGHT_START = time(22, 0)  # 야간근로 시작
        self.NIGHT_END = time(6, 0)  # 야간근로 종료
        self.kr_holidays = holidays.KR()

        # 로깅 설정
        logging.basicConfig(
            filename=f'logs/salary_calculation_{datetime.now().strftime("%Y%m")}.log',
            level=logging.INFO,
            format="%(asctime)s - %(message)s",
        )

    def calculate_regular_wage(self, base_salary: float) -> float:
        """기본급을 기준으로 통상임금 계산 (소수점 절삭)"""
        return math.floor(base_salary / self.MONTHLY_WORK_HOURS)

    def _calculate_work_hours(self, check_in: str, check_out: str) -> float:
        """근무시간 계산 (휴게시간 자동 차감)"""
        start = datetime.strptime(check_in, "%Y-%m-%d %H:%M:%S")
        end = datetime.strptime(check_out, "%Y-%m-%d %H:%M:%S")

        # 총 근무시간 계산
        duration = end - start
        total_hours = duration.total_seconds() / 3600

        # 휴게시간 계산
        if total_hours >= 8:  # 8시간 이상 근무시
            total_hours -= 1  # 1시간 휴게
        elif total_hours >= 4:  # 4시간 이상 근무시
            total_hours -= 0.5  # 30분 휴게

        return total_hours

    def calculate_overtime_pay(
        self, attendance_data: pd.DataFrame, regular_wage: float
    ) -> float:
        """연장근로수당 계산

        - 평일 18:00 이후부터 익일 정규 출근시간까지 연장근로
        - 익일이 근로의무가 있는 날인 경우, 정규 근무시간(09-18시)은 소정근로
        - 익일이 휴일인 경우, 전일 18시 이후 모두 연장근로
        """
        try:
            total_overtime_hours = 0

            for _, row in attendance_data.iterrows():
                if row["attendance_type"] not in ["정상", "지각"]:
                    continue

                start = datetime.strptime(row["check_in"], "%Y-%m-%d %H:%M:%S")
                end = datetime.strptime(row["check_out"], "%Y-%m-%d %H:%M:%S")

                # 장시간 근로 경고
                work_duration = (end - start).total_seconds() / 3600
                if work_duration > 12:
                    logging.warning(
                        f"장시간 근로 감지: {work_duration:.1f}시간 근무 "
                        f"(시작: {start}, 종료: {end})"
                    )

                # 당일 근무
                if start.date() == end.date():
                    # 18:00 이후 근무시간 계산
                    day_end = datetime.combine(start.date(), time(18, 0))
                    if end > day_end:
                        overtime = (end - day_end).total_seconds() / 3600
                        total_overtime_hours += overtime

                # 익일까지 이어지는 근무
                else:
                    next_day = start.date() + timedelta(days=1)
                    next_day_start = datetime.combine(next_day, time(9, 0))
                    day_end = datetime.combine(start.date(), time(18, 0))

                    # 당일 18:00 이후부터 익일 09:00까지 연장근로
                    overnight_overtime = (
                        datetime.combine(next_day, time(9, 0)) - day_end
                    ).total_seconds() / 3600

                    # 익일이 근로의무가 있는 날인지 확인
                    next_day_is_workday = not self._is_holiday(
                        next_day.strftime("%Y-%m-%d")
                    )

                    if next_day_is_workday:
                        # 익일 18:00 이후 추가 연장근로
                        next_day_end = datetime.combine(next_day, time(18, 0))
                        if end > next_day_end:
                            additional_overtime = (
                                end - next_day_end
                            ).total_seconds() / 3600
                            total_overtime_hours += additional_overtime
                    else:
                        # 익일이 휴일인 경우 모든 시간을 연장근로로 계산
                        additional_overtime = (
                            end - next_day_start
                        ).total_seconds() / 3600
                        total_overtime_hours += additional_overtime

                    total_overtime_hours += overnight_overtime

            # 휴게시간 차감
            total_overtime_hours = self._adjust_break_time(total_overtime_hours)

            overtime_pay = math.floor(total_overtime_hours * regular_wage * 1.5)
            logging.info(
                f"연장근로수당 계산: {total_overtime_hours}시간 × {regular_wage:,.0f}원 × 1.5 = {overtime_pay:,.0f}원"
            )
            return overtime_pay

        except Exception as e:
            logging.error(f"연장근로수당 계산 중 오류 발생: {str(e)}")
            return 0

    def _adjust_break_time(self, work_hours: float) -> float:
        """휴게시간 조정"""
        if work_hours >= 8:
            return work_hours - 1  # 1시간 휴게
        elif work_hours >= 4:
            return work_hours - 0.5  # 30분 휴게
        return work_hours

    def calculate_night_shift_pay(
        self, attendance_data: pd.DataFrame, regular_wage: float
    ) -> float:
        """야간근로수당 계산 (22:00-06:00)
        - 통상임금의 0.5배 적용
        - 19시 이후 출근은 야간교대조로 간주
        """
        try:
            total_night_hours = 0
            for _, row in attendance_data.iterrows():
                if row["attendance_type"] not in ["정상", "지각"]:
                    continue

                start = datetime.strptime(row["check_in"], "%Y-%m-%d %H:%M:%S")
                end = datetime.strptime(row["check_out"], "%Y-%m-%d %H:%M:%S")

                # 야간근로시간 계산 (22:00-06:00 사이만)
                night_hours = self._calculate_night_hours(
                    max(start.time(), self.NIGHT_START), min(end.time(), self.NIGHT_END)
                )
                total_night_hours += night_hours

            night_shift_pay = math.floor(total_night_hours * regular_wage * 0.5)
            logging.info(
                f"야간근로수당 계산: {total_night_hours}시간 × {regular_wage:,.0f}원 × 0.5 = {night_shift_pay:,.0f}원"
            )
            return night_shift_pay

        except Exception as e:
            logging.error(f"야간근로수당 계산 중 오류 발생: {str(e)}")
            return 0

    def calculate_holiday_pay(
        self, attendance_data: pd.DataFrame, regular_wage: float
    ) -> float:
        """휴일근로수당 계산
        - 8시간 이내: 통상임금의 1.5배
        - 8시간 초과: 통상임금의 2배
        """
        try:
            total_holiday_pay = 0
            for date, day_data in attendance_data.groupby("date"):
                # 휴일근무 데이터만 필터링
                holiday_data = day_data[
                    (day_data["attendance_type"] == "휴일근무")
                    | (
                        (day_data["attendance_type"].isin(["정상", "지각"]))
                        & (self._is_holiday(date))
                    )
                ]

                if not holiday_data.empty:
                    daily_hours = sum(
                        self._calculate_work_hours(row["check_in"], row["check_out"])
                        for _, row in holiday_data.iterrows()
                    )

                    # 8시간 이내 계산
                    regular_holiday_hours = min(
                        daily_hours, self.REGULAR_WORK_HOURS_PER_DAY
                    )
                    regular_holiday_pay = math.floor(
                        regular_holiday_hours * regular_wage * 1.5
                    )

                    # 8시간 초과분 계산 (2배)
                    if daily_hours > self.REGULAR_WORK_HOURS_PER_DAY:
                        overtime_holiday_hours = (
                            daily_hours - self.REGULAR_WORK_HOURS_PER_DAY
                        )
                        overtime_holiday_pay = math.floor(
                            overtime_holiday_hours * regular_wage * 2
                        )
                    else:
                        overtime_holiday_pay = 0

                    total_holiday_pay += regular_holiday_pay + overtime_holiday_pay

            logging.info(f"휴일근로수당 계산 완료: {total_holiday_pay:,.0f}원")
            return total_holiday_pay

        except Exception as e:
            logging.error(f"휴일근로수당 계산 중 오류 발생: {str(e)}")
            return 0

    def _calculate_night_hours(self, start_time: time, end_time: time) -> float:
        """야간근로시간 계산 헬퍼 함수"""
        # 날짜가 바뀌는 경우를 고려한 야간근로시간 계산 로직
        if start_time > end_time:  # 날짜가 바뀌는 경우
            if start_time >= self.NIGHT_START:
                night_hours = (
                    datetime.combine(datetime.today(), time(23, 59, 59))
                    - datetime.combine(datetime.today(), start_time)
                ).seconds / 3600 + (
                    datetime.combine(datetime.today(), end_time)
                    - datetime.combine(datetime.today(), time(0, 0))
                ).seconds / 3600
            else:
                night_hours = (
                    datetime.combine(datetime.today(), end_time)
                    - datetime.combine(datetime.today(), time(0, 0))
                ).seconds / 3600
        else:  # 같은 날인 경우
            if start_time >= self.NIGHT_START:
                night_hours = (
                    datetime.combine(datetime.today(), end_time)
                    - datetime.combine(datetime.today(), start_time)
                ).seconds / 3600
            else:
                night_hours = 0

        return night_hours

    def _is_holiday(self, date_str: str) -> bool:
        """공휴일 여부 확인"""
        date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
        return (
            date_obj in self.kr_holidays or date_obj.weekday() >= 5
        )  # 토,일 또는 공휴일

    def calculate_total_overtime_pay(
        self, attendance_data: pd.DataFrame, base_salary: float
    ) -> dict:
        """전체 추가근로수당 계산"""
        try:
            regular_wage = self.calculate_regular_wage(base_salary)

            overtime_pay = self.calculate_overtime_pay(attendance_data, regular_wage)
            night_shift_pay = self.calculate_night_shift_pay(
                attendance_data, regular_wage
            )
            holiday_pay = self.calculate_holiday_pay(attendance_data, regular_wage)

            total_pay = overtime_pay + night_shift_pay + holiday_pay

            return {
                "overtime_pay": overtime_pay,
                "night_shift_pay": night_shift_pay,
                "holiday_pay": holiday_pay,
                "total_overtime_pay": total_pay,
            }

        except Exception as e:
            logging.error(f"전체 추가근로수당 계산 중 오류 발생: {str(e)}")
            return {
                "overtime_pay": 0,
                "night_shift_pay": 0,
                "holiday_pay": 0,
                "total_overtime_pay": 0,
            }
