from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import pandas as pd
import os
import json
import logging
from datetime import datetime
import sys
from flask_socketio import SocketIO, emit
import threading

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# 기존 모듈 임포트
from utils.pay_calculator import PayCalculator
from utils.insurance_calculator import InsuranceCalculator

# 새로 추가: 데이터베이스 연결 및 모델 임포트
from config.database import init_db, get_db_session
from models.models import (
    Employee,
    Attendance,
    Payroll,
    PayrollAudit,
    PayrollDocument,
    AttendanceAudit,
)

# 새로 추가: 급여 서비스 임포트
from app.services.payroll_service import PayrollService, FILE_CHANGED_EVENT
from config import Config

# PayrollService 객체 초기화
payroll_service = PayrollService(Config)

app = Flask(__name__)
CORS(
    app,
    resources={
        r"/api/*": {"origins": ["http://localhost:3001", "http://localhost:3000"]}
    },
)
# SocketIO 초기화
socketio = SocketIO(
    app,
    cors_allowed_origins=["http://localhost:3001", "http://localhost:3000"],
    async_mode="threading",  # 쓰레딩 모드 사용
    ping_timeout=30,  # 핑 타임아웃 시간 증가
    ping_interval=15,  # 핑 간격 조정
    logger=True,  # 로깅 활성화
    engineio_logger=True,  # Engine.IO 로깅 활성화
    always_connect=True,  # 항상 연결 시도
    max_http_buffer_size=10e6,  # 버퍼 크기 증가
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EMPLOYEES_CSV = os.path.join(BASE_DIR, "data", "employees.csv")
ATTENDANCE_CSV = os.path.join(BASE_DIR, "data", "attendance.csv")

# 급여 지급일 설정 (매월 25일로 가정)
PAYROLL_DAY = 25  # *** 급여 지급일 설정 (변경 시 이 값을 수정하세요) ***

# 새로 추가: 급여 명세서 저장 디렉토리 설정
PAYSLIPS_DIR = os.path.join(BASE_DIR, "data", "payslips")
os.makedirs(PAYSLIPS_DIR, exist_ok=True)

# WebSocket 연결 클라이언트 수
connected_clients = 0


# 파일 변경 감지 시 WebSocket 이벤트 발송 함수
def handle_file_change():
    """근태 파일 변경 시 WebSocket 이벤트 발송"""
    logger.info("근태 파일 변경 감지됨 - WebSocket 이벤트 발송")
    socketio.emit(
        "attendance_changed",
        {
            "message": "근태 데이터가 변경되었습니다. 최신 데이터로 갱신하세요.",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        },
    )


# 파일 변경 이벤트 감시 스레드
def watch_file_change_event():
    """파일 변경 이벤트를 감시하고 WebSocket 알림 전송"""
    logger.info("파일 변경 이벤트 감시 스레드 시작")
    while True:
        # 이벤트가 설정될 때까지 대기
        FILE_CHANGED_EVENT.wait()
        # 이벤트가 발생하면 WebSocket 메시지 발송
        handle_file_change()


# 서버 초기화 시 이벤트 감시 스레드 시작
file_watcher_thread = threading.Thread(
    target=watch_file_change_event, daemon=True, name="FileChangeEventWatcher"
)
file_watcher_thread.start()

# 변경 감지 핸들러 등록
payroll_service.register_change_handler(handle_file_change)


# Socket.IO 이벤트 핸들러
@socketio.on("connect")
def handle_connect():
    """클라이언트 연결 이벤트 처리"""
    global connected_clients
    connected_clients += 1
    logger.info(f"클라이언트 연결됨: 현재 {connected_clients}명 접속 중")


@socketio.on("disconnect")
def handle_disconnect():
    """클라이언트 연결 해제 이벤트 처리"""
    global connected_clients
    connected_clients -= 1
    logger.info(f"클라이언트 연결 해제: 현재 {connected_clients}명 접속 중")


@socketio.on("check_attendance_changes")
def handle_check_changes():
    """클라이언트의 근태 변경 확인 요청 처리"""
    try:
        is_changed = payroll_service.check_attendance_file_changed()
        if is_changed:
            # 변경 감지 시 데이터베이스 동기화
            payroll_service.sync_attendance_if_changed()
            # 요청한 클라이언트에게만 응답
            emit(
                "attendance_check_result",
                {
                    "changes_detected": True,
                    "message": "근태 데이터가 변경되었습니다. 최신 데이터로 갱신합니다.",
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                },
            )
        else:
            emit(
                "attendance_check_result",
                {
                    "changes_detected": False,
                    "message": "근태 데이터에 변경이 없습니다.",
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                },
            )
    except Exception as e:
        logger.error(f"근태 변경 확인 오류: {str(e)}")
        emit(
            "attendance_check_result",
            {
                "error": True,
                "message": f"근태 변경 확인 중 오류 발생: {str(e)}",
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            },
        )


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
                        "remarks": record.remarks or "",
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

        # CSV 파일 존재하고 데이터베이스가 비어있는 경우 자동으로 동기화 시도
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
        # 비고 필드가 없으면 빈 문자열로 설정
        if "remarks" not in df.columns:
            df["remarks"] = ""
        else:
            df["remarks"] = df["remarks"].fillna("").astype(str).str.strip()

        data = df.to_dict("records")

        # 데이터베이스에 데이터가 없었던 경우 CSV 데이터를 자동으로 동기화
        print("데이터베이스가 비어있어 CSV 데이터를 자동으로 동기화합니다...")
        try:
            _sync_attendance_to_db(data)
            print("CSV 데이터가 데이터베이스에 성공적으로 동기화되었습니다.")
        except Exception as e:
            print(f"자동 동기화 실패: {e}")

        print(f"Loaded {len(df)} attendance records from CSV")
        return data
    except Exception as e:
        print(f"Error loading attendance: {e}")
        return []


# 새로 추가: 근태 데이터를 데이터베이스에 동기화하는 내부 함수
def _sync_attendance_to_db(attendance_data):
    """
    근태 데이터를 데이터베이스에 동기화하는 내부 함수
    """
    if not attendance_data:
        return 0

    session = get_db_session()
    try:
        # 모든 기존 데이터 삭제
        deleted_count = session.query(Attendance).delete()
        print(f"{deleted_count}개의 기존 근태 기록이 삭제되었습니다.")

        # 새 데이터 추가
        records_added = 0
        for record in attendance_data:
            try:
                # 날짜 문자열을 date 객체로 변환
                if isinstance(record["date"], str):
                    date_obj = datetime.strptime(record["date"], "%Y-%m-%d").date()
                else:
                    date_obj = record["date"]

                # 새 근태 기록 생성
                attendance = Attendance(
                    employee_id=record["employee_id"],
                    date=date_obj,
                    check_in=record.get("check_in", ""),
                    check_out=record.get("check_out", ""),
                    attendance_type=record.get("attendance_type", "정상"),
                    remarks=record.get("remarks", ""),
                )
                session.add(attendance)
                records_added += 1
            except Exception as e:
                print(
                    f"근태 기록 추가 오류 ({record['employee_id']}, {record['date']}): {e}"
                )
                continue

        # 변경사항 커밋
        session.commit()
        print(f"{records_added}개의 근태 기록이 DB에 성공적으로 추가되었습니다.")
        return records_added
    except Exception as e:
        session.rollback()
        print(f"근태 데이터 동기화 오류: {e}")
        raise
    finally:
        session.close()


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

    요청된 직원 ID, 시작 및 종료일에 대한 급여를 계산합니다.
    근태 기록의 변경 여부를 확인하고 필요한 경우 동기화합니다.
    진행 상황을 클라이언트에 전달하는 기능을 추가합니다.
    """
    try:
        # 요청 데이터 처리
        data = request.json
        employee_ids = data.get("employee_ids", [])
        start_date_str = data.get("start_date")
        end_date_str = data.get("end_date")
        force_recalculate = data.get("force_recalculate", False)

        # 시작일과 종료일 필요
        if not start_date_str or not end_date_str:
            return (
                jsonify({"error": "시작일과 종료일이 필요합니다."}),
                400,
            )

        # 직원 ID가 없으면 모든 직원 선택
        if not employee_ids:
            session = get_db_session()
            try:
                employees = session.query(Employee).all()
                employee_ids = [e.id for e in employees]
            finally:
                session.close()

        # 근태 데이터 파일 변경 확인 및 동기화
        try:
            file_changed = payroll_service.sync_attendance_if_changed()
            if file_changed:
                print(
                    "근태 데이터 파일 변경이 감지되어 데이터베이스와 동기화되었습니다."
                )
                force_recalculate = True
        except Exception as sync_error:
            print(f"근태 데이터 동기화 중 오류 발생: {sync_error}")
            # 오류가 발생해도 계속 진행

        # 요청에 포함된 근태 데이터가 있으면 동기화
        attendance_data = data.get("attendance_data")
        if attendance_data:
            try:
                payroll_service.sync_attendance_data(attendance_data)
                force_recalculate = True
            except Exception as sync_error:
                print(f"근태 데이터 동기화 중 오류 발생: {sync_error}")

        # 클라이언트에게 진행 상황을 전달하기 위한 함수 정의
        def generate_progress():
            total_steps = len(employee_ids)

            # 초기 진행 상태 전송
            yield json.dumps(
                {
                    "status": "progress",
                    "message": "급여 계산을 시작합니다...",
                    "progress": 0,
                    "total": total_steps,
                }
            ) + "\n"

            # 날짜 변환
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()

            # 각 직원별로 급여 계산
            results = []
            for i, employee_id in enumerate(employee_ids):
                # 진행 상황 메시지 전송
                current_progress = int((i / total_steps) * 100)
                yield json.dumps(
                    {
                        "status": "progress",
                        "message": f"직원 ID {employee_id}의 급여를 계산 중...",
                        "progress": current_progress,
                        "total": 100,
                        "employee_id": employee_id,
                    }
                ) + "\n"

                try:
                    # 급여 계산 및 저장
                    payroll_data = payroll_service.calculate_and_save_payroll(
                        employee_id, start_date, end_date, force_recalculate
                    )

                    if payroll_data:
                        # 계산 로그 추출
                        calculation_logs = payroll_data.pop("calculation_logs", [])

                        # 계산 로그 전송
                        if calculation_logs:
                            yield json.dumps(
                                {
                                    "status": "calculation_logs",
                                    "employee_id": employee_id,
                                    "logs": calculation_logs,
                                }
                            ) + "\n"

                        results.append(payroll_data)
                    else:
                        print(
                            f"직원 ID {employee_id}에 대한 급여 계산 결과가 없습니다."
                        )
                except Exception as e:
                    print(f"직원 ID {employee_id}의 급여 계산 중 오류 발생: {e}")
                    # 오류가 발생해도 다른 직원 계산 계속 진행
                    yield json.dumps(
                        {
                            "status": "error",
                            "message": f"직원 ID {employee_id}의 급여 계산 중 오류 발생: {str(e)}",
                            "employee_id": employee_id,
                        }
                    ) + "\n"

            # 최종 결과 전송
            yield json.dumps(
                {
                    "status": "complete",
                    "message": f"{len(results)}명의 직원에 대한 급여 계산이 완료되었습니다.",
                    "data": results,
                    "progress": 100,
                    "total": 100,
                }
            )

        # 스트리밍 응답으로 진행 상황 전달
        return Response(generate_progress(), mimetype="application/json")

    except Exception as e:
        return jsonify({"error": f"급여 계산 중 오류 발생: {str(e)}"}), 500


# 새로 추가: 급여 확정 API 엔드포인트 (날짜 처리 수정)
@app.route("/api/payroll/confirm", methods=["PUT"])
def confirm_payroll():
    data = request.json
    payroll_ids = data.get("payroll_ids", [])
    payroll_data = data.get("payroll_data", [])
    payment_period = data.get("payment_period", {})
    remarks = data.get("remarks", "")
    payroll_type = data.get("payroll_type", "regular")  # 급여 유형 (기본값: 정기급여)
    user_id = request.headers.get("X-User-ID", "system")

    # payment_period에 필수 키가 있는지 확인하고 없으면 기본값 제공
    if "start" not in payment_period:
        # 첫 번째 급여 데이터에서 시작일을 가져오거나 현재 달의 1일을 기본값으로 사용
        if payroll_data and "payment_period_start" in payroll_data[0]:
            payment_period["start"] = payroll_data[0]["payment_period_start"]
        else:
            payment_period["start"] = datetime.now().replace(day=1).strftime("%Y-%m-%d")

    if "end" not in payment_period:
        # 첫 번째 급여 데이터에서 종료일을 가져오거나 다음 달의 마지막 날을 기본값으로 사용
        if payroll_data and "payment_period_end" in payroll_data[0]:
            payment_period["end"] = payroll_data[0]["payment_period_end"]
        else:
            # 현재 달의 마지막 날
            import calendar

            now = datetime.now()
            last_day = calendar.monthrange(now.year, now.month)[1]
            payment_period["end"] = now.replace(day=last_day).strftime("%Y-%m-%d")

    # 급여 유형 검증
    if payroll_type not in ["regular", "special"]:
        return (
            jsonify({"error": "급여 유형은 'regular' 또는 'special'이어야 합니다."}),
            400,
        )

    # payroll_service를 사용하여 급여 확정
    try:
        confirmed_payrolls = payroll_service.confirm_payroll(
            payroll_data, payment_period, user_id, payroll_type
        )

        return jsonify(
            {
                "status": "success",
                "message": f"{len(confirmed_payrolls)}건의 급여가 확정되었습니다.",
                "confirmed_payrolls": confirmed_payrolls,
            }
        )
    except ValueError as ve:
        # 중복 기간 오류 등 검증 오류
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"급여 확정 중 오류가 발생했습니다: {str(e)}"}), 500


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

    print(
        f"급여 기록 요청: employee_id={employee_id}, status={status}, start_date={start_date}, end_date={end_date}"
    )

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
        print(f"급여 기록 조회 결과: {len(payrolls)}건")

        # 직원 정보 조회를 위한 ID 목록
        employee_ids = [p.employee_id for p in payrolls]
        employee_records = (
            session.query(Employee).filter(Employee.employee_id.in_(employee_ids)).all()
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

            # 결과 데이터 구성
            result = {
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
                    payroll.confirmed_at.isoformat() if payroll.confirmed_at else None
                ),
                "confirmed_by": payroll.confirmed_by,
                "payment_method": payroll.payment_method,
                "remarks": payroll.remarks,
            }

            results.append(result)

        print(f"응답 데이터 구성 완료: {len(results)}건")
        if results:
            print(
                f"첫 번째 급여 데이터 샘플: {results[0]['payroll_id']}, {results[0]['employee_name']}, {results[0]['payment_date']}"
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


# 새로 추가: 근태 파일 변경 확인 API
@app.route("/api/attendance/check-changes", methods=["GET"])
def check_attendance_changes():
    """
    근태 파일 변경 여부를 확인하는 API

    근태 파일(attendance.csv)이 변경되었는지 확인하고,
    변경되었으면 변경 여부와 마지막 수정 시간을 반환합니다.
    """
    try:
        # 변경 여부 확인
        is_changed = payroll_service.check_attendance_file_changed()

        # 마지막 수정 시간 가져오기
        last_modified = datetime.fromtimestamp(
            payroll_service.attendance_file_last_modified
        ).strftime("%Y-%m-%d %H:%M:%S")

        return jsonify(
            {
                "changes_detected": is_changed,
                "last_modified": last_modified,
                "message": (
                    "근태 파일이 변경되었습니다. 급여 데이터가 재계산됩니다."
                    if is_changed
                    else "변경 사항이 없습니다."
                ),
            }
        )
    except Exception as e:
        return jsonify({"error": f"근태 파일 변경 확인 중 오류 발생: {str(e)}"}), 500


# 새로 추가: 근태 파일 수동 동기화 API
@app.route("/api/attendance/sync-file", methods=["POST"])
def sync_attendance_file():
    """
    근태 파일을 데이터베이스와 수동으로 동기화하는 API

    강제로 근태 파일(attendance.csv)을 데이터베이스와 동기화합니다.
    """
    try:
        # 동기화 시도 (강제 실행)
        sync_result = (
            payroll_service.sync_attendance_if_changed()
            or payroll_service.sync_attendance_if_changed()
        )

        if sync_result:
            return jsonify(
                {
                    "status": "success",
                    "message": "근태 파일이 데이터베이스와 성공적으로 동기화되었습니다.",
                    "last_modified": datetime.fromtimestamp(
                        payroll_service.attendance_file_last_modified
                    ).strftime("%Y-%m-%d %H:%M:%S"),
                }
            )
        else:
            return jsonify(
                {
                    "status": "warning",
                    "message": "근태 파일에 변경 사항이 없거나 동기화할 데이터가 없습니다.",
                    "last_modified": datetime.fromtimestamp(
                        payroll_service.attendance_file_last_modified
                    ).strftime("%Y-%m-%d %H:%M:%S"),
                }
            )
    except Exception as e:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": f"근태 파일 동기화 중 오류 발생: {str(e)}",
                }
            ),
            500,
        )


# CSV 파일과 데이터베이스 동기화 엔드포인트
@app.route("/api/attendance/sync-csv", methods=["POST"])
def sync_attendance_csv():
    """
    CSV 파일의 근태 데이터를 데이터베이스에 동기화하는 API

    수동으로 CSV 파일을 변경한 후 데이터베이스와 동기화하고자 할 때 사용
    """
    try:
        # CSV 파일 존재 확인
        if not os.path.exists(ATTENDANCE_CSV):
            return (
                jsonify({"error": f"{ATTENDANCE_CSV} 파일이 존재하지 않습니다."}),
                404,
            )

        # CSV 파일 로드
        df = pd.read_csv(
            ATTENDANCE_CSV, encoding="utf-8", delimiter=",", on_bad_lines="warn"
        )

        # 데이터 전처리
        df["check_in"] = df["check_in"].fillna("").astype(str).str.strip()
        df["check_out"] = df["check_out"].fillna("").astype(str).str.strip()
        df["attendance_type"] = (
            df["attendance_type"].fillna("정상").astype(str).str.strip()
        )
        df["date"] = df["date"].fillna("").astype(str).str.strip()
        if "remarks" not in df.columns:
            df["remarks"] = ""
        else:
            df["remarks"] = df["remarks"].fillna("").astype(str).str.strip()

        # 데이터베이스 세션 시작
        session = get_db_session()

        try:
            # 모든 근태 기록을 일단 삭제 (완전히 초기화)
            deleted_count = session.query(Attendance).delete()
            print(f"{deleted_count}개의 기존 근태 기록이 삭제되었습니다.")

            # CSV 데이터 삽입
            records_added = 0
            for _, row in df.iterrows():
                try:
                    # 날짜 문자열을 date 객체로 변환
                    date_obj = datetime.strptime(row["date"], "%Y-%m-%d").date()

                    # 새 근태 기록 생성
                    attendance = Attendance(
                        employee_id=row["employee_id"],
                        date=date_obj,
                        check_in=row["check_in"],
                        check_out=row["check_out"],
                        attendance_type=row["attendance_type"],
                        remarks=row.get("remarks", ""),
                    )
                    session.add(attendance)
                    records_added += 1
                except Exception as e:
                    print(
                        f"근태 기록 추가 오류 ({row['employee_id']}, {row['date']}): {e}"
                    )
                    continue

            # 변경사항 커밋
            session.commit()
            print(
                f"CSV에서 {records_added}개의 근태 기록이 DB에 성공적으로 추가되었습니다."
            )

            # 변경된 데이터가 있으면 CSV 파일도 업데이트
            total_changes = records_added
            if total_changes > 0:
                try:
                    print("\n근태 기록 변경 후 CSV 파일 자동 동기화 시작...")

                    # 새로 추가: sync_attendance_db_to_csv 함수 사용
                    # 현재 디렉토리 경로 추가
                    script_dir = os.path.dirname(os.path.abspath(__file__))
                    if script_dir not in sys.path:
                        sys.path.append(script_dir)

                    # sync_attendance_db_to_csv 함수 임포트
                    from sync_attendance_db_to_csv import sync_db_to_csv

                    # 데이터베이스 내용을 CSV 파일로 동기화
                    sync_result = sync_db_to_csv()

                    if sync_result:
                        print("근태 기록 변경과 CSV 파일 동기화가 모두 완료되었습니다.")
                    else:
                        # 동기화 실패 시 기존 방식으로 백업
                        print("동기화 실패, 기존 방식으로 CSV 파일 업데이트 시도...")

                        # 모든 근태 데이터 조회
                        all_attendance = session.query(Attendance).all()

                        # 데이터프레임으로 변환
                        attendance_data = []
                        for record in all_attendance:
                            attendance_data.append(
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
                                    "remarks": record.remarks or "",
                                }
                            )

                        # 데이터프레임 생성 및 CSV 파일로 저장
                        df = pd.DataFrame(attendance_data)
                        df.to_csv(
                            ATTENDANCE_CSV, index=False, encoding="euc-kr"
                        )  # 인코딩을 euc-kr로 변경
                        print(
                            f"기존 방식으로 CSV 파일이 업데이트되었습니다: {ATTENDANCE_CSV}"
                        )

                    # 파일 수정 시간 갱신
                    payroll_service.attendance_file_last_modified = (
                        payroll_service._get_attendance_file_modified_time()
                    )

                except Exception as csv_error:
                    print(f"근태 CSV 파일 업데이트 중 오류 발생: {csv_error}")
                    # CSV 오류는 API 응답에 영향을 주지 않음

            return jsonify(
                {
                    "status": "success",
                    "message": f"CSV 파일에서 {records_added}개의 근태 기록이 DB에 동기화되었습니다.",
                    "records_added": records_added,
                    "previous_records_deleted": deleted_count,
                }
            )

        except Exception as e:
            session.rollback()
            return (
                jsonify({"error": f"데이터베이스 동기화 중 오류 발생: {str(e)}"}),
                500,
            )
        finally:
            session.close()

    except Exception as e:
        return jsonify({"error": f"CSV 파일 처리 중 오류 발생: {str(e)}"}), 500


# 근태 데이터 업데이트 API 엔드포인트
@app.route("/api/attendance/update", methods=["POST"])
def update_attendance():
    """
    근태 데이터 업데이트 API

    frontend에서 수정된 근태 데이터를 받아 데이터베이스에 반영합니다.
    변경된 내용만 선택적으로 업데이트하고, 변경 이력을 기록합니다.
    데이터베이스 업데이트 후 CSV 파일도 자동으로 동기화합니다.
    """
    try:
        data = request.json
        updated_records = data.get("attendance_data", [])
        user_id = data.get("user_id", "시스템")  # 변경한 사용자 ID

        # 클라이언트 IP 주소 가져오기
        ip_address = request.remote_addr

        if not updated_records:
            return (
                jsonify({"error": "업데이트할 근태 데이터가 제공되지 않았습니다."}),
                400,
            )

        session = get_db_session()

        try:
            updated_count = 0
            created_count = 0
            audit_records = []  # 변경 이력 저장용

            for record in updated_records:
                employee_id = record.get("employee_id")
                date_str = record.get("date")

                if not employee_id or not date_str:
                    continue

                # 날짜 문자열을 date 객체로 변환
                try:
                    date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
                except ValueError:
                    print(f"날짜 형식 오류: {date_str}")
                    continue

                # 해당 직원과 날짜에 맞는 근태 기록 조회
                attendance = (
                    session.query(Attendance)
                    .filter(
                        Attendance.employee_id == employee_id,
                        Attendance.date == date_obj,
                    )
                    .first()
                )

                if attendance:
                    # 기존 기록이 있으면 선택적으로 업데이트
                    # 각 필드별로 변경 여부 확인 후 변경된 필드만 업데이트 및 기록
                    if (
                        "check_in" in record
                        and attendance.check_in != record["check_in"]
                    ):
                        # 변경 이력 기록
                        audit_records.append(
                            AttendanceAudit(
                                employee_id=employee_id,
                                date=date_obj,
                                field_name="check_in",
                                old_value=attendance.check_in,
                                new_value=record["check_in"],
                                change_type="update",
                                changed_by=user_id,
                                ip_address=ip_address,
                            )
                        )
                        # 데이터 업데이트
                        attendance.check_in = record["check_in"]

                    if (
                        "check_out" in record
                        and attendance.check_out != record["check_out"]
                    ):
                        # 변경 이력 기록
                        audit_records.append(
                            AttendanceAudit(
                                employee_id=employee_id,
                                date=date_obj,
                                field_name="check_out",
                                old_value=attendance.check_out,
                                new_value=record["check_out"],
                                change_type="update",
                                changed_by=user_id,
                                ip_address=ip_address,
                            )
                        )
                        # 데이터 업데이트
                        attendance.check_out = record["check_out"]

                    if (
                        "attendance_type" in record
                        and attendance.attendance_type != record["attendance_type"]
                    ):
                        # 변경 이력 기록
                        audit_records.append(
                            AttendanceAudit(
                                employee_id=employee_id,
                                date=date_obj,
                                field_name="attendance_type",
                                old_value=attendance.attendance_type,
                                new_value=record["attendance_type"],
                                change_type="update",
                                changed_by=user_id,
                                ip_address=ip_address,
                            )
                        )
                        # 데이터 업데이트
                        attendance.attendance_type = record["attendance_type"]

                    if "remarks" in record and attendance.remarks != record["remarks"]:
                        # 변경 이력 기록
                        audit_records.append(
                            AttendanceAudit(
                                employee_id=employee_id,
                                date=date_obj,
                                field_name="remarks",
                                old_value=attendance.remarks,
                                new_value=record["remarks"],
                                change_type="update",
                                changed_by=user_id,
                                ip_address=ip_address,
                            )
                        )
                        # 데이터 업데이트
                        attendance.remarks = record["remarks"]

                    updated_count += 1
                else:
                    # 기존 기록이 없으면 새로 생성
                    new_attendance = Attendance(
                        employee_id=employee_id,
                        date=date_obj,
                        check_in=record.get("check_in", ""),
                        check_out=record.get("check_out", ""),
                        attendance_type=record.get("attendance_type", "정상"),
                        remarks=record.get("remarks", ""),
                    )
                    session.add(new_attendance)

                    # 변경 이력 기록
                    audit_records.append(
                        AttendanceAudit(
                            employee_id=employee_id,
                            date=date_obj,
                            field_name="record",
                            old_value="",
                            new_value="신규 생성",
                            change_type="create",
                            changed_by=user_id,
                            ip_address=ip_address,
                        )
                    )

                    created_count += 1

            # 변경 이력 저장
            if audit_records:
                session.add_all(audit_records)

            # 데이터베이스 커밋
            session.commit()

            # 변경된 데이터가 있으면 CSV 파일도 업데이트
            total_changes = updated_count + created_count
            if total_changes > 0:
                try:
                    # 현재 파일의 디렉토리 경로 추가
                    script_dir = os.path.dirname(os.path.abspath(__file__))
                    if script_dir not in sys.path:
                        sys.path.append(script_dir)

                    # 자동 동기화 함수 임포트 및 실행
                    print("\n근태 기록 변경 후 CSV 파일 자동 동기화 시작...")

                    # 파일 시스템 경로가 아닌 모듈 경로로 임포트
                    from sync_attendance_db_to_csv import sync_db_to_csv

                    sync_result = sync_db_to_csv()

                    if sync_result:
                        print("근태 기록 변경과 CSV 파일 동기화가 모두 완료되었습니다.")
                    else:
                        print("CSV 파일 동기화 실패: 백업 방법 시도")

                        # CSV 동기화 실패 시 기존 방식으로도 시도
                        all_attendance = session.query(Attendance).all()
                        attendance_data = []

                        for record in all_attendance:
                            attendance_data.append(
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
                                    "remarks": record.remarks or "",
                                }
                            )

                        # CSV 파일 저장 - euc-kr 인코딩 사용
                        import csv

                        with open(
                            ATTENDANCE_CSV, "w", newline="", encoding="euc-kr"
                        ) as f:
                            writer = csv.DictWriter(
                                f,
                                fieldnames=[
                                    "employee_id",
                                    "date",
                                    "check_in",
                                    "check_out",
                                    "attendance_type",
                                    "remarks",
                                ],
                            )
                            writer.writeheader()
                            writer.writerows(attendance_data)

                    # 파일 수정 시간 갱신
                    payroll_service.attendance_file_last_modified = (
                        payroll_service._get_attendance_file_modified_time()
                    )
                except Exception as csv_error:
                    print(f"근태 CSV 파일 업데이트 중 오류 발생: {str(csv_error)}")
                    # CSV 오류는 API 응답에 영향을 주지 않음

            return jsonify(
                {
                    "status": "success",
                    "message": f"{updated_count}개의 근태 기록이 업데이트되고, {created_count}개의 기록이 새로 생성되었습니다.",
                    "updated_count": updated_count,
                    "created_count": created_count,
                    "audit_count": len(audit_records),
                    "csv_sync": "success",
                }
            )

        except Exception as e:
            session.rollback()
            return (
                jsonify({"error": f"근태 데이터 업데이트 중 오류 발생: {str(e)}"}),
                500,
            )
        finally:
            session.close()

    except Exception as e:
        return jsonify({"error": f"요청 처리 중 오류 발생: {str(e)}"}), 500


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

            results.append(
                {
                    "employee_id": employee.employee_id,
                    "name": employee.name,
                    "file_path": file_path,
                    "sent": True,
                }
            )

        session.commit()
        return jsonify(
            {
                "status": "success",
                "message": f"{len(results)}개의 급여명세서가 생성되었습니다.",
                "results": results,
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

    새로운 요청 형식:
    {
        "query": "자연어 질의 (예: '부서별 평균 급여가 얼마인가요?')",
        "payrollData": [급여 데이터 객체들],
        "employeeData": [직원 데이터 객체들],
        "metadata": {
            "recordCount": 123,
            "employeeCount": 45,
            "searchContext": {}
        }
    }
    """
    print("급여 인사이트 API 요청 받음")
    data = request.json

    # 자연어 질의 처리
    query = data.get("query")
    payroll_data = data.get("payrollData", [])
    employee_data = data.get("employeeData", [])

    if not query:
        return jsonify({"error": "질의가 제공되지 않았습니다."}), 400

    if not payroll_data:
        return jsonify({"error": "분석할 급여 데이터가 없습니다."}), 400

    try:
        print(f"급여 데이터 분석 시작: '{query}', 데이터 {len(payroll_data)}건")

        # LLM을 사용한 분석 실행
        # 실제 LLM 연동 대신 샘플 응답을 제공
        analysis_result = simulate_llm_insights(
            "natural_language",
            {
                "query": query,
                "payroll_data": payroll_data,
                "employee_data": employee_data,
            },
        )

        # 응답 반환
        return jsonify(
            {
                "query": query,
                "analysis": analysis_result["analysis"],
                "data": analysis_result.get("data", []),
                "metadata": {
                    "recordCount": len(payroll_data),
                    "analysisType": "natural_language",
                },
            }
        )

    except Exception as e:
        print(f"급여 인사이트 API 오류: {str(e)}")
        return (
            jsonify({"error": f"급여 데이터 분석 중 오류가 발생했습니다: {str(e)}"}),
            500,
        )


# LLM 모델 호출 시뮬레이션 함수
def simulate_llm_insights(analysis_type, data):
    """LLM 호출을 시뮬레이션하는 함수"""
    insights = {"summary": "이 분석은 시뮬레이션된 LLM 응답입니다.", "key_points": []}

    if analysis_type == "natural_language":
        query = data.get("query", "")
        payroll_data = data.get("payroll_data", [])

        # 부서별 평균 급여 질의 패턴
        if (
            "부서별" in query
            and "평균" in query
            and ("급여" in query or "임금" in query)
        ):
            return {
                "analysis": (
                    "부서별 평균 급여 분석 결과입니다:\n\n"
                    "- 개발팀: 평균 4,200,000원\n"
                    "- 영업팀: 평균 3,800,000원\n"
                    "- 재무팀: 평균 3,600,000원\n"
                    "- 인사팀: 평균 3,400,000원\n\n"
                    "개발팀의 평균 급여가 가장 높고, 인사팀이 가장 낮습니다. "
                    "전체 부서 평균 급여는 3,750,000원입니다."
                ),
                "data": [
                    {"department": "개발팀", "avg_salary": 4200000},
                    {"department": "영업팀", "avg_salary": 3800000},
                    {"department": "재무팀", "avg_salary": 3600000},
                    {"department": "인사팀", "avg_salary": 3400000},
                ],
            }

        # 직급별 평균 급여 질의 패턴
        elif (
            "직급별" in query
            and "평균" in query
            and ("급여" in query or "임금" in query)
        ):
            return {
                "analysis": (
                    "직급별 평균 급여 분석 결과입니다:\n\n"
                    "- 부장: 평균 5,500,000원\n"
                    "- 차장: 평균 4,700,000원\n"
                    "- 과장: 평균 4,100,000원\n"
                    "- 대리: 평균 3,500,000원\n"
                    "- 사원: 평균 2,800,000원\n\n"
                    "직급이 올라갈수록 평균 급여도 증가하는 추세이며, 부장과 사원의 평균 급여 차이는 약 96%입니다."
                ),
                "data": [
                    {"position": "부장", "avg_salary": 5500000},
                    {"position": "차장", "avg_salary": 4700000},
                    {"position": "과장", "avg_salary": 4100000},
                    {"position": "대리", "avg_salary": 3500000},
                    {"position": "사원", "avg_salary": 2800000},
                ],
            }

        # 수당 관련 질의 패턴
        elif "수당" in query and ("가장 많은" in query or "최고" in query):
            return {
                "analysis": (
                    "수당이 가장 많은 직원 분석 결과입니다:\n\n"
                    "1. 김개발 (개발팀): 820,000원\n"
                    "2. 박영업 (영업팀): 780,000원\n"
                    "3. 이재무 (재무팀): 720,000원\n\n"
                    "개발팀의 김개발 님이 가장 많은 수당을 받았으며, 주로 야간 근무와 휴일 근무에 따른 수당이 많았습니다."
                ),
                "data": [
                    {"name": "김개발", "department": "개발팀", "allowance": 820000},
                    {"name": "박영업", "department": "영업팀", "allowance": 780000},
                    {"name": "이재무", "department": "재무팀", "allowance": 720000},
                ],
            }

        # 공제액 관련 질의 패턴
        elif "공제" in query or "세금" in query:
            return {
                "analysis": (
                    "평균 공제액 분석 결과입니다:\n\n"
                    "전체 직원의 평균 공제액은 총 급여의 약 15.7%입니다.\n\n"
                    "구성:\n"
                    "- 소득세: 8.2%\n"
                    "- 국민연금: 4.5%\n"
                    "- 건강보험: 3.0%\n\n"
                    "급여가 높을수록 공제 비율이 증가하는 경향이 있습니다."
                ),
                "data": [
                    {"deduction_type": "소득세", "percentage": 8.2},
                    {"deduction_type": "국민연금", "percentage": 4.5},
                    {"deduction_type": "건강보험", "percentage": 3.0},
                ],
            }

        # 기본 응답
        else:
            return {
                "analysis": (
                    f"'{query}'에 대한 분석 결과입니다:\n\n"
                    "현재 데이터에 따르면, 전체 직원의 평균 급여는 3,750,000원이며, "
                    "부서별로는 개발팀이 가장 높은 평균 급여를 받고 있습니다.\n\n"
                    "최근 3개월간 급여 추이는 비교적 안정적이며, "
                    "초과근무수당은 전체 급여의 약 8%를 차지합니다."
                ),
                "data": [],
            }

    elif analysis_type == "overall":
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


# 새로 추가: 근태 변경 이력 조회 API
@app.route("/api/attendance/audit", methods=["GET"])
def get_attendance_audit():
    """
    근태 변경 이력 조회 API

    선택적 필터링 파라미터:
    - employee_id: 특정 직원의 변경 이력만 조회
    - from_date: 해당 일자 이후의 변경 이력만 조회 (형식: YYYY-MM-DD)
    - to_date: 해당 일자 이전의 변경 이력만 조회 (형식: YYYY-MM-DD)
    """
    try:
        # 요청 파라미터 처리
        employee_id = request.args.get("employee_id")
        from_date_str = request.args.get("from_date")
        to_date_str = request.args.get("to_date")

        # 날짜 변환
        from_date = None
        to_date = None

        if from_date_str:
            try:
                from_date = datetime.strptime(from_date_str, "%Y-%m-%d").date()
            except ValueError:
                return (
                    jsonify(
                        {
                            "error": "from_date 형식이 올바르지 않습니다. YYYY-MM-DD 형식이어야 합니다."
                        }
                    ),
                    400,
                )

        if to_date_str:
            try:
                to_date = datetime.strptime(to_date_str, "%Y-%m-%d").date()
            except ValueError:
                return (
                    jsonify(
                        {
                            "error": "to_date 형식이 올바르지 않습니다. YYYY-MM-DD 형식이어야 합니다."
                        }
                    ),
                    400,
                )

        # 데이터베이스 세션 시작
        session = get_db_session()

        try:
            # 기본 쿼리 생성
            query = session.query(AttendanceAudit)

            # 필터 적용
            if employee_id:
                query = query.filter(AttendanceAudit.employee_id == employee_id)

            if from_date:
                query = query.filter(AttendanceAudit.date >= from_date)

            if to_date:
                query = query.filter(AttendanceAudit.date <= to_date)

            # 변경 시간 기준 내림차순 정렬 (최신순)
            query = query.order_by(AttendanceAudit.changed_at.desc())

            # 결과 조회 (최대 500개로 제한)
            audit_records = query.limit(500).all()

            # 결과 변환
            result = []
            for record in audit_records:
                result.append(
                    {
                        "id": record.id,
                        "employee_id": record.employee_id,
                        "date": (
                            record.date.strftime("%Y-%m-%d")
                            if hasattr(record.date, "strftime")
                            else str(record.date)
                        ),
                        "field_name": record.field_name,
                        "old_value": record.old_value,
                        "new_value": record.new_value,
                        "change_type": record.change_type,
                        "changed_by": record.changed_by,
                        "changed_at": (
                            record.changed_at.isoformat()
                            if hasattr(record.changed_at, "isoformat")
                            else str(record.changed_at)
                        ),
                        "ip_address": record.ip_address,
                    }
                )

            return jsonify(
                {
                    "status": "success",
                    "audit_records": result,
                    "count": len(result),
                    "filters": {
                        "employee_id": employee_id,
                        "from_date": from_date_str,
                        "to_date": to_date_str,
                    },
                }
            )

        except Exception as e:
            return (
                jsonify(
                    {"error": f"근태 변경 이력 조회 중 오류가 발생했습니다: {str(e)}"}
                ),
                500,
            )
        finally:
            session.close()

    except Exception as e:
        return jsonify({"error": f"요청 처리 중 오류가 발생했습니다: {str(e)}"}), 500


# 새로운 initialize_app 함수 추가
def initialize_app():
    """애플리케이션 초기화 함수"""
    try:
        # 데이터베이스 초기화
        init_db()

        # 근태 파일 변경 확인 및 동기화
        if payroll_service.check_attendance_file_changed():
            logger.info(
                "서버 시작 시 근태 파일 변경이 감지되어 자동 동기화를 시도합니다."
            )
            payroll_service.sync_attendance_if_changed()
    except Exception as e:
        logger.error(f"서버 초기화 중 오류 발생: {str(e)}")


# 그리고 main 부분 수정
if __name__ == "__main__":
    try:
        # 서버 시작 전 필요한 디렉토리 생성
        os.makedirs(os.path.join(BASE_DIR, "logs"), exist_ok=True)
        os.makedirs(os.path.join(BASE_DIR, "data"), exist_ok=True)

        # 데이터베이스 초기화
        init_db()
        logger.info("데이터베이스 초기화 완료")

        # 애플리케이션 초기화 실행
        initialize_app()  # <-- 이 줄 추가

        # SocketIO를 통한 서버 실행
        logger.info("급여 계산 서버를 시작합니다...")
        socketio.run(app, host="0.0.0.0", port=5000, debug=True)
    except Exception as e:
        logger.error(f"서버 시작 오류: {str(e)}")
