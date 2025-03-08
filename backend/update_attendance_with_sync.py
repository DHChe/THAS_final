import sys
import os

# 현재 디렉토리 경로 추가
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from config.database import get_db_session
from models.models import Attendance
from datetime import datetime

# CSV 파일 동기화 함수 임포트
from sync_attendance_db_to_csv import sync_db_to_csv


def update_attendance_with_sync(
    employee_id, date, check_in, check_out, attendance_type
):
    """특정 직원의 특정 날짜의 근태 기록을 수정하고, CSV 파일에 자동 동기화합니다."""
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

            # 데이터베이스 변경 후 CSV 파일 자동 동기화
            print("\nCSV 파일 자동 동기화 시작...")
            sync_result = sync_db_to_csv()

            if sync_result:
                print("근태 기록 변경과 CSV 파일 동기화가 모두 완료되었습니다.")
                print(
                    "이제 웹 브라우저에서 새로고침하면 변경된 내용이 바로 반영됩니다."
                )
            else:
                print("근태 기록은 변경되었으나 CSV 파일 동기화에 실패했습니다.")
                print(
                    "수동으로 'python sync_attendance_db_to_csv.py' 명령을 실행해주세요."
                )

            return True
        else:
            print(f"해당 직원({employee_id})의 {date} 기록을 찾을 수 없습니다.")
            return False

    except Exception as e:
        print(f"오류 발생: {str(e)}")
        session.rollback()
        return False
    finally:
        session.close()


# 실행 예시
if __name__ == "__main__":
    # PR030 직원의 9월 3일 근태 기록 수정
    update_attendance_with_sync(
        employee_id="PR030",
        date="2024-09-03",
        check_in="2024-09-03 08:30:00",
        check_out="2024-09-03 21:30:00",
        attendance_type="정상",
    )
