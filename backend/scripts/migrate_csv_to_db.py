"""
CSV 데이터 마이그레이션 스크립트
기존 CSV 파일에서 데이터베이스로 데이터 이관
"""

import sys
import os
import pandas as pd
import numpy as np
from datetime import datetime

# 상위 디렉토리를 모듈 검색 경로에 추가
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
# 백엔드 디렉토리 추가
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from config.database import get_db_session
from models.models import Employee, Attendance


def migrate_employees():
    """직원 데이터 CSV에서 데이터베이스로 마이그레이션"""
    print("직원 데이터 마이그레이션을 시작합니다...")

    csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "employees.csv")
    if not os.path.exists(csv_path):
        print(f"오류: 파일이 존재하지 않습니다: {csv_path}")
        return

    # CSV 데이터 로드
    df = pd.read_csv(csv_path)
    print(f"총 {len(df)} 명의 직원 데이터를 읽어왔습니다.")

    # 데이터베이스 세션 가져오기
    session = get_db_session()

    try:
        # 기존 데이터 확인
        existing_employee_ids = [
            emp[0] for emp in session.query(Employee.employee_id).all()
        ]

        count = 0
        for _, row in df.iterrows():
            employee_id = str(row["employee_id"])

            # 이미 존재하는 직원은 건너뛰기
            if employee_id in existing_employee_ids:
                print(f"이미 존재하는 직원 건너뛰기: {employee_id}")
                continue

            # 날짜 형식 처리
            join_date = None
            birth = None
            resignation_date = None

            try:
                if pd.notna(row["join_date"]):
                    join_date = datetime.strptime(row["join_date"], "%Y-%m-%d").date()
                if pd.notna(row["birth"]):
                    birth = datetime.strptime(row["birth"], "%Y-%m-%d").date()
                if pd.notna(row.get("resignation_date")):
                    resignation_date = datetime.strptime(
                        row["resignation_date"], "%Y-%m-%d"
                    ).date()
            except (ValueError, TypeError) as e:
                print(f"날짜 파싱 오류 (employee_id={employee_id}): {e}")

            # 직원 객체 생성
            employee = Employee(
                employee_id=employee_id,
                name=str(row["name"]),
                department=str(row["department"]),
                position=str(row["position"]),
                join_date=join_date,
                birth=birth,
                sex=str(row["sex"]) if pd.notna(row.get("sex")) else None,
                base_salary=(
                    int(row["base_salary"]) if pd.notna(row["base_salary"]) else 0
                ),
                status=str(row["status"]) if pd.notna(row["status"]) else "재직중",
                resignation_date=resignation_date,
                family_count=(
                    int(row["family_count"]) if pd.notna(row["family_count"]) else 0
                ),
                num_children=(
                    int(row["num_children"]) if pd.notna(row["num_children"]) else 0
                ),
                children_ages=(
                    str(row["children_ages"])
                    if pd.notna(row.get("children_ages"))
                    else None
                ),
            )

            session.add(employee)
            count += 1

            # 100건마다 커밋
            if count % 100 == 0:
                session.commit()
                print(f"{count}명의 직원 데이터 처리 완료")

        # 나머지 데이터 커밋
        session.commit()
        print(f"총 {count}명의 직원 데이터 마이그레이션 완료")

    except Exception as e:
        session.rollback()
        print(f"직원 데이터 마이그레이션 오류: {e}")
    finally:
        session.close()


def migrate_attendance():
    """근태 데이터 CSV에서 데이터베이스로 마이그레이션"""
    print("근태 데이터 마이그레이션을 시작합니다...")

    csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "attendance.csv")
    if not os.path.exists(csv_path):
        print(f"오류: 파일이 존재하지 않습니다: {csv_path}")
        return

    # 다양한 인코딩 시도
    encodings = ["utf-8", "cp949", "euc-kr", "latin1", "utf-16", "utf-16le", "utf-16be"]
    df = None

    for encoding in encodings:
        try:
            print(f"{encoding} 인코딩으로 파일 읽기 시도...")
            df = pd.read_csv(csv_path, encoding=encoding)
            print(f"{encoding} 인코딩으로 성공적으로 파일을 읽었습니다!")
            # 열 이름이 정상적인지 확인
            if "employee_id" in df.columns:
                print("CSV 파일이 올바른 형식입니다.")
                break
            else:
                print(
                    f"CSV 파일 형식이 맞지 않습니다. 다른 인코딩을 시도합니다. 현재 열: {df.columns}"
                )
                df = None
        except Exception as e:
            print(f"{encoding} 인코딩으로 파일을 읽을 수 없습니다: {str(e)}")

    if df is None:
        print("어떤 인코딩으로도 올바른 형식의 파일을 읽을 수 없습니다.")
        return

    print(f"총 {len(df)}개의 근태 기록을 읽어왔습니다.")

    # CSV 파일의 열 구조 확인
    print("CSV 파일 열 목록:")
    for col in df.columns:
        print(f"  - {col}")

    # 첫 몇 개의 행 출력
    print("\n첫 5개 행 데이터:")
    print(df.head())

    # 데이터베이스 세션 가져오기
    session = get_db_session()

    try:
        # 직원 ID 목록 가져오기
        valid_employee_ids = [
            emp[0] for emp in session.query(Employee.employee_id).all()
        ]

        # 기존 근태 데이터를 모두 삭제 (중복 데이터 방지)
        print("기존 근태 데이터를 삭제하고 새로운 데이터로 업데이트합니다...")
        session.query(Attendance).delete()
        session.commit()

        count = 0
        for _, row in df.iterrows():
            employee_id = str(row["employee_id"])

            # 존재하지 않는 직원 건너뛰기
            if employee_id not in valid_employee_ids:
                print(f"존재하지 않는 직원 ID: {employee_id}, 해당 근태 기록 건너뛰기")
                continue

            # 날짜 형식 처리
            date = None
            try:
                if pd.notna(row["date"]):
                    date = datetime.strptime(row["date"], "%Y-%m-%d").date()
            except (ValueError, TypeError) as e:
                print(f"날짜 파싱 오류: {e}")
                continue

            # 출퇴근 시간 처리
            check_in = str(row["check_in"]) if pd.notna(row.get("check_in")) else None
            check_out = (
                str(row["check_out"]) if pd.notna(row.get("check_out")) else None
            )

            # 근태 객체 생성
            attendance = Attendance(
                employee_id=employee_id,
                date=date,
                check_in=check_in,
                check_out=check_out,
                attendance_type=(
                    str(row["attendance_type"])
                    if pd.notna(row.get("attendance_type"))
                    else "정상"
                ),
                remarks=str(row["remarks"]) if pd.notna(row.get("remarks")) else None,
            )

            session.add(attendance)
            count += 1

            # 1000건마다 커밋
            if count % 1000 == 0:
                session.commit()
                print(f"{count}개의 근태 기록 처리 완료")

        # 나머지 데이터 커밋
        session.commit()
        print(f"총 {count}개의 근태 기록 마이그레이션 완료")

    except Exception as e:
        session.rollback()
        print(f"근태 데이터 마이그레이션 오류: {e}")
    finally:
        session.close()


def main():
    """CSV 데이터 마이그레이션 실행"""
    print("CSV 데이터 마이그레이션을 시작합니다...")

    # 직원 데이터 마이그레이션
    migrate_employees()

    # 근태 데이터 마이그레이션
    migrate_attendance()

    print("CSV 데이터 마이그레이션이 완료되었습니다.")


if __name__ == "__main__":
    main()
