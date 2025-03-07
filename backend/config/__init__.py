"""
설정 패키지 초기화 파일
"""

import os
from datetime import timedelta


class Config:
    """Flask 애플리케이션 설정 클래스"""

    # 기본 설정
    SECRET_KEY = os.environ.get("SECRET_KEY") or "dev-secret-key"

    # JWT 설정
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY") or "jwt-secret-key"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)

    # 데이터 파일 경로
    DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    EMPLOYEE_DATA = os.path.join(DATA_DIR, "employees.csv")
    ATTENDANCE_DATA = os.path.join(DATA_DIR, "attendance.csv")
    PAYROLL_DATA = os.path.join(DATA_DIR, "payroll.csv")
