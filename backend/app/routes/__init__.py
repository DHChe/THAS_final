# backend/app/routes/__init__.py
from .hr import hr_bp
from .payroll import payroll_bp

from app.routes.health import health_bp

from flask import Flask
from config import Config  # config.py 파일에 Config 클래스가 존재해야 함


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Health check 블루프린트 등록
    app.register_blueprint(health_bp)

    # ... 기존 코드 ...
