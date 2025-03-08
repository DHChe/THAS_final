import sys
import os
import pandas as pd
from datetime import datetime
import csv
import codecs

# 현재 디렉토리 경로 추가
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

# 데이터베이스 및 모델 임포트
from config.database import get_db_session
from models.models import Attendance


def try_encodings(csv_path, data):
    """여러 인코딩을 시도하여 한글이 올바르게 표시되는지 확인합니다."""
    encodings = ["euc-kr", "cp949", "utf-8-sig"]

    for encoding in encodings:
        try:
            print(f"{encoding} 인코딩으로 시도 중...")

            # CSV 파일로 저장
            with open(csv_path, "w", newline="", encoding=encoding) as f:
                writer = csv.DictWriter(
                    f,
                    fieldnames=[
                        "employee_id",
                        "date",
                        "check_in",
                        "check_out",
                        "attendance_type",
                        "remarks",
                    ],
                )
                writer.writeheader()
                writer.writerows(data)

            # 파일 내용 확인
            with open(csv_path, "r", encoding=encoding) as f:
                first_lines = [next(f) for _ in range(5)]

            print(f"[{encoding}] 파일 처음 5줄:")
            for line in first_lines:
                print(line.strip())

            # 정상 단어가 포함되어 있는지 확인
            if "정상" in "".join(first_lines):
                print(f"{encoding} 인코딩이 적합합니다!")
                return encoding
            else:
                print(f"{encoding} 인코딩은 한글이 정상적으로 표시되지 않습니다.")

        except Exception as e:
            print(f"{encoding} 인코딩 시도 중 오류 발생: {str(e)}")

    return None


def sync_db_to_csv():
    """데이터베이스의 근태 기록을 CSV 파일로 내보냅니다."""
    session = get_db_session()
    try:
        # 데이터베이스에서 모든 근태 기록 조회
        print("데이터베이스에서 근태 기록을 조회합니다...")
        attendance_records = session.query(Attendance).all()

        if not attendance_records:
            print("근태 기록이 없습니다.")
            return False

        # 데이터 준비
        data = []
        for record in attendance_records:
            data.append(
                {
                    "employee_id": record.employee_id,
                    "date": record.date,
                    "check_in": record.check_in,
                    "check_out": record.check_out,
                    "attendance_type": record.attendance_type,
                    "remarks": record.remarks if record.remarks else "",
                }
            )

        print(f"총 {len(data)}개의 근태 기록을 처리합니다.")

        # CSV 파일 경로 설정
        csv_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "data", "attendance.csv"
        )

        # 백업 파일 생성
        backup_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "data",
            f"attendance_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
        )

        # 기존 파일 백업
        if os.path.exists(csv_path):
            print(f"기존 CSV 파일을 백업합니다: {backup_path}")
            import shutil

            shutil.copy2(csv_path, backup_path)

        # 여러 인코딩 시도
        success_encoding = try_encodings(csv_path, data)

        if success_encoding:
            print(
                f"최종적으로 {success_encoding} 인코딩을 사용하여 파일을 저장했습니다."
            )
        else:
            print("모든 인코딩 시도 후에도 한글이 제대로 표시되지 않습니다.")
            # 마지막으로 euc-kr 시도
            with open(csv_path, "w", newline="", encoding="euc-kr") as f:
                writer = csv.DictWriter(
                    f,
                    fieldnames=[
                        "employee_id",
                        "date",
                        "check_in",
                        "check_out",
                        "attendance_type",
                        "remarks",
                    ],
                )
                writer.writeheader()
                writer.writerows(data)

        # 파일 수정 시간 업데이트
        os.utime(csv_path, None)

        print("CSV 파일 내보내기가 완료되었습니다.")
        print(f"이제 웹 애플리케이션에서 근태 변경사항이 반영될 것입니다.")

        return True

    except Exception as e:
        print(f"오류 발생: {str(e)}")
        import traceback

        traceback.print_exc()
        return False

    finally:
        session.close()


if __name__ == "__main__":
    sync_db_to_csv()
