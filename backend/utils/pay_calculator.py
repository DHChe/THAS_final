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
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
        if start.day == PAYROLL_DAY:
            expected_end = start.replace(day=PAYROLL_DAY - 1) + pd.DateOffset(months=1)
            return end.date() == expected_end.date()
        return False

    def calculate_base_pay(self, base_salary, start_date, end_date, attendance_data, join_date=None, resignation_date=None):
        monthly_salary = base_salary / 12
        start_dt = datetime.strptime(start_date, '%Y-%m-%d')
        end_dt = datetime.strptime(end_date, '%Y-%m-%d')
        period_days = (end_dt - start_dt).days + 1
        
        if join_date or resignation_date:
            join_dt = datetime.strptime(join_date, '%Y-%m-%d') if join_date else start_dt
            resign_dt = datetime.strptime(resignation_date, '%Y-%m-%d') if resignation_date else end_dt
            effective_start = max(start_dt, join_dt)
            effective_end = min(end_dt, resign_dt)
            working_days = (effective_end - effective_start).days + 1
            if working_days < self.DAYS_PER_MONTH:
                base_pay = (monthly_salary / self.DAYS_PER_MONTH) * working_days
                return int(base_pay)
        
        if self.is_full_month(start_date, end_date):
            return int(monthly_salary)
        else:
            hourly_wage = monthly_salary / self.WORK_HOURS_PER_MONTH
            daily_wage = hourly_wage * 8
            return int(daily_wage * period_days)

    def calculate_overtime_pay(self, attendance_data, hourly_rate):
        total_overtime_pay = 0
        for record in attendance_data:
            work_hours = self._calculate_work_hours(record['check_in'], record['check_out'], record['attendance_type'])
            overtime_hours = max(0, work_hours - 8)
            total_overtime_pay += overtime_hours * hourly_rate * 1.5
        return int(total_overtime_pay)

    def calculate_night_pay(self, attendance_data, hourly_rate):
        total_night_pay = 0
        for record in attendance_data:
            night_hours = self._calculate_night_hours(record['check_in'], record['check_out'])
            total_night_pay += night_hours * hourly_rate * 0.5
        return int(total_night_pay)

    def _calculate_work_hours(self, check_in, check_out, attendance_type):
        if not check_in or not check_out:
            return 0
        check_in_dt = datetime.strptime(check_in, '%Y-%m-%d %H:%M:%S')
        check_out_dt = datetime.strptime(check_out, '%Y-%m-%d %H:%M:%S')
        total_hours = (check_out_dt - check_in_dt).total_seconds() / 3600
        
        if total_hours >= 9:
            total_hours -= 1
        return total_hours

    def _calculate_night_hours(self, check_in, check_out):
        if not check_in or not check_out:
            return 0
        check_in_dt = datetime.strptime(check_in, '%Y-%m-%d %H:%M:%S')
        check_out_dt = datetime.strptime(check_out, '%Y-%m-%d %H:%M:%S')
        night_start = datetime.combine(check_in_dt.date(), time(22, 0))
        night_end = datetime.combine(check_in_dt.date(), time(6, 0)) + pd.Timedelta(days=1)
        
        if check_out_dt <= night_start or check_in_dt >= night_end:
            return 0
        start = max(check_in_dt, night_start)
        end = min(check_out_dt, night_end)
        return (end - start).total_seconds() / 3600

    def _is_holiday(self, date_str):
        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
        return (date_obj in self.kr_holidays or date_obj.weekday() >= 5)

    def calculate_holiday_pay(self, attendance_data, hourly_rate):
        total_holiday_pay = 0
        for record in attendance_data:
            if record['attendance_type'] == '휴일' or self._is_holiday(record['date']):
                work_hours = self._calculate_work_hours(record['check_in'], record['check_out'], record['attendance_type'])
                if work_hours <= 8:
                    total_holiday_pay += work_hours * hourly_rate * 1.5
                else:
                    total_holiday_pay += (8 * hourly_rate * 1.5) + ((work_hours - 8) * hourly_rate * 2.0)
        return int(total_holiday_pay)

    def get_total_pay(self, base_salary, start_date, end_date, attendance_data, join_date=None, resignation_date=None):
        hourly_rate = (base_salary / 12) / self.WORK_HOURS_PER_MONTH
        base_pay = self.calculate_base_pay(base_salary, start_date, end_date, attendance_data, join_date, resignation_date)
        overtime_pay = self.calculate_overtime_pay(attendance_data, hourly_rate)
        night_pay = self.calculate_night_pay(attendance_data, hourly_rate)
        holiday_pay = self.calculate_holiday_pay(attendance_data, hourly_rate)
        return base_pay + overtime_pay + night_pay + holiday_pay