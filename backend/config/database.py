"""
데이터베이스 연결 설정 파일 (SQLite 버전)
급여 지급 및 분석을 위한 데이터베이스 연결 설정
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, scoped_session

# 현재 디렉토리 기준 상대 경로
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# SQLite 데이터베이스 파일 경로
DB_PATH = os.path.join(BASE_DIR, 'data', 'payroll.db')

# SQLite 데이터베이스 URL
DB_URL = f"sqlite:///{DB_PATH}"

# 데이터베이스 저장 디렉토리 확인 및 생성
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

# 엔진 생성
engine = create_engine(
    DB_URL,
    echo=True,  # SQL 쿼리 로깅 활성화 (개발 환경에서만 사용)
    connect_args={"check_same_thread": False}  # SQLite에서 다중 스레드 지원
)

# 세션 팩토리 생성
session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 스레드 로컬 세션 생성 (멀티스레드 환경에서 안전)
Session = scoped_session(session_factory)

# 모델 베이스 클래스 생성
Base = declarative_base()

# 데이터베이스 초기화 함수
def init_db():
    """
    데이터베이스 테이블 생성 및 초기화
    주의: 이 함수는 애플리케이션 시작 시 한 번만 호출해야 함
    """
    Base.metadata.create_all(bind=engine)
    print(f"데이터베이스 테이블이 '{DB_PATH}'에 생성되었습니다.")

# 데이터베이스 세션 가져오기
def get_db_session():
    """
    새로운 데이터베이스 세션 반환
    사용 후 세션을 닫아야 함 (session.close())
    """
    session = Session()
    try:
        return session
    except Exception:
        session.rollback()
        raise
    finally:
        pass  # 세션을 반환하므로 여기서 닫지 않음

# 데이터베이스 초기화 (스키마 생성)
if __name__ == "__main__":
    init_db()
    print("SQLite 데이터베이스가 초기화되었습니다.")