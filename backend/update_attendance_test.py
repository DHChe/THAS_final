import sys
import os

# 현재 디렉토리 경로 추가
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from config.database import get_db_session
from models.models import Attendance
from datetime import datetime


def update_attendance(employee_id, date, check_in, check_out, attendance_type):
    """특정 직원의 특정 날짜의 근태 기록을 수정합니다."""
    session = get_db_session()

    # 날짜 문자열을 날짜 객체로 변환
    date_obj = datetime.strptime(date, "%Y-%m-%d").date()

    try:
        # 수정할 근태 기록 조회
        attendance = (
            session.query(Attendance)
            .filter(Attendance.employee_id == employee_id, Attendance.date == date_obj)
            .first()
        )

        if attendance:
            print(
                f"기존 기록: ID: {attendance.id}, 날짜: {attendance.date}, "
                f"출근: {attendance.check_in}, 퇴근: {attendance.check_out}, 유형: {attendance.attendance_type}"
            )

            # 기록 수정
            attendance.check_in = check_in
            attendance.check_out = check_out
            attendance.attendance_type = attendance_type

            # 변경사항 저장
            session.commit()

            print(
                f"수정 완료: ID: {attendance.id}, 날짜: {attendance.date}, "
                f"출근: {attendance.check_in}, 퇴근: {attendance.check_out}, 유형: {attendance.attendance_type}"
            )
            return True
        else:
            print(f"해당 직원({employee_id})의 {date} 기록을 찾을 수 없습니다.")
            return False

    except Exception as e:
        session.rollback()
        print(f"오류 발생: {str(e)}")
        return False
    finally:
        session.close()


if __name__ == "__main__":
    # 테스트용 데이터 설정
    employee_id = "PR030"
    date = "2024-09-03"
    check_in = "2024-09-03 08:30:00"  # 정상 출근 시간으로 변경
    check_out = "2024-09-03 21:30:00"  # 퇴근 시간도 변경
    attendance_type = "정상"  # 지각에서 정상으로 변경

    update_attendance(employee_id, date, check_in, check_out, attendance_type)
