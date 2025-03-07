"""
데이터베이스 스키마 업데이트 스크립트
payroll 테이블에 payroll_type 컬럼 추가
"""

import os
import sqlite3
from config.database import DB_PATH, init_db


def update_schema():
    """
    payroll 테이블에 payroll_type 컬럼 추가
    """
    print(f"데이터베이스 파일 경로: {DB_PATH}")

    # 데이터베이스 파일이 존재하는지 확인
    if not os.path.exists(DB_PATH):
        print(f"데이터베이스 파일이 존재하지 않습니다: {DB_PATH}")
        print("데이터베이스를 새로 생성합니다...")
        init_db()
        print("데이터베이스가 생성되었습니다.")
        return

    # 데이터베이스 연결
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # 테이블 정보 확인
        cursor.execute("PRAGMA table_info(payroll)")
        columns = cursor.fetchall()

        # payroll_type 컬럼이 이미 존재하는지 확인
        column_names = [column[1] for column in columns]
        if "payroll_type" in column_names:
            print("payroll_type 컬럼이 이미 존재합니다.")
        else:
            # payroll_type 컬럼 추가
            cursor.execute(
                "ALTER TABLE payroll ADD COLUMN payroll_type VARCHAR(20) NOT NULL DEFAULT 'regular'"
            )
            conn.commit()
            print("payroll_type 컬럼이 성공적으로 추가되었습니다.")

    except sqlite3.Error as e:
        print(f"데이터베이스 오류 발생: {e}")
        conn.rollback()

    finally:
        # 연결 종료
        cursor.close()
        conn.close()


if __name__ == "__main__":
    update_schema()
