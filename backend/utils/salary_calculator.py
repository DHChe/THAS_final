from datetime import datetime
from .insurance_calculator import InsuranceCalculator

class SalaryCalculator:
    def __init__(self, start_date, end_date):
        self.start_date = datetime.strptime(start_date, '%Y-%m-%d')
        self.end_date = datetime.strptime(end_date, '%Y-%m-%d')
        self.REGULAR_WORK_HOURS_PER_DAY = 8  # 1일 소정근로시간
        self.MONTHLY_WORK_HOURS = 209  # 월 소정근로시간
        self.NIGHT_START = '22:00'  # 야간근로 시작
        self.NIGHT_END = '06:00'    # 야간근로 종료

    def calculate_basic_pay(self, annual_salary):
        monthly_base_pay = annual_salary // 12
        daily_base_pay = monthly_base_pay // 30
        selected_days = ((self.end_date - self.start_date).days + 1)
        return daily_base_pay * selected_days

    def calculate_regular_wage(self, annual_salary):
        monthly_base_pay = annual_salary // 12
        return monthly_base_pay // self.MONTHLY_WORK_HOURS

    def calculate_work_hours(self, check_in, check_out):
        start = datetime.strptime(check_in, '%Y-%m-%dT%H:%M:%S')
        end = datetime.strptime(check_out, '%Y-%m-%dT%H:%M:%S')
        total_hours = (end - start).total_seconds() / 3600
        return self.adjust_break_time(total_hours)

    def adjust_break_time(self, work_hours):
        if work_hours >= 8:
            return work_hours - 1
        elif work_hours >= 4:
            return work_hours - 0.5
        return work_hours

    def is_holiday(self, date_str):
        date = datetime.strptime(date_str, '%Y-%m-%d')
        day = date.weekday()  # 0=월요일, 6=일요일
        return day == 5 or day == 6  # 토요일 or 일요일

    def calculate_overtime_pay(self, attendance_data, regular_wage):
        total_overtime_hours = 0
        for record in attendance_data:
            if record['attendance_type'] not in ['정상', '지각']:
                continue
            start = datetime.strptime(record['check_in'], '%Y-%m-%dT%H:%M:%S')
            end = datetime.strptime(record['check_out'], '%Y-%m-%dT%H:%M:%S')
            day_end = start.replace(hour=18, minute=0, second=0)
            if end > day_end:
                overtime = (end - day_end).total_seconds() / 3600
                total_overtime_hours += self.adjust_break_time(overtime)
        return int(total_overtime_hours * regular_wage * 1.5)

    def calculate_night_shift_pay(self, attendance_data, regular_wage):
        total_night_hours = 0
        for record in attendance_data:
            if record['attendance_type'] not in ['정상', '지각']:
                continue
            start = datetime.strptime(record['check_in'], '%Y-%m-%dT%H:%M:%S')
            end = datetime.strptime(record['check_out'], '%Y-%m-%dT%H:%M:%S')
            if start.hour >= 22 or end.hour < 6:
                night_hours = self.calculate_night_hours(start, end)
                total_night_hours += night_hours
        return int(total_night_hours * regular_wage * 0.5)

    def calculate_holiday_pay(self, attendance_data, regular_wage):
        total_holiday_pay = 0
        grouped_by_date = self.group_by_date(attendance_data)
        for date, records in grouped_by_date.items():
            is_holiday_work = self.is_holiday(date) or any(r['attendance_type'] == '휴일근무' for r in records)
            if is_holiday_work:
                daily_hours = sum(
                    self.calculate_work_hours(r['check_in'], r['check_out'])
                    for r in records if r['attendance_type'] in ['정상', '지각', '휴일근무']
                )
                regular_hours = min(daily_hours, 8)
                overtime_hours = max(daily_hours - 8, 0)
                total_holiday_pay += int(regular_hours * regular_wage * 1.5) + int(overtime_hours * regular_wage * 2)
        return total_holiday_pay

    def calculate_night_hours(self, start, end):
        night_start = start.replace(hour=22, minute=0, second=0)
        night_end = start.replace(hour=29, minute=0, second=0)  # 다음날 06:00
        work_start = start if start.hour >= 22 else night_start
        work_end = end if end.hour < 6 else night_end
        return max(0, (work_end - work_start).total_seconds() / 3600)

    def group_by_date(self, attendance_data):
        groups = {}
        for record in attendance_data:
            date = record['check_in'].split('T')[0]
            if date not in groups:
                groups[date] = []
            groups[date].append(record)
        return groups