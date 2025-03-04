from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os
import json
from datetime import datetime

# 기존 모듈 임포트
from utils.pay_calculator import PayCalculator
from utils.insurance_calculator import InsuranceCalculator

# 새로 추가: 데이터베이스 연결 및 모델 임포트
from config.database import init_db, get_db_session
from models.models import Employee, Attendance, Payroll, PayrollAudit, PayrollDocument

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3001"}})

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EMPLOYEES_CSV = os.path.join(BASE_DIR, "data", "employees.csv")
ATTENDANCE_CSV = os.path.join(BASE_DIR, "data", "attendance.csv")

# 급여 지급일 설정 (매월 25일로 가정)
PAYROLL_DAY = 25  # *** 급여 지급일 설정 (변경 시 이 값을 수정하세요) ***

# 새로 추가: 급여 명세서 저장 디렉토리 설정
PAYSLIPS_DIR = os.path.join(BASE_DIR, "data", "payslips")
os.makedirs(PAYSLIPS_DIR, exist_ok=True)


# 수정: CSV 파일에서 직원 데이터 로드하는 함수
def load_employees():
    try:
        # 데이터베이스에서 직원 데이터 로드 시도
        session = get_db_session()
        try:
            employees = (
                session.query(Employee).filter(Employee.status == "재직중").all()
            )
            if employees:
                print(
                    f"데이터베이스에서 {len(employees)}명의 직원 데이터를 로드했습니다."
                )
                return [
                    {
                        "employee_id": emp.employee_id,
                        "name": emp.name,
                        "department": emp.department,
                        "position": emp.position,
                        "base_salary": emp.base_salary,
                        "family_count": emp.family_count,
                        "status": emp.status,
                    }
                    for emp in employees
                ]
        except Exception as e:
            print(f"데이터베이스 조회 오류: {e}")
        finally:
            session.close()

        # 데이터베이스 로드 실패 시 CSV 파일로 폴백
        if not os.path.exists(EMPLOYEES_CSV):
            print(f"Error: {EMPLOYEES_CSV} 파일이 존재하지 않습니다.")
            return []

        print(f"CSV 파일에서 직원 데이터 로드 중: {EMPLOYEES_CSV}")
        with open(EMPLOYEES_CSV, "r", encoding="utf-8") as f:
            print(f"First few lines of {EMPLOYEES_CSV}:")
            for i, line in enumerate(f):
                if i < 3:
                    print(line.strip())
                else:
                    break

        df = pd.read_csv(
            EMPLOYEES_CSV,
            encoding="utf-8",
            delimiter=",",
            dtype={
                "employee_id": str,
                "base_salary": "int",
                "family_count": "int",
                "num_children": "int",
                "name": str,
                "department": str,
                "status": str,
                "position": str,
            },
            on_bad_lines="warn",
        )

        print(f"Total rows in CSV: {len(df)}")
        df = df[df["status"].str.strip().str.lower() == "재직중"]
        print(f"Filtered rows where status is '재직중': {len(df)} rows")

        if df.empty:
            print("Warning: '재직중' 상태의 직원이 없습니다.")
            return []

        df["base_salary"] = df["base_salary"].fillna(0).astype(int)
        df["family_count"] = df["family_count"].fillna(0).astype(int)
        df["num_children"] = df["num_children"].fillna(0).astype(int)
        df["name"] = df["name"].fillna("").astype(str).str.strip()
        df["department"] = df["department"].fillna("").astype(str).str.strip()
        df["position"] = df["position"].fillna("").astype(str).str.strip()
        df["status"] = df["status"].fillna("").astype(str).str.strip()

        valid_data = df[
            (df["employee_id"].notna())
            & (df["name"].notna() & (df["name"].str.strip() != ""))
            & (df["department"].notna() & (df["department"].str.strip() != ""))
        ]

        if valid_data.empty:
            print("Warning: 유효한 직원 데이터가 없습니다.")
            return []

        result = valid_data[
            [
                "employee_id",
                "name",
                "department",
                "position",
                "base_salary",
                "family_count",
                "status",
            ]
        ].to_dict("records")
        print(f"Loaded {len(result)} valid employees from CSV")
        return result
    except Exception as e:
        print(f"Error loading employees: {e}")
        return []


# 수정: CSV 파일에서 근태 데이터 로드하는 함수
def load_attendance():
    try:
        # 데이터베이스에서 근태 데이터 로드 시도
        session = get_db_session()
        try:
            attendance_records = session.query(Attendance).all()
            if attendance_records:
                print(
                    f"데이터베이스에서 {len(attendance_records)}개의 근태 기록을 로드했습니다."
                )
                return [
                    {
                        "employee_id": record.employee_id,
                        "date": (
                            record.date.strftime("%Y-%m-%d")
                            if hasattr(record.date, "strftime")
                            else str(record.date)
                        ),
                        "check_in": record.check_in or "",
                        "check_out": record.check_out or "",
                        "attendance_type": record.attendance_type or "정상",
                    }
                    for record in attendance_records
                ]
        except Exception as e:
            print(f"데이터베이스 조회 오류: {e}")
        finally:
            session.close()

        # 데이터베이스 로드 실패 시 CSV 파일로 폴백
        if not os.path.exists(ATTENDANCE_CSV):
            print(f"Error: {ATTENDANCE_CSV} 파일이 존재하지 않습니다.")
            return []

        print(f"CSV 파일에서 근태 데이터 로드 중: {ATTENDANCE_CSV}")
        df = pd.read_csv(
            ATTENDANCE_CSV, encoding="utf-8", delimiter=",", on_bad_lines="warn"
        )

        df["check_in"] = df["check_in"].fillna("").astype(str).str.strip()
        df["check_out"] = df["check_out"].fillna("").astype(str).str.strip()
        df["attendance_type"] = (
            df["attendance_type"].fillna("정상").astype(str).str.strip()
        )
        df["date"] = df["date"].fillna("").astype(str).str.strip()

        print(f"Loaded {len(df)} attendance records from CSV")
        return df.to_dict("records")
    except Exception as e:
        print(f"Error loading attendance: {e}")
        return []


