from flask import Blueprint, jsonify, request
from app.services.payroll_service import PayrollService
from flask_jwt_extended import jwt_required, get_jwt_identity
from config import Config
import datetime
from sqlalchemy.orm import Session
from models.models import Employee, Attendance, Payroll
import sys
import os

sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)
from utils.pay_calculator import PayCalculator

# 블루프린트 생성
payroll_bp = Blueprint("payroll", __name__)

# 서비스 인스턴스 생성
payroll_service = PayrollService(Config)


@payroll_bp.route("/summary", methods=["GET"])
@jwt_required()
def get_payroll_summary():
    """급여 현황 요약 정보를 제공하는 엔드포인트

    Returns:
        JSON: 급여 통계 정보
    """
    try:
        stats = payroll_service.calculate_monthly_stats()
        return jsonify({"status": "success", "data": stats}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@payroll_bp.route("/current-month", methods=["GET"])
@jwt_required()
def get_current_month_payroll():
    """현재 월 급여 데이터를 제공하는 엔드포인트

    Returns:
        JSON: 급여 데이터 및 메타 정보
    """
    try:
        df, current_month = payroll_service.load_payroll_data()
        return (
            jsonify(
                {
                    "status": "success",
                    "data": df.to_dict("records"),
                    "meta": {"current_month": current_month},
                }
            ),
            200,
        )
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@payroll_bp.route("/confirm", methods=["POST"])
@jwt_required()
def confirm_payroll():
    """
    급여 계산 확정 및 저장 엔드포인트

    Returns:
        JSON: 확정된 급여 내역 정보
    """
    try:
        data = request.json
        payroll_data = data.get("payroll_data", [])

        with Session() as session:
            try:
                confirmed_payrolls = []

                for item in payroll_data:
                    # payroll_code 생성 (날짜 + 일련번호)
                    period_start = datetime.strptime(
                        item["payment_period_start"], "%Y-%m-%d"
                    ).date()
                    year_month = period_start.strftime("%Y%m")

                    # 이번 달 마지막 payroll_code 조회
                    last_code = (
                        session.query(Payroll)
                        .filter(Payroll.payroll_code.like(f"PR{year_month}%"))
                        .order_by(Payroll.payroll_code.desc())
                        .first()
                    )

                    if last_code:
                        last_num = int(last_code.payroll_code[-3:])
                        new_num = last_num + 1
                    else:
                        new_num = 1

                    payroll_code = f"PR{year_month}{new_num:03d}"

                    # 새 Payroll 객체 생성 (id 필드는 자동 생성되도록 제외)
                    payroll = Payroll(
                        payroll_code=payroll_code,
                        employee_id=item["employee_id"],
                        payment_period_start=item["payment_period_start"],
                        payment_period_end=item["payment_period_end"],
                        base_pay=item["base_pay"],
                        overtime_pay=item["overtime_pay"],
                        holiday_pay=item["holiday_pay"],
                        total_allowances=item["position_allowance"],
                        gross_pay=item["total_pay"],
                        total_deductions=0,  # 실제 공제 계산 로직 추가 필요
                        net_pay=item["total_pay"],  # 공제 후 실제 지급액 계산 필요
                        status="confirmed",
                        confirmed_at=datetime.now(),
                        confirmed_by="admin",  # 현재 로그인한 사용자 ID로 변경 필요
                    )

                    session.add(payroll)
                    confirmed_payrolls.append(payroll_code)

                session.commit()
                return jsonify(
                    {
                        "status": "success",
                        "message": f"{len(confirmed_payrolls)}건의 급여가 확정되었습니다",
                        "confirmed_payrolls": confirmed_payrolls,
                    }
                )

            except Exception as e:
                session.rollback()
                return jsonify({"status": "error", "message": str(e)}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@payroll_bp.route("/api/payroll/calculate", methods=["POST"])
def calculate_payroll():
    try:
        data = request.json
        employee_ids = data.get("employee_ids", [])
        period_start = data.get("period_start")
        period_end = data.get("period_end")

        # 날짜 문자열을 날짜 객체로 변환
        period_start_date = datetime.strptime(period_start, "%Y-%m-%d").date()
        period_end_date = datetime.strptime(period_end, "%Y-%m-%d").date()

        # 결과를 저장할 리스트
        calculation_results = []

        with Session() as session:
            for emp_id in employee_ids:
                try:
                    # 직원 정보 조회
                    employee = (
                        session.query(Employee)
                        .filter(Employee.employee_id == emp_id)
                        .first()
                    )
                    if not employee:
                        calculation_results.append(
                            {
                                "employee_id": emp_id,
                                "status": "error",
                                "message": "직원을 찾을 수 없습니다",
                            }
                        )
                        continue

                    # 근태 기록 조회
                    attendance_records = (
                        session.query(Attendance)
                        .filter(
                            Attendance.employee_id == emp_id,
                            Attendance.date >= period_start_date,
                            Attendance.date <= period_end_date,
                        )
                        .all()
                    )

                    # 급여 계산 로직 호출
                    pay_calculator = PayCalculator(
                        employee, attendance_records, period_start_date, period_end_date
                    )
                    pay_result = pay_calculator.calculate_total_pay()

                    # 중요: 객체 생성만 하고 session에 추가하지 않음
                    # 계산 결과만 반환
                    calculation_results.append(
                        {
                            "employee_id": emp_id,
                            "name": employee.name,
                            "department": employee.department,
                            "position": employee.position,
                            "base_pay": pay_result["base_pay"],
                            "overtime_pay": pay_result["overtime_pay"],
                            "holiday_pay": pay_result["holiday_pay"],
                            "position_allowance": pay_result["position_allowance"],
                            "total_pay": pay_result["total_pay"],
                            "status": "calculated",
                        }
                    )
                except Exception as e:
                    calculation_results.append(
                        {"employee_id": emp_id, "status": "error", "message": str(e)}
                    )

        return jsonify({"results": calculation_results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
