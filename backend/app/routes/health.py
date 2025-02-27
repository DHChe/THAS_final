from flask import Flask, Blueprint, jsonify
from flask_cors import CORS
from config import Config
from datetime import datetime


def create_app(config_class=Config):
    """
    Flask 애플리케이션 팩토리 함수

    Args:
        config_class: 설정 클래스 (기본값: Config)

    Returns:
        Flask 애플리케이션 인스턴스
    """
    app = Flask(__name__)
    app.config.from_object(config_class)

    # CORS 설정 (개발 환경)
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": ["http://localhost:3000"],
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
            }
        },
    )

    # health 엔드포인트 등록
    from app.routes import health  # health.py 모듈 내에 health_bp가 정의되어 있습니다.

    app.register_blueprint(health.health_bp)

    # API 블루프린트 등록
    from app.routes import hr, attendance, payroll

    app.register_blueprint(hr.hr_bp, url_prefix="/api/hr")
    app.register_blueprint(attendance.attendance_bp, url_prefix="/api/attendance")
    app.register_blueprint(payroll.payroll_bp, url_prefix="/api/payroll")

    return app


health_bp = Blueprint("health", __name__)


@health_bp.route("/api/health", methods=["GET"])
def health_check():
    """서버 상태 확인 엔드포인트"""
    return (
        jsonify(
            {
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "service": "THAS Backend",
            }
        ),
        200,
    )