@app.route("/api/employees", methods=["GET"])
def get_employees():
    employees = load_employees()
    print(f"Returning {len(employees)} employees via /api/employees")
    return jsonify(employees)


# 수정: 급여 계산 API 엔드포인트 (날짜 처리 수정)
@app.route("/api/payroll/calculate", methods=["POST"])
def calculate_payroll():
    """
    급여 계산 API
    """
    data = request.json
    start_date = data.get("start_date")
    end_date = data.get("end_date")
    employee_ids = data.get("employee_ids", [])
    attendance_data = data.get("attendance_data", [])

    if not start_date or not end_date or not employee_ids:
        return (
            jsonify({"error": "start_date, end_date, employee_ids는 필수입니다."}),
            400,
        )

    employees_df = pd.DataFrame(load_employees())
    attendance_df = pd.DataFrame(
        attendance_data if attendance_data else load_attendance()
    )

    if employees_df.empty or attendance_df.empty:
        return jsonify({"error": "직원 또는 근태 데이터가 없습니다."}), 404

    results = []
    pay_calculator = PayCalculator()
    insurance_calculator = InsuranceCalculator()

    # 데이터베이스 세션 시작
    session = get_db_session()

    try:
        # 먼저 해당 기간에 이미 확정된 급여가 있는지 확인
        start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
        end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()

        existing_payrolls = {}
        for employee_id in employee_ids:
            # 해당 직원의 해당 기간 급여 데이터 확인
            existing_payroll = (
                session.query(Payroll)
                .filter(
                    Payroll.employee_id == employee_id,
                    Payroll.payment_period_start == start_date_obj,
                    Payroll.payment_period_end == end_date_obj,
                    Payroll.status.in_(
                        ["confirmed", "paid"]
                    ),  # 확정 또는 지급된 상태만 확인
                )
                .first()
            )

            if existing_payroll:
                existing_payrolls[employee_id] = existing_payroll

        for employee_id in employee_ids:
            if employee_id not in employees_df["employee_id"].values:
                print(f"Employee ID {employee_id} not found")
                continue

            employee = employees_df[employees_df["employee_id"] == employee_id].iloc[0]
            base_salary = employee["base_salary"]
            dependents = employee["family_count"]

            filtered_attendance = attendance_df[
                (attendance_df["employee_id"] == employee_id)
                & (attendance_df["date"] >= start_date)
                & (attendance_df["date"] <= end_date)
            ].to_dict("records")

            if not filtered_attendance:
                print(f"No attendance data for employee {employee_id}")
                continue

            # 이미 확정된 급여가 있는 경우, 그 데이터를 사용
            if employee_id in existing_payrolls:
                existing = existing_payrolls[employee_id]
                result = {
                    "payroll_id": existing.id,
                    "payroll_code": existing.payroll_code,
                    "employee_id": employee_id,
                    "employee_name": employee["name"],
                    "department": employee["department"],
                    "position": employee["position"],
                    "basePay": existing.base_pay,
                    "overtimePay": existing.overtime_pay,
                    "nightPay": existing.night_shift_pay,
                    "holidayPay": existing.holiday_pay,
                    "deductions": {
                        "nationalPension": existing.national_pension,
                        "healthInsurance": existing.health_insurance,
                        "longTermCare": existing.health_insurance
                        * 0.1025,  # 건강보험의 10.25%
                        "employmentInsurance": existing.employment_insurance,
                    },
                    "taxes": {
                        "incomeTax": existing.income_tax,
                        "localIncomeTax": existing.residence_tax,
                    },
                    "grossPay": existing.gross_pay,
                    "totalDeductions": existing.total_deductions,
                    "netPay": existing.net_pay,
                    "status": existing.status,  # 이미 확정된 상태 반환
                    "payment_date": (
                        existing.payment_date.strftime("%Y-%m-%d")
                        if existing.payment_date
                        else None
                    ),
                }
                results.append(result)
                continue

            try:
                # 기존 급여 계산 로직 유지
                gross_salary = pay_calculator.get_total_pay(
                    base_salary, start_date, end_date, filtered_attendance
                )
                basePay = pay_calculator.calculate_base_pay(
                    base_salary, start_date, end_date, filtered_attendance
                )
                overtimePay = pay_calculator.calculate_overtime_pay(
                    filtered_attendance, (base_salary / 12) / 209
                )
                nightPay = pay_calculator.calculate_night_pay(
                    filtered_attendance, (base_salary / 12) / 209
                )
                holidayPay = pay_calculator.calculate_holiday_pay(
                    filtered_attendance, (base_salary / 12) / 209
                )

                deductions = insurance_calculator.calculate_insurances(gross_salary)
                taxes = insurance_calculator.calculate_taxes(gross_salary, dependents)
                net_pay = insurance_calculator.get_net_pay(gross_salary, dependents)
                total_deductions = sum(deductions.values()) + sum(taxes.values())

                # 새로 추가: 급여 코드 생성 (예: PR202402001)
                year_month = datetime.strptime(start_date, "%Y-%m-%d").strftime("%Y%m")
                payroll_count = session.query(Payroll).count()
                payroll_code = f"PR{year_month}{payroll_count + 1:03d}"

                # 날짜 문자열을 date 객체로 변환 (SQLite 호환성)
                start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
                end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()

                # 새로 추가: Payroll 객체 생성 및 저장 (날짜 처리 수정)
                payroll = Payroll(
                    payroll_code=payroll_code,
                    employee_id=employee_id,
                    payment_period_start=start_date_obj,  # 문자열 대신 date 객체 사용
                    payment_period_end=end_date_obj,  # 문자열 대신 date 객체 사용
                    base_pay=basePay,  # 기존 변수명 유지
                    overtime_pay=overtimePay,  # 기존 변수명 유지
                    night_shift_pay=nightPay,  # 기존 변수명 유지
                    holiday_pay=holidayPay,  # 기존 변수명 유지
                    total_allowances=overtimePay + nightPay + holidayPay,
                    gross_pay=gross_salary,
                    income_tax=taxes.get("incomeTax", 0),
                    residence_tax=taxes.get("localIncomeTax", 0),
                    national_pension=deductions.get("nationalPension", 0),
                    health_insurance=deductions.get("healthInsurance", 0),
                    employment_insurance=deductions.get("employmentInsurance", 0),
                    total_deductions=total_deductions,
                    net_pay=net_pay,
                    status="draft",
                )

                session.add(payroll)
                session.flush()  # ID 생성을 위해 플러시

                # 새로 추가: 감사 로그 추가
                audit = PayrollAudit(
                    action="CREATE",
                    user_id=request.headers.get("X-User-ID", "system"),
                    timestamp=datetime.now(),
                    target_type="payroll",
                    target_id=payroll_code,
                    new_value=json.dumps(
                        {
                            "employee_id": employee_id,
                            "payment_period_start": start_date,
                            "payment_period_end": end_date,
                            "basePay": basePay,
                            "overtimePay": overtimePay,
                            "nightPay": nightPay,
                            "holidayPay": holidayPay,
                            "gross_pay": gross_salary,
                            "total_deductions": total_deductions,
                            "net_pay": net_pay,
                            "status": "draft",
                        }
                    ),
                    ip_address=request.remote_addr,
                )

                session.add(audit)

                # 결과 추가 - 프론트엔드 컴포넌트와 일치하는 필드명으로 응답
                result = {
                    "payroll_id": payroll.id,
                    "payroll_code": payroll_code,
                    "employee_id": employee_id,
                    "employee_name": employee["name"],
                    "department": employee["department"],
                    "position": employee["position"],
                    "basePay": basePay,
                    "overtimePay": overtimePay,
                    "nightPay": nightPay,
                    "holidayPay": holidayPay,
                    "deductions": {
                        "nationalPension": deductions.get("nationalPension", 0),
                        "healthInsurance": deductions.get("healthInsurance", 0),
                        "longTermCare": deductions.get("longTermCare", 0),
                        "employmentInsurance": deductions.get("employmentInsurance", 0),
                    },
                    "taxes": {
                        "incomeTax": taxes.get("incomeTax", 0),
                        "localIncomeTax": taxes.get("localIncomeTax", 0),
                    },
                    "totalPay": gross_salary,
                    "netPay": net_pay,
                    "status": "draft",
                }
                results.append(result)
            except Exception as e:
                print(f"Error calculating payroll for {employee_id}: {e}")
                continue

        # 트랜잭션 커밋
        session.commit()

        if not results:
            return jsonify({"error": "급여 계산 결과가 없습니다."}), 404

        return jsonify({"results": results})
    except Exception as e:
        session.rollback()
        return jsonify({"error": f"급여 계산 중 오류가 발생했습니다: {str(e)}"}), 500
    finally:
        session.close()


