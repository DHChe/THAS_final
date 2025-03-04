"""
근태 테스트 데이터 추가 스크립트

이 스크립트는 급여 계산을 위한 임시 근태 데이터를 생성합니다.
"""

import sys
import os
import random
import datetime
from datetime import timedelta, time
from sqlalchemy import and_, func

# 상위 디렉토리 경로 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

from config.database import get_db_session
from models.models import Employee, Attendance


def generate_random_time(base_time, deviation_minutes=15):
    """지정된 기준 시간에서 랜덤하게 변동된 시간을 생성합니다."""
    deviation = random.randint(-deviation_minutes, deviation_minutes)
    return (
        datetime.datetime.combine(datetime.date.today(), base_time)
        + timedelta(minutes=deviation)
    ).time()


def add_regular_attendance(session, employee, start_date, end_date):
    """직원의 기본 근태 데이터를 생성합니다."""
    print(
        f"{employee.name}({employee.employee_id})의 {start_date}부터 {end_date}까지 일반 근태 생성 중..."
    )

    # 기본 출퇴근 시간 (9시 출근, 18시 퇴근)
    base_checkin = time(9, 0)
    base_checkout = time(18, 0)

    current_date = start_date
    while current_date <= end_date:
        # 주말(토,일)은 제외
        if current_date.weekday() >= 5:
            current_date += timedelta(days=1)
            continue

        # 이미 기록이 있는지 확인
        existing = (
            session.query(Attendance)
            .filter(
                and_(
                    Attendance.employee_id == employee.employee_id,
                    Attendance.date == current_date,
                )
            )
            .first()
        )

        if not existing:
            # 랜덤 출퇴근 시간 생성 (기준 시간에서 최대 30분 변동)
            checkin_time = generate_random_time(base_checkin, 60)
            # 최소 8시간 근무
            min_work_hours = 8
            checkout_time = generate_random_time(base_checkout, 30)

            # 출근 시간이 9시 30분을 넘으면 지각 처리
            attendance_type = "정상"
            if checkin_time > time(9, 30):
                attendance_type = "지각"

            # 기록 생성
            checkin_datetime = datetime.datetime.combine(current_date, checkin_time)
            checkout_datetime = datetime.datetime.combine(current_date, checkout_time)

            attendance = Attendance(
                employee_id=employee.employee_id,
                date=current_date,
                check_in=checkin_datetime,
                check_out=checkout_datetime,
                attendance_type=attendance_type,
            )
            session.add(attendance)

        current_date += timedelta(days=1)

    print(f"{employee.name}의 일반 근태 생성 완료")


def add_overtime_attendance(session, employee, start_date, end_date):
    """직원의 야근 데이터를 생성합니다."""
    print(
        f"{employee.name}({employee.employee_id})의 {start_date}부터 {end_date}까지 야근 데이터 생성 중..."
    )

    # 한 달 중 랜덤하게 몇 번 야근하는지 결정 (1~5일)
    overtime_days = random.randint(1, 5)

    # 전체 가능한 평일 계산
    weekdays = []
    current_date = start_date
    while current_date <= end_date:
        if current_date.weekday() < 5:  # 평일만 (0-4는 월-금)
            weekdays.append(current_date)
        current_date += timedelta(days=1)

    # 랜덤하게 야근할 날 선택
    if weekdays:
        overtime_dates = random.sample(weekdays, min(overtime_days, len(weekdays)))

        for ot_date in overtime_dates:
            # 해당 날짜의 근태 기록 조회
            attendance = (
                session.query(Attendance)
                .filter(
                    and_(
                        Attendance.employee_id == employee.employee_id,
                        Attendance.date == ot_date,
                    )
                )
                .first()
            )

            if attendance:
                # 기존 퇴근 시간에서 1~3시간 추가 (야근)
                checkout_datetime = attendance.check_out
                if checkout_datetime:
                    additional_hours = random.randint(1, 3)
                    new_checkout = checkout_datetime + timedelta(hours=additional_hours)
                    attendance.check_out = new_checkout
                    # 오류가 발생하는 부분을 수정: 문자열과 timedelta 연결하지 않고 직접 값 사용
                    print(
                        f"  - {ot_date} 야근: {additional_hours}시간 추가 (퇴근시간: {new_checkout.strftime('%H:%M:%S')})"
                    )

    print(f"{employee.name}의 야근 데이터 생성 완료")


