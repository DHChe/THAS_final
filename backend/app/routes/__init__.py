# backend/app/routes/__init__.py
from .hr import hr_bp
from .payroll import payroll_bp
from .ai_analysis import ai_analysis_bp
from app.routes.health import health_bp

from flask import Flask
from config import Config  # config.py 파일에 Config 클래스가 존재해야 함


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Health check 블루프린트 등록
    app.register_blueprint(health_bp)

    # HR 블루프린트 등록
    app.register_blueprint(hr_bp)

    # Payroll 블루프린트 등록
    app.register_blueprint(payroll_bp)

    # AI 분석 블루프린트 등록
    app.register_blueprint(ai_analysis_bp)

    return app
