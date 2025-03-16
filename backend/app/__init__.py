from flask import Flask
from flask_cors import CORS
import logging
from logging.handlers import RotatingFileHandler
import os
from .routes.ai_routes import ai_bp


def create_app():
    """
    Flask 애플리케이션 팩토리 함수

    Returns:
        Flask 애플리케이션 인스턴스
    """
    app = Flask(__name__)

    # CORS 설정 수정
    CORS(
        app,
        resources={
            r"/*": {
                "origins": ["http://localhost:3000", "http://localhost:3001"],
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "allow_headers": [
                    "Content-Type",
                    "Authorization",
                    "Accept",
                    "Cache-Control",
                    "Expires",
                    "Pragma",
                ],
                "supports_credentials": True,
                "expose_headers": ["Content-Type", "Authorization"],
                "max_age": 3600,
            }
        },
        supports_credentials=True,
    )

    # 로깅 설정
    if not os.path.exists("logs"):
        os.mkdir("logs")

    # 파일 핸들러 설정
    file_handler = RotatingFileHandler("logs/thas.log", maxBytes=10240, backupCount=10)
    file_handler.setFormatter(
        logging.Formatter(
            "%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]"
        )
    )
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)

    # 콘솔 핸들러 설정
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    app.logger.addHandler(console_handler)

    app.logger.setLevel(logging.INFO)
    app.logger.info("THAS startup")

    # 하위 폴더의 health 모듈에서 health_bp를 가져오기
    from app.routes.health import health_bp

    app.register_blueprint(health_bp)

    # API 블루프린트 등록
    from app.routes import hr, attendance, payroll, auth

    app.register_blueprint(hr.hr_bp, url_prefix="/api/hr")
    app.register_blueprint(attendance.attendance_bp, url_prefix="/api/attendance")
    app.register_blueprint(payroll.payroll_bp, url_prefix="/api/payroll")
    app.register_blueprint(auth.auth_bp, url_prefix="/api/auth")

    # AI 라우트 등록
    app.register_blueprint(ai_bp, url_prefix="/api/ai")

    return app