def add_holiday_work(session, employee, start_date, end_date):
    """직원의 휴일 근무 데이터를 생성합니다."""
    print(
        f"{employee.name}({employee.employee_id})의 {start_date}부터 {end_date}까지 휴일 근무 데이터 생성 중..."
    )

    # 한 달에 몇 번 휴일근무 하는지 결정 (0~2일)
    holiday_work_count = random.randint(0, 2)

    # 전체 주말 계산
    weekends = []
    current_date = start_date
    while current_date <= end_date:
        if current_date.weekday() >= 5:  # 주말만 (5,6은 토,일)
            weekends.append(current_date)
        current_date += timedelta(days=1)

    # 랜덤하게 휴일근무할 날 선택
    if weekends and holiday_work_count > 0:
        holiday_dates = random.sample(weekends, min(holiday_work_count, len(weekends)))

        for h_date in holiday_dates:
            # 이미 기록이 있는지 확인
            existing = (
                session.query(Attendance)
                .filter(
                    and_(
                        Attendance.employee_id == employee.employee_id,
                        Attendance.date == h_date,
                    )
                )
                .first()
            )

            if not existing:
                # 근무 시간 (기본 4~8시간)
                work_hours = random.randint(4, 8)

                # 출근 시간은 9~10시 사이
                hour = random.randint(9, 10)
                minute = random.randint(0, 59)
                checkin_time = time(hour, minute)

                checkin_datetime = datetime.datetime.combine(h_date, checkin_time)
                checkout_datetime = checkin_datetime + timedelta(hours=work_hours)

                attendance = Attendance(
                    employee_id=employee.employee_id,
                    date=h_date,
                    check_in=checkin_datetime,
                    check_out=checkout_datetime,
                    attendance_type="휴일근무",
                )
                session.add(attendance)

    print(f"{employee.name}의 휴일근무 데이터 생성 완료")


def main():
    # 데이터베이스 세션 생성
    session = get_db_session()

    try:
        # 현재 연도와 월 가져오기
        today = datetime.date.today()
        current_year = today.year
        current_month = today.month

        # 현재 달의 첫날과 마지막날 계산
        start_date = datetime.date(current_year, current_month, 1)

        # 다음 달의 첫날 계산 후 하루 빼서 현재 달의 마지막 날 구함
        if current_month == 12:
            next_month = datetime.date(current_year + 1, 1, 1)
        else:
            next_month = datetime.date(current_year, current_month + 1, 1)
        end_date = next_month - timedelta(days=1)

        print(f"{start_date}부터 {end_date}까지 테스트 근태 데이터를 생성합니다.")

        # 활성 상태인 직원들 가져오기
        employees = session.query(Employee).all()

        # 각 직원에 대해 근태 데이터 생성
        for employee in employees:
            try:
                # 일반 근태 생성
                add_regular_attendance(session, employee, start_date, end_date)

                # 야근 데이터 생성
                add_overtime_attendance(session, employee, start_date, end_date)

                # 휴일 근무 데이터 생성
                add_holiday_work(session, employee, start_date, end_date)

                # 각 직원별 데이터 생성 후 커밋
                session.commit()
            except Exception as e:
                print(
                    f"{employee.name}({employee.employee_id})의 근태 데이터 생성 중 오류 발생: {e}"
                )
                session.rollback()
                continue

        print("테스트 근태 데이터 생성이 완료되었습니다.")

    except Exception as e:
        print(f"오류 발생: {e}")
        session.rollback()
    finally:
        session.close()


if __name__ == "__main__":
    main()