# 새로 추가: 급여 확정 API 엔드포인트 (날짜 처리 수정)
@app.route("/api/payroll/confirm", methods=["PUT"])
def confirm_payroll():
    data = request.json
    payroll_ids = data.get("payroll_ids", [])
    remarks = data.get("remarks", "")
    user_id = request.headers.get("X-User-ID", "system")

    if not payroll_ids:
        return jsonify({"error": "확정할 급여 ID가 제공되지 않았습니다."}), 400

    session = get_db_session()
    try:
        confirmed_payrolls = []

        for payroll_code in payroll_ids:
            payroll = (
                session.query(Payroll).filter_by(payroll_code=payroll_code).first()
            )
            if not payroll or payroll.status != "draft":
                continue

            # 이전 상태 저장 (감사 추적용)
            old_value = {
                "status": payroll.status,
                "updated_at": (
                    payroll.updated_at.isoformat() if payroll.updated_at else None
                ),
            }

            # 상태 업데이트
            payroll.status = "confirmed"
            payroll.confirmed_at = datetime.now()
            payroll.confirmed_by = user_id
            payroll.remarks = remarks

            # 감사 로그 추가
            audit = PayrollAudit(
                action="UPDATE_STATUS",
                user_id=user_id,
                timestamp=datetime.now(),
                target_type="payroll",
                target_id=payroll_code,
                old_value=json.dumps(old_value),
                new_value=json.dumps(
                    {
                        "status": "confirmed",
                        "confirmed_at": datetime.now().isoformat(),
                        "confirmed_by": user_id,
                        "remarks": remarks,
                    }
                ),
                ip_address=request.remote_addr,
            )

            session.add(audit)
            confirmed_payrolls.append(
                {
                    "payroll_id": payroll.id,
                    "payroll_code": payroll_code,
                    "employee_id": payroll.employee_id,
                    "confirmed_at": payroll.confirmed_at.isoformat(),
                }
            )

        session.commit()

        if not confirmed_payrolls:
            return jsonify({"warning": "확정된 급여가 없습니다."}), 200

        return jsonify(
            {
                "status": "success",
                "message": f"{len(confirmed_payrolls)}개 급여가 확정되었습니다.",
                "confirmed_payrolls": confirmed_payrolls,
            }
        )
    except Exception as e:
        session.rollback()
        return jsonify({"error": f"급여 확정 중 오류가 발생했습니다: {str(e)}"}), 500
    finally:
        session.close()


