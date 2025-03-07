"""
데이터베이스 스키마 업데이트 스크립트
"""

import os
import sqlite3

# 현재 디렉토리 기준 상대 경로
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# SQLite 데이터베이스 파일 경로
DB_PATH = os.path.join(BASE_DIR, "data", "payroll.db")

print(f"데이터베이스 스키마 업데이트를 시작합니다... ({DB_PATH})")

# 데이터베이스 연결
try:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 컬럼 존재 여부 확인
    cursor.execute("PRAGMA table_info(payroll)")
    columns = cursor.fetchall()
    column_names = [column[1] for column in columns]

    # long_term_care 컬럼 추가
    if "long_term_care" not in column_names:
        print("'long_term_care' 컬럼을 추가합니다...")
        cursor.execute(
            "ALTER TABLE payroll ADD COLUMN long_term_care BIGINT NOT NULL DEFAULT 0"
        )
        conn.commit()
        print("'long_term_care' 컬럼이 성공적으로 추가되었습니다.")
    else:
        print("'long_term_care' 컬럼이 이미 존재합니다. 변경사항 없음.")

    conn.close()
    print("데이터베이스 스키마 업데이트가 완료되었습니다.")

except Exception as e:
    print(f"오류 발생: {str(e)}")
    if "conn" in locals() and conn:
        conn.close()
