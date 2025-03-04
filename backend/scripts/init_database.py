"""
데이터베이스 초기화 스크립트 (SQLite 버전)
데이터베이스와 필요한 테이블을 생성합니다.
"""

import sys
import os

# 상위 디렉토리를 모듈 검색 경로에 추가
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from config.database import init_db, DB_PATH
from models.models import Base

def create_database():
    """데이터베이스 파일이 없으면 디렉토리를 생성합니다."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    print(f"데이터베이스 경로 확인: {DB_PATH}")

def main():
    """데이터베이스와 테이블을 초기화합니다."""
    print("데이터베이스 초기화를 시작합니다...")
    
    # 데이터베이스 경로 확인
    create_database()
    
    # 테이블 생성
    print("테이블을 생성합니다...")
    init_db()
    print("테이블이 생성되었습니다.")
    
    print("데이터베이스 초기화가 완료되었습니다.")

if __name__ == "__main__":
    main()