# 새로 추가: 급여 지급 처리 API 엔드포인트 (날짜 처리 수정)
@app.route("/api/payroll/pay", methods=["PUT"])
def process_payment():
    data = request.json
    payroll_ids = data.get("payroll_ids", [])
    payment_method = data.get("payment_method", "계좌이체")
    payment_date_str = data.get("payment_date", datetime.now().strftime("%Y-%m-%d"))
    user_id = request.headers.get("X-User-ID", "system")

    # 문자열을 date 객체로 변환
    payment_date = datetime.strptime(payment_date_str, "%Y-%m-%d").date()

    if not payroll_ids:
        return jsonify({"error": "지급 처리할 급여 ID가 제공되지 않았습니다."}), 400

    session = get_db_session()
    try:
        paid_payrolls = []

        for payroll_code in payroll_ids:
            payroll = (
                session.query(Payroll).filter_by(payroll_code=payroll_code).first()
            )
            if not payroll or payroll.status != "confirmed":
                continue

            # 이전 상태 저장 (감사 추적용)
            old_value = {
                "status": payroll.status,
                "updated_at": (
                    payroll.updated_at.isoformat() if payroll.updated_at else None
                ),
            }

            # 상태 업데이트
            payroll.status = "paid"
            payroll.payment_date = payment_date
            payroll.payment_method = payment_method

            # 감사 로그 추가
            audit = PayrollAudit(
                action="PAYMENT",
                user_id=user_id,
                timestamp=datetime.now(),
                target_type="payroll",
                target_id=payroll_code,
                old_value=json.dumps(old_value),
                new_value=json.dumps(
                    {
                        "status": "paid",
                        "payment_date": payment_date_str,
                        "payment_method": payment_method,
                    }
                ),
                ip_address=request.remote_addr,
            )

            session.add(audit)
            paid_payrolls.append(
                {
                    "payroll_id": payroll.id,
                    "payroll_code": payroll_code,
                    "employee_id": payroll.employee_id,
                    "payment_date": payment_date_str,
                }
            )

        session.commit()

        if not paid_payrolls:
            return jsonify({"warning": "지급 처리된 급여가 없습니다."}), 200

        return jsonify(
            {
                "status": "success",
                "message": f"{len(paid_payrolls)}개 급여가 지급 처리되었습니다.",
                "paid_payrolls": paid_payrolls,
            }
        )
    except Exception as e:
        session.rollback()
        return (
            jsonify({"error": f"급여 지급 처리 중 오류가 발생했습니다: {str(e)}"}),
            500,
        )
    finally:
        session.close()


# 새로 추가: 급여 기록 조회 API 엔드포인트 (날짜 처리 수정)
@app.route("/api/payroll/records", methods=["GET"])
def get_payroll_records():
    # 쿼리 파라미터 파싱
    employee_id = request.args.get("employee_id")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    status = request.args.get(
        "status"
    )  # draft, confirmed, paid 또는 comma로 구분된 여러 상태

    # 데이터베이스 세션 시작
    session = get_db_session()

    try:
        # 기본 쿼리 생성
        query = session.query(Payroll)

        # 필터 적용
        if employee_id:
            query = query.filter(Payroll.employee_id == employee_id)

        if start_date:
            start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
            query = query.filter(Payroll.payment_period_start >= start_date_obj)

        if end_date:
            end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()
            query = query.filter(Payroll.payment_period_end <= end_date_obj)

        if status:
            status_list = status.split(",")
            query = query.filter(Payroll.status.in_(status_list))

        # 결과 가져오기
        payrolls = query.all()

        # 직원 정보 조회를 위한 ID 목록
        employee_ids = [p.employee_id for p in payrolls]
        employees = {}

        # 직원 정보 조회
        if employee_ids:
            employee_records = (
                session.query(Employee)
                .filter(Employee.employee_id.in_(employee_ids))
                .all()
            )
            employees = {
                emp.employee_id: {
                    "name": emp.name,
                    "department": emp.department,
                    "position": emp.position,
                }
                for emp in employee_records
            }

        # 응답 데이터 포맷팅 - 기존 필드명 유지
        results = []
        for payroll in payrolls:
            employee_info = employees.get(
                payroll.employee_id,
                {"name": "Unknown", "department": "Unknown", "position": "Unknown"},
            )

            # date 객체를 문자열로 변환
            payment_period_start = (
                payroll.payment_period_start.strftime("%Y-%m-%d")
                if payroll.payment_period_start
                else None
            )
            payment_period_end = (
                payroll.payment_period_end.strftime("%Y-%m-%d")
                if payroll.payment_period_end
                else None
            )
            payment_date = (
                payroll.payment_date.strftime("%Y-%m-%d")
                if payroll.payment_date
                else None
            )

            results.append(
                {
                    "payroll_id": payroll.id,
                    "payroll_code": payroll.payroll_code,
                    "employee_id": payroll.employee_id,
                    "employee_name": employee_info["name"],
                    "department": employee_info["department"],
                    "position": employee_info["position"],
                    "payment_period_start": payment_period_start,
                    "payment_period_end": payment_period_end,
                    "payment_date": payment_date,
                    "basePay": payroll.base_pay,  # 모델은 base_pay이지만 응답은 basePay
                    "overtimePay": payroll.overtime_pay,  # 모델은 overtime_pay이지만 응답은 overtimePay
                    "nightPay": payroll.night_shift_pay,  # 모델은 night_shift_pay이지만 응답은 nightPay
                    "holidayPay": payroll.holiday_pay,  # 모델은 holiday_pay이지만 응답은 holidayPay
                    "totalAllowances": payroll.total_allowances,
                    "totalPay": payroll.gross_pay,  # 모델은 gross_pay이지만 응답은 totalPay
                    "income_tax": payroll.income_tax,
                    "residence_tax": payroll.residence_tax,
                    "national_pension": payroll.national_pension,
                    "health_insurance": payroll.health_insurance,
                    "employment_insurance": payroll.employment_insurance,
                    "total_deductions": payroll.total_deductions,
                    "netPay": payroll.net_pay,  # 모델은 net_pay이지만 응답은 netPay
                    "status": payroll.status,
                    "confirmed_at": (
                        payroll.confirmed_at.isoformat()
                        if payroll.confirmed_at
                        else None
                    ),
                    "confirmed_by": payroll.confirmed_by,
                    "payment_method": payroll.payment_method,
                    "remarks": payroll.remarks,
                }
            )

        return jsonify(results)
    except Exception as e:
        return (
            jsonify({"error": f"급여 기록 조회 중 오류가 발생했습니다: {str(e)}"}),
            500,
        )
    finally:
        session.close()


