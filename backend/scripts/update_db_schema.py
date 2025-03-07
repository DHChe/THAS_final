#!/usr/bin/env python
import sys
import os

# 상위 디렉토리를 path에 추가하여 모듈을 import할 수 있도록 함
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, Column, BigInteger
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config.database import DATABASE_URL

print("데이터베이스 스키마 업데이트를 시작합니다...")

# 데이터베이스 연결
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

try:
    # ALTER TABLE 쿼리 실행
    session.execute(
        """
    ALTER TABLE payroll
    ADD COLUMN long_term_care BIGINT NOT NULL DEFAULT 0
    """
    )

    session.commit()
    print("'payroll' 테이블에 'long_term_care' 컬럼이 성공적으로 추가되었습니다.")
except Exception as e:
    session.rollback()
    print(f"오류 발생: {str(e)}")
    # 이미 컬럼이 존재할 경우 무시
    if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
        print("'long_term_care' 컬럼이 이미 존재합니다. 변경사항 없음.")
    else:
        raise e
finally:
    session.close()

print("데이터베이스 스키마 업데이트가 완료되었습니다.")
