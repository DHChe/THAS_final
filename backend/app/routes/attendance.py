from flask import Blueprint, jsonify

# 근태관리 블루프린트 생성
attendance_bp = Blueprint("attendance", __name__)

@attendance_bp.route('/', methods=['GET'])
def attendance_endpoint():
    """근태관리 서비스 정상 동작 여부를 반환하는 엔드포인트"""
    return jsonify({"message": "근태관리 서비스 정상 동작"})