@app.route("/api/attendance", methods=["GET"])
def get_attendance():
    attendance = load_attendance()
    print(f"Returning {len(attendance)} attendance records via /api/attendance")
    return jsonify(attendance)


# 새로 추가: 급여 명세서 생성 및 발송 API 엔드포인트
@app.route("/api/payroll/send-payslips", methods=["POST"])
def send_payslips():
    """
    급여 명세서 생성 및 발송 API
    요청 형식:
    {
        "payroll_data": [급여 데이터 배열],
        "period": {
            "start": "YYYY-MM-DD",
            "end": "YYYY-MM-DD"
        }
    }
    """
    data = request.json
    payroll_data = data.get("payroll_data", [])
    period = data.get("period", {})
    start_date = period.get("start")
    end_date = period.get("end")
    user_id = request.headers.get("X-User-ID", "system")

    if not payroll_data or not start_date or not end_date:
        return jsonify({"error": "급여 데이터와 기간 정보가 필요합니다."}), 400

    session = get_db_session()
    try:
        results = []

        for payroll_item in payroll_data:
            payroll_code = payroll_item.get("payroll_code")
            if not payroll_code:
                continue

            # 급여 데이터 조회
            payroll = (
                session.query(Payroll).filter_by(payroll_code=payroll_code).first()
            )
            if not payroll:
                continue

            # 직원 정보 조회
            employee = (
                session.query(Employee)
                .filter_by(employee_id=payroll.employee_id)
                .first()
            )
            if not employee:
                continue

            # 파일명 생성: payslip_직원ID_YYYYMM.pdf (실제 PDF 생성 아님)
            year_month = datetime.strptime(start_date, "%Y-%m-%d").strftime("%Y%m")
            file_name = f"payslip_{employee.employee_id}_{year_month}.pdf"
            file_path = os.path.join(PAYSLIPS_DIR, file_name)

            # 실제 구현에서는 여기서 PDF 생성 로직이 들어갑니다
            # 현재는 파일 경로만 기록

            # 명세서 정보 DB에 저장
            document = PayrollDocument(
                payroll_id=payroll.id,
                document_type="급여명세서",
                document_path=file_path,
                created_by=user_id,
                sent=True,  # 개발용 시뮬레이션이므로 true로 설정
                sent_at=datetime.now(),
                sent_to=f"{employee.name} <{employee.employee_id}@example.com>",  # 실제 이메일은 DB에 없으므로 가상 이메일 사용
            )

            session.add(document)

            # 감사 로그 추가
            audit = PayrollAudit(
                action="DOCUMENT_SENT",
                user_id=user_id,
                timestamp=datetime.now(),
                target_type="payroll_document",
                target_id=payroll_code,
                new_value=json.dumps(
                    {
                        "document_type": "급여명세서",
                        "file_path": file_path,
                        "sent_at": datetime.now().isoformat(),
                        "sent_to": f"{employee.name} <{employee.employee_id}@example.com>",
                    }
                ),
                ip_address=request.remote_addr,
            )

            session.add(audit)

            # 결과에 추가
            results.append(
                {
                    "payroll_code": payroll_code,
                    "employee_id": employee.employee_id,
                    "employee_name": employee.name,
                    "document_path": file_path,
                    "sent_at": datetime.now().isoformat(),
                    "success": True,
                }
            )

        session.commit()

        if not results:
            return jsonify({"warning": "발송된 급여명세서가 없습니다."}), 200

        return jsonify(
            {
                "status": "success",
                "message": f"{len(results)}개의 급여명세서가 발송되었습니다.",
                "sent_documents": results,
            }
        )
    except Exception as e:
        session.rollback()
        return (
            jsonify(
                {"error": f"급여명세서 생성 및 발송 중 오류가 발생했습니다: {str(e)}"}
            ),
            500,
        )
    finally:
        session.close()


