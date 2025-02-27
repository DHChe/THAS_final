from datetime import datetime

class OvertimeCalculator:
    def __init__(self, start_date, end_date):
        self.start_date = datetime.strptime(start_date, '%Y-%m-%d')
        self.end_date = datetime.strptime(end_date, '%Y-%m-%d')
        self.REGULAR_WORK_HOURS_PER_DAY = 8
        self.MONTHLY_WORK_HOURS = 209
        self.NIGHT_START = 22
        self.NIGHT_END = 6
        self.REGULAR_END_TIME = 18
        self.REGULAR_START_TIME = 9

    def calculate_regular_wage(self, monthly_pay):
        return monthly_pay // self.MONTHLY_WORK_HOURS

    def calculate_work_hours(self, check_in, check_out):
        start = datetime.strptime(check_in, '%Y-%m-%dT%H:%M:%S')
        end = datetime.strptime(check_out, '%Y-%m-%dT%H:%M:%S')
        duration = (end - start).total_seconds() / 3600
        if duration >= 8:
            return duration - 1
        elif duration >= 4:
            return duration - 0.5
        return duration

    def calculate_overtime_pay(self, attendance_records, regular_wage):
        total_overtime_hours = 0
        total_night_hours = 0
        for record in attendance_records:
            start = datetime.strptime(record['check_in'], '%Y-%m-%dT%H:%M:%S')
            end = datetime.strptime(record['check_out'], '%Y-%m-%dT%H:%M:%S')
            overtime_start = start.replace(hour=self.REGULAR_END_TIME, minute=0, second=0)
            if end > overtime_start:
                overtime_hours = (end - overtime_start).total_seconds() / 3600
                break_time = (overtime_hours // 4.5) * 0.5
                total_overtime_hours += overtime_hours - break_time
                night_start = start.replace(hour=self.NIGHT_START, minute=0, second=0)
                if end > night_start:
                    if end.day > start.day:
                        night_hours = end.hour + 2  # 간단히 처리
                    else:
                        night_hours = end.hour - self.NIGHT_START
                    total_night_hours += night_hours
        overtime_pay = int(total_overtime_hours * regular_wage * 1.5)
        night_pay = int(total_night_hours * regular_wage * 0.5)
        return {'overtimePay': overtime_pay, 'nightPay': night_pay}