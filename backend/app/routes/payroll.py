from flask import Blueprint, jsonify
from app.services.payroll_service import PayrollService
from flask_jwt_extended import jwt_required
from config import Config

# 블루프린트 생성
payroll_bp = Blueprint('payroll', __name__)

# 서비스 인스턴스 생성
payroll_service = PayrollService(Config)

@payroll_bp.route('/summary', methods=['GET'])
@jwt_required()
def get_payroll_summary():
    """급여 현황 요약 정보를 제공하는 엔드포인트
    
    Returns:
        JSON: 급여 통계 정보
    """
    try:
        stats = payroll_service.calculate_monthly_stats()
        return jsonify({
            'status': 'success',
            'data': stats
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@payroll_bp.route('/current-month', methods=['GET'])
@jwt_required()
def get_current_month_payroll():
    """현재 월 급여 데이터를 제공하는 엔드포인트
    
    Returns:
        JSON: 급여 데이터 및 메타 정보
    """
    try:
        df, current_month = payroll_service.load_payroll_data()
        return jsonify({
            'status': 'success',
            'data': df.to_dict('records'),
            'meta': {
                'current_month': current_month
            }
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500