# 새로 추가: 급여 분석 데이터 API 엔드포인트
@app.route("/api/payroll/analysis", methods=["GET"])
def get_payroll_analysis():
    """
    급여 분석 데이터 조회 API
    요청 파라미터:
    - period_type: 'monthly', 'quarterly', 'yearly' (기간 유형)
    - start_date: 시작일 (YYYY-MM-DD)
    - end_date: 종료일 (YYYY-MM-DD)
    - group_by: 'department', 'position' (그룹화 기준)
    """
    # 쿼리 파라미터 파싱
    period_type = request.args.get("period_type", "monthly")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    group_by = request.args.get("group_by", "department")

    if not start_date or not end_date:
        return jsonify({"error": "시작일과 종료일이 필요합니다."}), 400

    # 문자열을 date 객체로 변환
    try:
        start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
        end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError:
        return (
            jsonify(
                {
                    "error": "날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식을 사용하세요."
                }
            ),
            400,
        )

    session = get_db_session()
    try:
        # 기본 급여 데이터 쿼리
        query = (
            session.query(
                Payroll.employee_id,
                Payroll.payment_period_start,
                Payroll.payment_period_end,
                Payroll.base_pay,
                Payroll.overtime_pay,
                Payroll.night_shift_pay,
                Payroll.holiday_pay,
                Payroll.gross_pay,
                Payroll.net_pay,
                Employee.department,
                Employee.position,
            )
            .join(Employee, Payroll.employee_id == Employee.employee_id)
            .filter(
                Payroll.payment_period_start >= start_date_obj,
                Payroll.payment_period_end <= end_date_obj,
                Payroll.status.in_(["confirmed", "paid"]),  # 확정/지급된 급여만 포함
            )
        )

        # 쿼리 실행
        records = query.all()

        if not records:
            return (
                jsonify({"warning": "해당 기간에 분석할 급여 데이터가 없습니다."}),
                200,
            )

        # 분석 결과 생성
        results = []

        # 그룹화 기준에 따라 데이터 집계
        if group_by == "department":
            # 부서별 분석
            departments = {}
            for record in records:
                dept = record.department
                if dept not in departments:
                    departments[dept] = {
                        "count": 0,
                        "total_base_pay": 0,
                        "total_allowances": 0,
                        "total_gross_pay": 0,
                        "total_net_pay": 0,
                    }

                departments[dept]["count"] += 1
                departments[dept]["total_base_pay"] += record.base_pay
                departments[dept]["total_allowances"] += (
                    record.overtime_pay + record.night_shift_pay + record.holiday_pay
                )
                departments[dept]["total_gross_pay"] += record.gross_pay
                departments[dept]["total_net_pay"] += record.net_pay

            # 평균 계산
            for dept, data in departments.items():
                count = data["count"]
                results.append(
                    {
                        "group": dept,
                        "employee_count": count,
                        "avg_base_pay": round(data["total_base_pay"] / count),
                        "avg_allowances": round(data["total_allowances"] / count),
                        "avg_gross_pay": round(data["total_gross_pay"] / count),
                        "avg_net_pay": round(data["total_net_pay"] / count),
                        "period_type": period_type,
                        "start_date": start_date,
                        "end_date": end_date,
                    }
                )
        else:
            # 직급별 분석
            positions = {}
            for record in records:
                pos = record.position
                if pos not in positions:
                    positions[pos] = {
                        "count": 0,
                        "total_base_pay": 0,
                        "total_allowances": 0,
                        "total_gross_pay": 0,
                        "total_net_pay": 0,
                    }

                positions[pos]["count"] += 1
                positions[pos]["total_base_pay"] += record.base_pay
                positions[pos]["total_allowances"] += (
                    record.overtime_pay + record.night_shift_pay + record.holiday_pay
                )
                positions[pos]["total_gross_pay"] += record.gross_pay
                positions[pos]["total_net_pay"] += record.net_pay

            # 평균 계산
            for pos, data in positions.items():
                count = data["count"]
                results.append(
                    {
                        "group": pos,
                        "employee_count": count,
                        "avg_base_pay": round(data["total_base_pay"] / count),
                        "avg_allowances": round(data["total_allowances"] / count),
                        "avg_gross_pay": round(data["total_gross_pay"] / count),
                        "avg_net_pay": round(data["total_net_pay"] / count),
                        "period_type": period_type,
                        "start_date": start_date,
                        "end_date": end_date,
                    }
                )

        # 전체 평균 추가
        total_count = len(records)
        total_base_pay = sum(r.base_pay for r in records)
        total_allowances = sum(
            r.overtime_pay + r.night_shift_pay + r.holiday_pay for r in records
        )
        total_gross_pay = sum(r.gross_pay for r in records)
        total_net_pay = sum(r.net_pay for r in records)

        results.append(
            {
                "group": "전체",
                "employee_count": total_count,
                "avg_base_pay": round(total_base_pay / total_count),
                "avg_allowances": round(total_allowances / total_count),
                "avg_gross_pay": round(total_gross_pay / total_count),
                "avg_net_pay": round(total_net_pay / total_count),
                "period_type": period_type,
                "start_date": start_date,
                "end_date": end_date,
            }
        )

        return jsonify(
            {
                "status": "success",
                "analysis_data": results,
                "metadata": {
                    "period_type": period_type,
                    "start_date": start_date,
                    "end_date": end_date,
                    "group_by": group_by,
                },
            }
        )
    except Exception as e:
        return (
            jsonify(
                {"error": f"급여 분석 데이터 조회 중 오류가 발생했습니다: {str(e)}"}
            ),
            500,
        )
    finally:
        session.close()


