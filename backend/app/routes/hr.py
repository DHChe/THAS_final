from flask import Blueprint, jsonify, request
from app.services.hr_service import HRService
from flask_jwt_extended import jwt_required
from config import Config

hr_bp = Blueprint("hr", __name__)
hr_service = HRService(Config)


@hr_bp.route("/summary", methods=["GET"])
@jwt_required()
def get_hr_summary():
    """인사 현황 요약 정보를 제공하는 엔드포인트"""
    try:
        summary = hr_service.get_employee_summary()
        return jsonify({"status": "success", "data": summary}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@hr_bp.route("/employees", methods=["GET"])
@jwt_required()
def search_employees():
    """직원 검색 엔드포인트"""
    try:
        query = request.args.to_dict()
        employees = hr_service.search_employees(query)
        return jsonify({"status": "success", "data": employees}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@hr_bp.route("/employees/<employee_id>", methods=["GET"])
@jwt_required()
def get_employee_detail(employee_id):
    """직원 상세 정보 조회 엔드포인트"""
    try:
        employee = hr_service.get_employee_details(employee_id)
        if employee is None:
            return (
                jsonify({"status": "error", "message": "직원을 찾을 수 없습니다."}),
                404,
            )

        return jsonify({"status": "success", "data": employee}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@hr_bp.route("/employees/<employee_id>", methods=["PUT"])
@jwt_required()
def update_employee_info(employee_id):
    """직원 정보 업데이트 엔드포인트"""
    try:
        # 요청 데이터 검증
        update_data = request.get_json()

        # 데이터 유효성 검사
        validation_errors = hr_service.validate_employee_data(update_data)
        if validation_errors:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "입력 데이터가 올바르지 않습니다.",
                        "errors": validation_errors,
                    }
                ),
                400,
            )

        # 직원 정보 업데이트
        updated_employee = hr_service.update_employee(employee_id, update_data)

        if not updated_employee:
            return (
                jsonify(
                    {"status": "error", "message": "해당 직원을 찾을 수 없습니다."}
                ),
                404,
            )

        return (
            jsonify(
                {
                    "status": "success",
                    "message": "직원 정보가 성공적으로 업데이트되었습니다.",
                    "data": updated_employee,
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