# 새로 추가: LLM을 연동한 급여 데이터 분석 API 엔드포인트
@app.route("/api/payroll/insights", methods=["POST"])
def get_payroll_insights():
    """
    LLM을 연동한 급여 데이터 분석 API
    요청 형식:
    {
        "period": {
            "start": "YYYY-MM-DD",
            "end": "YYYY-MM-DD"
        },
        "analysis_type": "department|position|employee|overall",
        "target_id": "부서명|직급명|직원ID" (analysis_type에 따라 필요)
    }
    """
    data = request.json
    period = data.get("period", {})
    start_date = period.get("start")
    end_date = period.get("end")
    analysis_type = data.get("analysis_type", "overall")
    target_id = data.get("target_id")

    if not start_date or not end_date:
        return jsonify({"error": "시작일과 종료일이 필요합니다."}), 400

    # department, position, employee 분석 유형에는 target_id 필수
    if analysis_type in ["department", "position", "employee"] and not target_id:
        return (
            jsonify({"error": f"{analysis_type} 분석에는 target_id가 필요합니다."}),
            400,
        )

    # 문자열을 date 객체로 변환
    try:
        start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
        end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError:
        return (
            jsonify(
                {
                    "error": "날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식을 사용하세요."
                }
            ),
            400,
        )

    session = get_db_session()
    try:
        # 기본 급여 데이터 쿼리
        query = (
            session.query(
                Payroll.employee_id,
                Payroll.payment_period_start,
                Payroll.payment_period_end,
                Payroll.base_pay,
                Payroll.overtime_pay,
                Payroll.night_shift_pay,
                Payroll.holiday_pay,
                Payroll.gross_pay,
                Payroll.net_pay,
                Payroll.income_tax,
                Payroll.national_pension,
                Payroll.health_insurance,
                Payroll.total_deductions,
                Employee.name,
                Employee.department,
                Employee.position,
                Employee.base_salary,
            )
            .join(Employee, Payroll.employee_id == Employee.employee_id)
            .filter(
                Payroll.payment_period_start >= start_date_obj,
                Payroll.payment_period_end <= end_date_obj,
                Payroll.status.in_(["confirmed", "paid"]),  # 확정/지급된 급여만 포함
            )
        )

        # 분석 유형에 따른 필터 적용
        if analysis_type == "department":
            query = query.filter(Employee.department == target_id)
        elif analysis_type == "position":
            query = query.filter(Employee.position == target_id)
        elif analysis_type == "employee":
            query = query.filter(Employee.employee_id == target_id)

        # 쿼리 실행
        records = query.all()

        if not records:
            return jsonify({"warning": "해당 조건에 맞는 급여 데이터가 없습니다."}), 200

        # 분석 데이터 생성
        analysis_data = {}

        # 분석 유형에 따른 데이터 준비
        if analysis_type == "overall":
            # 월별 평균 급여 추이
            monthly_trends = {}
            for record in records:
                month_key = record.payment_period_start.strftime("%Y-%m")
                if month_key not in monthly_trends:
                    monthly_trends[month_key] = {
                        "count": 0,
                        "total_gross": 0,
                        "total_net": 0,
                        "total_deductions": 0,
                    }

                monthly_trends[month_key]["count"] += 1
                monthly_trends[month_key]["total_gross"] += record.gross_pay
                monthly_trends[month_key]["total_net"] += record.net_pay
                monthly_trends[month_key]["total_deductions"] += record.total_deductions

            # 평균 계산
            trends = []
            for month, data in sorted(monthly_trends.items()):
                count = data["count"]
                trends.append(
                    {
                        "month": month,
                        "avg_gross": round(data["total_gross"] / count),
                        "avg_net": round(data["total_net"] / count),
                        "avg_deductions": round(data["total_deductions"] / count),
                        "employee_count": count,
                    }
                )

            analysis_data["monthly_trends"] = trends

            # 부서별 평균 급여
            department_avg = {}
            for record in records:
                dept = record.department
                if dept not in department_avg:
                    department_avg[dept] = {
                        "count": 0,
                        "total_gross": 0,
                        "total_net": 0,
                    }

                department_avg[dept]["count"] += 1
                department_avg[dept]["total_gross"] += record.gross_pay
                department_avg[dept]["total_net"] += record.net_pay

            dept_data = []
            for dept, data in department_avg.items():
                count = data["count"]
                dept_data.append(
                    {
                        "department": dept,
                        "avg_gross": round(data["total_gross"] / count),
                        "avg_net": round(data["total_net"] / count),
                        "employee_count": count,
                    }
                )

            analysis_data["department_averages"] = dept_data

        elif analysis_type == "department":
            # 부서 내 직급별 평균
            position_avg = {}
            for record in records:
                pos = record.position
                if pos not in position_avg:
                    position_avg[pos] = {
                        "count": 0,
                        "total_gross": 0,
                        "total_net": 0,
                        "total_overtime": 0,
                    }

                position_avg[pos]["count"] += 1
                position_avg[pos]["total_gross"] += record.gross_pay
                position_avg[pos]["total_net"] += record.net_pay
                position_avg[pos]["total_overtime"] += record.overtime_pay

            pos_data = []
            for pos, data in position_avg.items():
                count = data["count"]
                pos_data.append(
                    {
                        "position": pos,
                        "avg_gross": round(data["total_gross"] / count),
                        "avg_net": round(data["total_net"] / count),
                        "avg_overtime": round(data["total_overtime"] / count),
                        "employee_count": count,
                    }
                )

            analysis_data["position_averages"] = pos_data

            # 부서 기초 통계
            total_gross = sum(r.gross_pay for r in records)
            total_net = sum(r.net_pay for r in records)
            total_employees = len(set(r.employee_id for r in records))

            analysis_data["department_stats"] = {
                "name": target_id,
                "total_employees": total_employees,
                "avg_gross": round(total_gross / len(records)),
                "avg_net": round(total_net / len(records)),
                "total_records": len(records),
            }

        elif analysis_type == "employee":
            # 개인 급여 추이
            employee_trends = {}
            for record in records:
                month_key = record.payment_period_start.strftime("%Y-%m")
                employee_trends[month_key] = {
                    "gross_pay": record.gross_pay,
                    "net_pay": record.net_pay,
                    "base_pay": record.base_pay,
                    "overtime_pay": record.overtime_pay,
                    "night_shift_pay": record.night_shift_pay,
                    "holiday_pay": record.holiday_pay,
                    "income_tax": record.income_tax,
                    "national_pension": record.national_pension,
                    "health_insurance": record.health_insurance,
                    "total_deductions": record.total_deductions,
                }

            analysis_data["monthly_earnings"] = [
                {"month": month, **data}
                for month, data in sorted(employee_trends.items())
            ]

            # 비교 통계 (같은 부서, 같은 직급 평균과 비교)
            if records:
                employee_name = records[0].name
                employee_dept = records[0].department
                employee_pos = records[0].position

                # 같은 부서 평균
                dept_records = (
                    session.query(Payroll)
                    .join(Employee, Payroll.employee_id == Employee.employee_id)
                    .filter(
                        Payroll.payment_period_start >= start_date_obj,
                        Payroll.payment_period_end <= end_date_obj,
                        Payroll.status.in_(["confirmed", "paid"]),
                        Employee.department == employee_dept,
                        Employee.employee_id != target_id,  # 본인 제외
                    )
                    .all()
                )

                dept_avg_gross = (
                    sum(r.gross_pay for r in dept_records) / len(dept_records)
                    if dept_records
                    else 0
                )
                dept_avg_net = (
                    sum(r.net_pay for r in dept_records) / len(dept_records)
                    if dept_records
                    else 0
                )

                # 같은 직급 평균
                pos_records = (
                    session.query(Payroll)
                    .join(Employee, Payroll.employee_id == Employee.employee_id)
                    .filter(
                        Payroll.payment_period_start >= start_date_obj,
                        Payroll.payment_period_end <= end_date_obj,
                        Payroll.status.in_(["confirmed", "paid"]),
                        Employee.position == employee_pos,
                        Employee.employee_id != target_id,  # 본인 제외
                    )
                    .all()
                )

                pos_avg_gross = (
                    sum(r.gross_pay for r in pos_records) / len(pos_records)
                    if pos_records
                    else 0
                )
                pos_avg_net = (
                    sum(r.net_pay for r in pos_records) / len(pos_records)
                    if pos_records
                    else 0
                )

                # 개인 평균
                employee_avg_gross = sum(r.gross_pay for r in records) / len(records)
                employee_avg_net = sum(r.net_pay for r in records) / len(records)

                analysis_data["comparison"] = {
                    "employee_name": employee_name,
                    "employee_dept": employee_dept,
                    "employee_pos": employee_pos,
                    "employee_avg_gross": round(employee_avg_gross),
                    "employee_avg_net": round(employee_avg_net),
                    "dept_avg_gross": round(dept_avg_gross),
                    "dept_avg_net": round(dept_avg_net),
                    "pos_avg_gross": round(pos_avg_gross),
                    "pos_avg_net": round(pos_avg_net),
                    "dept_diff_pct": (
                        round((employee_avg_gross / dept_avg_gross - 1) * 100, 1)
                        if dept_avg_gross
                        else 0
                    ),
                    "pos_diff_pct": (
                        round((employee_avg_gross / pos_avg_gross - 1) * 100, 1)
                        if pos_avg_gross
                        else 0
                    ),
                }

        # LLM 모델 호출 시뮬레이션 (실제로는 외부 LLM API 호출)
        insights = simulate_llm_insights(analysis_type, analysis_data)

        return jsonify(
            {
                "status": "success",
                "analysis_data": analysis_data,
                "insights": insights,
                "metadata": {
                    "period": {"start": start_date, "end": end_date},
                    "analysis_type": analysis_type,
                    "target_id": target_id,
                },
            }
        )
    except Exception as e:
        return (
            jsonify({"error": f"급여 인사이트 분석 중 오류가 발생했습니다: {str(e)}"}),
            500,
        )
    finally:
        session.close()


# LLM 모델 호출 시뮬레이션 함수
def simulate_llm_insights(analysis_type, data):
    """LLM 호출을 시뮬레이션하는 함수"""
    insights = {"summary": "이 분석은 시뮬레이션된 LLM 응답입니다.", "key_points": []}

    if analysis_type == "overall":
        insights["summary"] = (
            "전체 급여 데이터 분석 결과, 월별 평균 급여는 점진적으로 증가하는 추세를 보이고 있습니다. 부서별로는 개발팀이 가장 높은 평균 급여를 받고 있으며, 인사팀이 가장 낮은 평균 급여를 받고 있습니다."
        )
        insights["key_points"] = [
            "전체 직원의 월 평균 급여는 3,200,000원입니다.",
            "개발팀의 평균 급여가 다른 부서보다 15% 높게 나타났습니다.",
            "초과근무수당은 전체 급여의 약 8%를 차지합니다.",
            "최근 3개월간 평균 급여가 5% 상승했습니다.",
        ]

    elif analysis_type == "department":
        insights["summary"] = (
            f'{data.get("department_stats", {}).get("name", "선택한 부서")}의 급여 분석 결과, 대리 직급의 초과근무가 가장 많은 것으로 나타났습니다. 부장급 이상은 기본급 비중이 높고, 사원급은 각종 수당 비중이 상대적으로 높습니다.'
        )
        insights["key_points"] = [
            f"이 부서의 평균 급여는 회사 전체 평균보다 3% 높습니다.",
            "대리 직급의 초과근무 수당이 가장 많습니다.",
            "부서 내 직급별 급여 격차는 평균 수준입니다.",
            "최근 6개월간 부서 전체 급여 총액은 안정적으로 유지되고 있습니다.",
        ]

    elif analysis_type == "employee":
        employee_name = data.get("comparison", {}).get("employee_name", "해당 직원")
        dept_diff_pct = data.get("comparison", {}).get("dept_diff_pct", 0)
        pos_diff_pct = data.get("comparison", {}).get("pos_diff_pct", 0)

        insights["summary"] = (
            f"{employee_name}의 급여 분석 결과, 같은 부서 평균과 비교하여 {dept_diff_pct}%, 같은 직급 평균과 비교하여 {pos_diff_pct}% 차이가 있습니다. 월별 급여 추이는 상대적으로 안정적입니다."
        )
        insights["key_points"] = [
            f'초과근무수당이 부서 평균보다 {"높습니다" if dept_diff_pct > 0 else "낮습니다"}.',
            f'동일 직급 대비 총 수령액은 {abs(pos_diff_pct)}% {"높습니다" if pos_diff_pct > 0 else "낮습니다"}.',
            "최근 3개월간 급여 변동폭은 5% 이내로 안정적입니다.",
            "공제액 비율은 평균 수준입니다.",
        ]

    return insights


# 새로 추가: 애플리케이션 초기화 함수
def init_application():
    """애플리케이션 시작 시 초기화 작업 수행"""
    try:
        # 데이터베이스 초기화
        init_db()
        print("데이터베이스 테이블이 초기화되었습니다.")
    except Exception as e:
        print(f"데이터베이스 초기화 오류: {e}")


# 애플리케이션 시작 시 초기화 수행
init_application()

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
