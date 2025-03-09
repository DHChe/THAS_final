import pandas as pd
import logging
import os
import hashlib
import threading
import time
from datetime import datetime
from typing import Dict, List, Optional
import uuid
from sqlalchemy.orm import Session
from config.database import get_db_session
from models.models import (
    Payroll,
    PayrollAudit,
    PayrollDocument,
    Attendance,
    AttendanceAudit,
    Employee,
)
from utils.pay_calculator import PayCalculator
from utils.insurance_calculator import InsuranceCalculator
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# 파일 시스템 감시 기능 위한 이벤트
FILE_CHANGED_EVENT = threading.Event()


# 파일 시스템 이벤트 핸들러 정의
class AttendanceFileHandler(FileSystemEventHandler):
    def __init__(self, service):
        self.service = service

    def on_modified(self, event):
        if (
            not event.is_directory
            and event.src_path == self.service.attendance_file_path
        ):
            self.service.logger.info(f"파일 변경 감지: {event.src_path}")
            sync_result = self.service.sync_attendance_if_changed()
            if sync_result:
                self.service._notify_change_event()


class PayrollService:
    """급여 관리 서비스 클래스

    급여 계산, 수당 계산, 세금 계산 등 급여 관련 모든 비즈니스 로직을 처리합니다.
    """

    def __init__(self, config):
        """
        Args:
            config: 애플리케이션 설정 객체
        """
        self.config = config
        self.setup_logging()
        # 근태 파일 관련 변수 초기화
        self.attendance_file_path = os.path.join(
            os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            ),
            "data",
            "attendance.csv",
        )
        # 타임스탬프 및 해시값 초기화
        self.attendance_file_last_modified = self._get_attendance_file_modified_time()
        self.attendance_file_hash = self._calculate_file_hash()
        self.logger.info(
            f"근태 파일 초기화 - 수정 시간: {self.attendance_file_last_modified}, 해시: {self.attendance_file_hash}"
        )

        # 웹소켓 이벤트 핸들러 리스트
        self.change_event_handlers = []

        # Watchdog Observer 설정
        self.observer = None
        self.event_handler = None
        self.start_file_watcher()

    def setup_logging(self):
        """로깅 설정"""
        logging.basicConfig(
            filename=f'logs/payroll_{datetime.now().strftime("%Y%m")}.log',
            level=logging.INFO,
            format="%(asctime)s - %(message)s",
        )
        self.logger = logging.getLogger(__name__)

    def _get_attendance_file_modified_time(self) -> float:
        """근태 파일의 최근 수정 시간을 반환합니다."""
        try:
            if os.path.exists(self.attendance_file_path):
                return os.path.getmtime(self.attendance_file_path)
            return 0
        except Exception as e:
            self.logger.error(f"근태 파일 수정 시간 확인 오류: {str(e)}")
            return 0

    def _calculate_file_hash(self) -> str:
        """파일 내용의 해시값 계산하여 반환합니다."""
        try:
            if not os.path.exists(self.attendance_file_path):
                return ""

            with open(self.attendance_file_path, "rb") as f:
                return hashlib.md5(f.read()).hexdigest()
        except Exception as e:
            self.logger.error(f"파일 해시 계산 오류: {str(e)}")
            return ""

    def check_attendance_file_changed(self) -> bool:
        """근태 파일이 변경되었는지 확인합니다.

        내용 기반(해시값)과 타임스탬프 두 가지 방식으로 검사합니다.

        Returns:
            bool: 파일이 변경되었으면 True, 그렇지 않으면 False
        """
        # 현재 수정 시간 및 해시값 확인
        current_modified_time = self._get_attendance_file_modified_time()
        current_hash = self._calculate_file_hash()

        # 변경 여부 확인 (시간 또는 해시값 변경)
        time_changed = current_modified_time > self.attendance_file_last_modified
        content_changed = current_hash != self.attendance_file_hash

        if time_changed or content_changed:
            self.logger.info(
                f"근태 파일 변경 감지: 수정시간 변경={time_changed}, 내용 변경={content_changed}"
            )
            self.logger.info(
                f"이전 정보: 시간={self.attendance_file_last_modified}, 해시={self.attendance_file_hash}"
            )
            self.logger.info(
                f"현재 정보: 시간={current_modified_time}, 해시={current_hash}"
            )

            # 상태 업데이트
            self.attendance_file_last_modified = current_modified_time
            self.attendance_file_hash = current_hash
            return True

        return False

    def sync_attendance_if_changed(self) -> bool:
        """근태 파일이 변경되었는지 확인하고, 변경되었으면 데이터베이스를 동기화합니다.
        변경된 데이터만 선택적으로 업데이트하여 성능을 향상시킵니다.
        모든 변경 사항은 AttendanceAudit 모델에 기록됩니다.

        Returns:
            bool: 동기화 되었으면 True, 그렇지 않으면 False
        """
        # 파일 변경 확인 (해시값 비교)
        if not self.check_attendance_file_changed():
            return False

        self.logger.info("근태 파일 변경 감지: 데이터베이스 선택적 동기화 시작")
        try:
            # CSV 파일 데이터 로드
            csv_data = self._load_csv_data()
            if not csv_data:
                self.logger.warning("CSV 파일에서 로드된 데이터가 없습니다.")
                return False

            # 데이터베이스 데이터 로드
            db_data = self._load_db_attendance_data()

            # 변경된 기록 감지 및 업데이트
            updates, inserts, unchanged = self._detect_attendance_changes(
                csv_data, db_data
            )

            self.logger.info(
                f"변경 감지 결과: 업데이트={len(updates)}, 삽입={len(inserts)}, 변경없음={len(unchanged)}"
            )

            # 변경 사항이 없으면 종료
            if not updates and not inserts:
                self.logger.info("변경된 근태 기록이 없습니다.")
                return False

            # 변경 사항을 데이터베이스에 반영
            self._apply_attendance_changes(updates, inserts)

            return True

        except Exception as e:
            self.logger.error(f"근태 데이터 선택적 동기화 오류: {str(e)}")
            return False

    def _load_csv_data(self) -> List[Dict]:
        """CSV 파일에서 근태 데이터 로드"""
        try:
            if not os.path.exists(self.attendance_file_path):
                self.logger.error(
                    f"근태 파일이 존재하지 않습니다: {self.attendance_file_path}"
                )
                return []

            df = pd.read_csv(
                self.attendance_file_path, encoding="utf-8", on_bad_lines="warn"
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

            # 딕셔너리 리스트로 변환
            data = df.to_dict("records")
            self.logger.info(f"CSV 파일에서 {len(data)}개의 근태 기록을 로드했습니다.")
            return data

        except Exception as e:
            self.logger.error(f"CSV 파일 로드 오류: {str(e)}")
            return []

    def _load_db_attendance_data(self) -> Dict[str, Attendance]:
        """데이터베이스에서 근태 데이터 로드하여 매핑 딕셔너리 반환"""
        session = get_db_session()
        try:
            records = session.query(Attendance).all()
            # 키: {employee_id}_{date}, 값: Attendance 객체
            return {f"{r.employee_id}_{r.date}": r for r in records}
        except Exception as e:
            self.logger.error(f"DB 데이터 로드 오류: {str(e)}")
            return {}
        finally:
            session.close()

    def _detect_attendance_changes(self, csv_data, db_data_dict):
        """CSV 데이터와 DB 데이터를 비교하여 변경된 레코드 감지"""
        updates = []  # 업데이트할 레코드
        inserts = []  # 새로 추가할 레코드
        unchanged = []  # 변경 없는 레코드

        # CSV의 모든 레코드 처리
        for record in csv_data:
            try:
                # 필수 필드 확인
                if not record.get("employee_id") or not record.get("date"):
                    self.logger.warning(f"잘못된 근태 기록 무시: {record}")
                    continue

                # 날짜 형식 처리
                try:
                    date_str = record["date"]
                    date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
                except ValueError:
                    self.logger.error(f"날짜 형식 오류: {record['date']}")
                    continue

                # 기록 키 생성
                record_key = f"{record['employee_id']}_{date_obj}"

                # DB에 해당 기록이 있는지 확인
                if record_key in db_data_dict:
                    # 기존 레코드 추출
                    db_record = db_data_dict[record_key]

                    # 변경 사항이 있는지 확인
                    if (
                        record.get("check_in", "") != db_record.check_in
                        or record.get("check_out", "") != db_record.check_out
                        or record.get("attendance_type", "정상")
                        != db_record.attendance_type
                        or record.get("remarks", "") != db_record.remarks
                    ):

                        # 변경 감지 - 업데이트 필요
                        updates.append(
                            {
                                "db_record": db_record,
                                "csv_record": record,
                                "date_obj": date_obj,
                            }
                        )
                    else:
                        # 변경 없음
                        unchanged.append(record_key)
                else:
                    # DB에 없는 레코드 - 새로 추가
                    inserts.append({"csv_record": record, "date_obj": date_obj})
            except Exception as e:
                self.logger.error(f"레코드 변경 감지 오류: {str(e)}")
                continue

        return updates, inserts, unchanged

    def _apply_attendance_changes(self, updates, inserts):
        """데이터베이스에 변경 사항 적용"""
        session = get_db_session()
        try:
            # 감사 기록 생성을 위한 시간과 사용자 정보
            change_time = datetime.now()
            change_user = "system_sync"

            # 변경된 레코드 업데이트
            for update_info in updates:
                db_record = update_info["db_record"]
                csv_record = update_info["csv_record"]

                # 변경 전 값 저장
                old_check_in = db_record.check_in
                old_check_out = db_record.check_out
                old_type = db_record.attendance_type
                old_remarks = db_record.remarks

                # 변경 사항 적용
                db_record.check_in = csv_record.get("check_in", "")
                db_record.check_out = csv_record.get("check_out", "")
                db_record.attendance_type = csv_record.get("attendance_type", "정상")
                db_record.remarks = csv_record.get("remarks", "")

                # 감사 기록 추가 (변경된 필드만)
                if old_check_in != db_record.check_in:
                    session.add(
                        AttendanceAudit(
                            employee_id=db_record.employee_id,
                            date=db_record.date,
                            field_name="check_in",
                            old_value=old_check_in,
                            new_value=db_record.check_in,
                            change_type="update",
                            change_time=change_time,
                            change_user=change_user,
                        )
                    )

                if old_check_out != db_record.check_out:
                    session.add(
                        AttendanceAudit(
                            employee_id=db_record.employee_id,
                            date=db_record.date,
                            field_name="check_out",
                            old_value=old_check_out,
                            new_value=db_record.check_out,
                            change_type="update",
                            change_time=change_time,
                            change_user=change_user,
                        )
                    )

                if old_type != db_record.attendance_type:
                    session.add(
                        AttendanceAudit(
                            employee_id=db_record.employee_id,
                            date=db_record.date,
                            field_name="attendance_type",
                            old_value=old_type,
                            new_value=db_record.attendance_type,
                            change_type="update",
                            change_time=change_time,
                            change_user=change_user,
                        )
                    )

                if old_remarks != db_record.remarks:
                    session.add(
                        AttendanceAudit(
                            employee_id=db_record.employee_id,
                            date=db_record.date,
                            field_name="remarks",
                            old_value=old_remarks,
                            new_value=db_record.remarks,
                            change_type="update",
                            change_time=change_time,
                            change_user=change_user,
                        )
                    )

            # 새 레코드 추가
            for insert_info in inserts:
                csv_record = insert_info["csv_record"]
                date_obj = insert_info["date_obj"]

                # 새 근태 기록 생성
                new_record = Attendance(
                    employee_id=csv_record["employee_id"],
                    date=date_obj,
                    check_in=csv_record.get("check_in", ""),
                    check_out=csv_record.get("check_out", ""),
                    attendance_type=csv_record.get("attendance_type", "정상"),
                    remarks=csv_record.get("remarks", ""),
                )
                session.add(new_record)

                # 감사 기록 추가
                session.add(
                    AttendanceAudit(
                        employee_id=csv_record["employee_id"],
                        date=date_obj,
                        field_name="*",
                        old_value="",
                        new_value="새 근태 기록 생성",
                        change_type="create",
                        change_time=change_time,
                        change_user=change_user,
                    )
                )

            # 트랜잭션 커밋
            session.commit()
            self.logger.info(
                f"{len(updates)}개 기록 업데이트, {len(inserts)}개 기록 새로 추가됨"
            )

        except Exception as e:
            session.rollback()
            self.logger.error(f"데이터베이스 업데이트 오류: {str(e)}")
            raise
        finally:
            session.close()

    def load_payroll_data(self) -> tuple[pd.DataFrame, str]:
        """급여 데이터 로드 및 전처리

        Returns:
            tuple: (처리된 데이터프레임, 현재 지급월)
        """
        try:
            # 급여 데이터 로드
            df = pd.read_csv(self.config.PAYROLL_DATA)
            df["payment_date"] = pd.to_datetime(df["payment_date"])

            # 최근 지급월 필터링
            latest_payment_date = df["payment_date"].max()
            latest_month = latest_payment_date.strftime("%Y년 %m월")
            df_latest = df[df["payment_date"] == latest_payment_date].copy()

            # 컬럼명 매핑
            column_mapping = {
                "gross_salary": "총지급액",
                "base_salary": "기본급",
                "employee_id": "사원번호",
                "position_allowance": "직책수당",
                "overtime_pay": "연장근로수당",
                "night_shift_pay": "야간근로수당",
                "holiday_pay": "휴일근로수당",
                "national_pension": "국민연금",
                "health_insurance": "건강보험",
                "employment_insurance": "고용보험",
            }

            df_mapped = df_latest.rename(columns=column_mapping)
            return df_mapped, latest_month

        except Exception as e:
            self.logger.error(f"급여 데이터 로드 실패: {str(e)}")
            raise

    def calculate_monthly_stats(self) -> Dict:
        """월별 급여 통계 계산

        Returns:
            Dict: 통계 정보
        """
        try:
            df, _ = self.load_payroll_data()

            stats = {
                "총 지급액": df["총지급액"].sum(),
                "평균 급여": df["기본급"].mean(),
                "총 인원": len(df),
                "4대보험 총액": df[["국민연금", "건강보험", "고용보험"]].sum().sum(),
            }

            return stats

        except Exception as e:
            self.logger.error(f"월별 통계 계산 실패: {str(e)}")
            raise

    def check_overlapping_periods(
        self,
        employee_id: str,
        period_start: datetime,
        period_end: datetime,
        payroll_type: str = "regular",
    ) -> List[Dict]:
        """직원의 급여 기간 중복 확인

        Args:
            employee_id: 직원 ID
            period_start: 급여 기간 시작일
            period_end: 급여 기간 종료일
            payroll_type: 급여 유형 (regular: 정기급여, special: 특별급여)

        Returns:
            List[Dict]: 중복된 급여 데이터 목록
        """
        try:
            session = get_db_session()
            try:
                # 기간이 겹치는 급여 데이터 조회
                # 1. 시작일이 기존 기간 내에 있는 경우
                # 2. 종료일이 기존 기간 내에 있는 경우
                # 3. 기존 기간을 완전히 포함하는 경우
                query = session.query(Payroll).filter(
                    Payroll.employee_id == employee_id,
                    Payroll.status.in_(["confirmed", "paid"]),
                    (
                        # 시작일이 기존 기간 내에 있는 경우
                        (
                            period_start >= Payroll.payment_period_start,
                            period_start <= Payroll.payment_period_end,
                        )
                        |
                        # 종료일이 기존 기간 내에 있는 경우
                        (
                            period_end >= Payroll.payment_period_start,
                            period_end <= Payroll.payment_period_end,
                        )
                        |
                        # 기존 기간을 완전히 포함하는 경우
                        (
                            period_start <= Payroll.payment_period_start,
                            period_end >= Payroll.payment_period_end,
                        )
                    ),
                )

                # 같은 유형의 급여만 중복으로 간주
                if payroll_type == "regular":
                    query = query.filter(Payroll.payroll_type == "regular")

                overlapping_payrolls = query.all()

                result = []
                for payroll in overlapping_payrolls:
                    result.append(
                        {
                            "payroll_code": payroll.payroll_code,
                            "employee_id": payroll.employee_id,
                            "payment_period_start": payroll.payment_period_start.strftime(
                                "%Y-%m-%d"
                            ),
                            "payment_period_end": payroll.payment_period_end.strftime(
                                "%Y-%m-%d"
                            ),
                            "status": payroll.status,
                            "payroll_type": payroll.payroll_type,
                            "confirmed_at": (
                                payroll.confirmed_at.strftime("%Y-%m-%d %H:%M:%S")
                                if payroll.confirmed_at
                                else None
                            ),
                        }
                    )

                return result
            finally:
                session.close()
        except Exception as e:
            self.logger.error(f"급여 기간 중복 확인 중 오류 발생: {str(e)}")
            raise

    def confirm_payroll(
        self,
        payroll_data: List[Dict],
        payment_period: Dict,
        confirmed_by: str,
        payroll_type: str = "regular",
    ) -> List[Dict]:
        """급여 계산 결과를 확정하고 데이터베이스에 저장

        Args:
            payroll_data: 급여 계산 결과 데이터
            payment_period: 급여 기간 정보 (start, end)
            confirmed_by: 확정자 ID
            payroll_type: 급여 유형 (regular: 정기급여, special: 특별급여)

        Returns:
            List[Dict]: 저장된 급여 정보 목록
        """
        try:
            self.logger.info(
                f"급여 확정 요청: {len(payroll_data)}건, 기간: {payment_period['start']} ~ {payment_period['end']}, 유형: {payroll_type}"
            )

            # 세션 생성
            session = get_db_session()
            saved_payrolls = []

            # 현재 시간 (확정 시간)
            confirmed_at = datetime.now()

            try:
                # 기간 중복 확인
                period_start = datetime.strptime(
                    payment_period["start"], "%Y-%m-%d"
                ).date()
                period_end = datetime.strptime(payment_period["end"], "%Y-%m-%d").date()

                # 각 직원별로 중복 기간 확인
                overlapping_data = {}
                for item in payroll_data:
                    employee_id = item["employee_id"]
                    overlaps = self.check_overlapping_periods(
                        employee_id, period_start, period_end, payroll_type
                    )
                    if overlaps:
                        overlapping_data[employee_id] = overlaps

                # 중복 데이터가 있으면 오류 반환
                if overlapping_data:
                    error_message = (
                        "다음 직원들의 급여 기간이 기존 데이터와 중복됩니다:\n"
                    )
                    for emp_id, overlaps in overlapping_data.items():
                        error_message += f"직원 ID: {emp_id}\n"
                        for overlap in overlaps:
                            error_message += f"  - 기간: {overlap['payment_period_start']} ~ {overlap['payment_period_end']} (상태: {overlap['status']}, 유형: {overlap['payroll_type']})\n"

                    raise ValueError(error_message)

                for item in payroll_data:
                    # 급여 코드 생성 (고유 ID)
                    payroll_code = f"PAY-{uuid.uuid4().hex[:8].upper()}"

                    # 새 급여 레코드 생성
                    payroll = Payroll(
                        payroll_code=payroll_code,
                        employee_id=item["employee_id"],
                        payment_period_start=datetime.strptime(
                            payment_period["start"], "%Y-%m-%d"
                        ).date(),
                        payment_period_end=datetime.strptime(
                            payment_period["end"], "%Y-%m-%d"
                        ).date(),
                        payment_date=datetime.now().date(),  # 현재 날짜로 설정 (필요에 따라 조정 가능)
                        base_pay=item["base_pay"],
                        overtime_pay=item.get("overtime_pay", 0),
                        night_shift_pay=item.get("night_shift_pay", 0),
                        holiday_pay=item.get("holiday_pay", 0),
                        total_allowances=item.get("total_allowances", 0),
                        gross_pay=item["gross_pay"],
                        income_tax=item.get("income_tax", 0),
                        residence_tax=item.get("residence_tax", 0),
                        national_pension=item.get("national_pension", 0),
                        health_insurance=item.get("health_insurance", 0),
                        long_term_care=item.get("long_term_care", 0),
                        employment_insurance=item.get("employment_insurance", 0),
                        total_deductions=item.get("total_deductions", 0),
                        net_pay=item["net_pay"],
                        status="confirmed",  # 확정 상태로 저장
                        confirmed_at=confirmed_at,
                        confirmed_by=confirmed_by,
                        payment_method=item.get("payment_method", "계좌이체"),
                        payroll_type=payroll_type,  # 급여 유형 저장
                        remarks=item.get("remarks", ""),
                    )

                    session.add(payroll)

                    # 감사 로그 추가
                    audit = PayrollAudit(
                        action="confirm",
                        user_id=confirmed_by,
                        target_type="payroll",
                        target_id=payroll_code,
                        new_value={
                            "status": "confirmed",
                            "confirmed_at": confirmed_at.isoformat(),
                            "payroll_type": payroll_type,
                        },
                        ip_address=None,  # 필요시 IP 주소 추가
                    )

                    session.add(audit)

                    # 저장된 급여 정보를 반환 목록에 추가
                    saved_payrolls.append(
                        {
                            "payroll_code": payroll_code,
                            "employee_id": item["employee_id"],
                            "payment_period_start": payment_period["start"],
                            "payment_period_end": payment_period["end"],
                            "status": "confirmed",
                            "payroll_type": payroll_type,
                            "gross_pay": item["gross_pay"],
                            "net_pay": item["net_pay"],
                        }
                    )

                # 모든 레코드 커밋
                session.commit()
                self.logger.info(f"급여 확정 완료: {len(saved_payrolls)}건 저장됨")

                return saved_payrolls

            except ValueError as ve:
                # 중복 오류는 그대로 전달
                session.rollback()
                self.logger.error(f"급여 확정 실패 (중복 기간): {str(ve)}")
                raise
            except Exception as e:
                # 오류 발생 시 롤백
                session.rollback()
                self.logger.error(f"급여 확정 실패 (롤백됨): {str(e)}")
                raise
            finally:
                # 세션 종료
                session.close()

        except Exception as e:
            self.logger.error(f"급여 확정 처리 중 오류 발생: {str(e)}")
            raise Exception(f"급여 확정 처리 중 오류가 발생했습니다: {str(e)}")

    def calculate_and_save_payroll(
        self, employee_id, start_date, end_date, force_recalculate=False
    ):
        """
        직원의 급여를 계산하고 데이터베이스에 저장하는 메서드

        Args:
            employee_id (str): 직원 ID
            start_date (date): 급여 기간 시작일
            end_date (date): 급여 기간 종료일
            force_recalculate (bool): 기존 급여 데이터가 있어도 강제로 재계산할지 여부

        Returns:
            dict: 계산된 급여 정보
        """
        try:
            self.logger.info(
                f"직원 ID {employee_id}의 급여 계산 시작 (기간: {start_date} ~ {end_date})"
            )

            # 세션 생성
            session = get_db_session()

            try:
                # 직원 정보 조회
                employee = (
                    session.query(Employee)
                    .filter(Employee.employee_id == employee_id)
                    .first()
                )

                if not employee:
                    self.logger.error(
                        f"직원 ID {employee_id}에 해당하는 직원을 찾을 수 없습니다."
                    )
                    return None

                # 이미 계산된 급여가 있는지 확인 (force_recalculate가 False인 경우에만)
                if not force_recalculate:
                    existing_payroll = (
                        session.query(Payroll)
                        .filter(
                            Payroll.employee_id == employee_id,
                            Payroll.payment_period_start == start_date,
                            Payroll.payment_period_end == end_date,
                            Payroll.status.in_(["confirmed", "paid"]),
                        )
                        .first()
                    )

                    if existing_payroll:
                        self.logger.info(
                            f"직원 ID {employee_id}의 해당 기간에 대한 급여가 이미 계산되어 있습니다."
                        )
                        return {
                            "payroll_code": existing_payroll.payroll_code,
                            "employee_id": existing_payroll.employee_id,
                            "employee_name": employee.name,
                            "department": employee.department,
                            "position": employee.position,
                            "payment_period_start": existing_payroll.payment_period_start.strftime(
                                "%Y-%m-%d"
                            ),
                            "payment_period_end": existing_payroll.payment_period_end.strftime(
                                "%Y-%m-%d"
                            ),
                            "base_pay": existing_payroll.base_pay,
                            "overtime_pay": existing_payroll.overtime_pay,
                            "night_shift_pay": existing_payroll.night_shift_pay,
                            "holiday_pay": existing_payroll.holiday_pay,
                            "gross_pay": existing_payroll.gross_pay,
                            "net_pay": existing_payroll.net_pay,
                            "status": existing_payroll.status,
                        }

                # 해당 기간의 근태 기록 조회
                attendance_records = (
                    session.query(Attendance)
                    .filter(
                        Attendance.employee_id == employee_id,
                        Attendance.date >= start_date,
                        Attendance.date <= end_date,
                    )
                    .all()
                )

                # 근태 기록을 PayCalculator에서 사용할 형식으로 변환
                attendance_data = []
                for record in attendance_records:
                    attendance_data.append(
                        {
                            "date": record.date.strftime("%Y-%m-%d"),
                            "check_in": record.check_in,
                            "check_out": record.check_out,
                            "attendance_type": record.attendance_type,
                            "remarks": record.remarks,
                        }
                    )

                # 계산 로깅 시작 - 문자열에 수집
                calculation_logs = []
                calculation_logs.append("=" * 80)
                calculation_logs.append(
                    f"급여 계산 시작: 직원 ID {employee_id}, 이름: {employee.name}"
                )
                calculation_logs.append(
                    f"계산 기간: {start_date.strftime('%Y-%m-%d')} ~ {end_date.strftime('%Y-%m-%d')}"
                )
                calculation_logs.append("=" * 80)

                # PayCalculator 인스턴스 생성
                calculator = PayCalculator()

                # 급여 계산
                base_salary = employee.base_salary
                join_date = (
                    employee.join_date.strftime("%Y-%m-%d")
                    if employee.join_date
                    else None
                )
                resignation_date = (
                    employee.resignation_date.strftime("%Y-%m-%d")
                    if employee.resignation_date
                    else None
                )

                calculation_logs.append("\n" + "-" * 80)
                calculation_logs.append("1. 기본 정보")
                calculation_logs.append("-" * 80)
                calculation_logs.append(f"연봉: {base_salary:,}원")
                calculation_logs.append(f"입사일: {join_date or '정보 없음'}")
                calculation_logs.append(f"퇴사일: {resignation_date or '재직중'}")

                # 시간당 임금 계산
                hourly_rate = (base_salary / 12) / calculator.WORK_HOURS_PER_MONTH
                calculation_logs.append(
                    f"시간당 임금: {hourly_rate:,.2f}원 (연봉 ÷ 12개월 ÷ {calculator.WORK_HOURS_PER_MONTH}시간)"
                )

                # 각 항목별 급여 계산
                calculation_logs.append("\n" + "-" * 80)
                calculation_logs.append("2. 기본급 계산")
                calculation_logs.append("-" * 80)
                calculation_logs.append("계산식: 월 기본급 × 근무일수 비율")

                base_pay = calculator.calculate_base_pay(
                    base_salary,
                    start_date.strftime("%Y-%m-%d"),
                    end_date.strftime("%Y-%m-%d"),
                    attendance_data,
                    join_date,
                    resignation_date,
                )
                calculation_logs.append(f"계산결과: {base_pay:,}원")

                calculation_logs.append("\n" + "-" * 80)
                calculation_logs.append("3. 연장근로수당 계산")
                calculation_logs.append("-" * 80)
                calculation_logs.append("계산식: 연장근로시간 × 시간당 임금 × 1.5")

                overtime_pay = calculator.calculate_overtime_pay(
                    attendance_data, hourly_rate
                )
                calculation_logs.append(f"계산결과: {overtime_pay:,}원")

                calculation_logs.append("\n" + "-" * 80)
                calculation_logs.append("4. 야간근로수당 계산")
                calculation_logs.append("-" * 80)
                calculation_logs.append(
                    "계산식: 야간근로시간(22:00~06:00) × 시간당 임금 × 0.5"
                )

                night_shift_pay = calculator.calculate_night_pay(
                    attendance_data, hourly_rate
                )
                calculation_logs.append(f"계산결과: {night_shift_pay:,}원")

                calculation_logs.append("\n" + "-" * 80)
                calculation_logs.append("5. 휴일근로수당 계산")
                calculation_logs.append("-" * 80)
                calculation_logs.append("계산식: 휴일근로시간 × 시간당 임금 × 1.5")

                holiday_pay = calculator.calculate_holiday_pay(
                    attendance_data, hourly_rate
                )
                calculation_logs.append(f"계산결과: {holiday_pay:,}원")

                # 총 수당 계산
                total_allowances = overtime_pay + night_shift_pay + holiday_pay

                calculation_logs.append("\n" + "-" * 80)
                calculation_logs.append("6. 총 수당 합계")
                calculation_logs.append("-" * 80)
                calculation_logs.append(
                    f"연장근로수당 + 야간근로수당 + 휴일근로수당 = {overtime_pay:,} + {night_shift_pay:,} + {holiday_pay:,}"
                )
                calculation_logs.append(f"계산결과: {total_allowances:,}원")

                # 총 지급액 계산
                gross_pay = base_pay + total_allowances

                calculation_logs.append("\n" + "-" * 80)
                calculation_logs.append("7. 총 지급액 계산")
                calculation_logs.append("-" * 80)
                calculation_logs.append(
                    f"기본급 + 총 수당 = {base_pay:,} + {total_allowances:,}"
                )
                calculation_logs.append(f"계산결과: {gross_pay:,}원")

                # 공제액 계산 - InsuranceCalculator 사용하여 정교한 계산
                insurance_calc = InsuranceCalculator()

                # 부양가족 수 가져오기 (가족 수와 자녀 수를 합산)
                dependents = employee.family_count or 1  # 기본값 1 (본인)

                calculation_logs.append("\n" + "-" * 80)
                calculation_logs.append("8. 4대 보험 및 세금 계산")
                calculation_logs.append("-" * 80)
                calculation_logs.append(f"총 지급액: {gross_pay:,}원")
                calculation_logs.append(f"부양가족 수: {dependents}명")

                # 4대 보험 계산
                insurances = insurance_calc.calculate_insurances(gross_pay)
                national_pension = insurances["nationalPension"]
                health_insurance = insurances["healthInsurance"]
                long_term_care = insurances["longTermCare"]
                employment_insurance = insurances["employmentInsurance"]

                calculation_logs.append("\n" + "-" * 40)
                calculation_logs.append("8.1 국민연금")
                calculation_logs.append("-" * 40)
                calculation_logs.append(
                    f"계산식: {gross_pay:,} × {insurance_calc.RATES['NATIONAL_PENSION']:.3f}"
                )
                calculation_logs.append(f"계산결과: {national_pension:,}원")

                calculation_logs.append("\n" + "-" * 40)
                calculation_logs.append("8.2 건강보험")
                calculation_logs.append("-" * 40)
                calculation_logs.append(
                    f"계산식: {gross_pay:,} × {insurance_calc.RATES['HEALTH_INSURANCE']:.5f}"
                )
                calculation_logs.append(f"계산결과: {health_insurance:,}원")

                calculation_logs.append("\n" + "-" * 40)
                calculation_logs.append("8.3 장기요양보험")
                calculation_logs.append("-" * 40)
                calculation_logs.append(
                    f"계산식: {health_insurance:,} × {insurance_calc.RATES['LONG_TERM_CARE']:.4f} × 0.5(직원부담분)"
                )
                calculation_logs.append(f"계산결과: {long_term_care:,}원")

                calculation_logs.append("\n" + "-" * 40)
                calculation_logs.append("8.4 고용보험")
                calculation_logs.append("-" * 40)
                calculation_logs.append(
                    f"계산식: {gross_pay:,} × {insurance_calc.RATES['EMPLOYMENT_INSURANCE']:.4f}"
                )
                calculation_logs.append(f"계산결과: {employment_insurance:,}원")

                # 세금 계산
                taxes = insurance_calc.calculate_taxes(gross_pay, dependents)
                income_tax = taxes["incomeTax"]
                residence_tax = taxes["localIncomeTax"]

                calculation_logs.append("\n" + "-" * 40)
                calculation_logs.append("8.5 소득세")
                calculation_logs.append("-" * 40)
                calculation_logs.append("계산식: 세액표 기준 계산")
                calculation_logs.append(
                    f"월 급여: {gross_pay:,}원, 부양가족: {dependents}명"
                )
                calculation_logs.append(f"계산결과: {income_tax:,}원")

                calculation_logs.append("\n" + "-" * 40)
                calculation_logs.append("8.6 지방소득세")
                calculation_logs.append("-" * 40)
                calculation_logs.append(f"계산식: 소득세({income_tax:,}) × 0.1")
                calculation_logs.append(f"계산결과: {residence_tax:,}원")

                # 총 공제액 계산
                total_deductions = (
                    income_tax
                    + residence_tax
                    + national_pension
                    + health_insurance
                    + long_term_care
                    + employment_insurance
                )

                calculation_logs.append("\n" + "-" * 80)
                calculation_logs.append("9. 총 공제액 계산")
                calculation_logs.append("-" * 80)
                calculation_logs.append(
                    f"소득세 + 지방소득세 + 국민연금 + 건강보험 + 장기요양보험 + 고용보험"
                )
                calculation_logs.append(
                    f"{income_tax:,} + {residence_tax:,} + {national_pension:,} + {health_insurance:,} + {long_term_care:,} + {employment_insurance:,}"
                )
                calculation_logs.append(f"계산결과: {total_deductions:,}원")

                # 실수령액 계산
                net_pay = gross_pay - total_deductions

                calculation_logs.append("\n" + "-" * 80)
                calculation_logs.append("10. 실수령액 계산")
                calculation_logs.append("-" * 80)
                calculation_logs.append(
                    f"총 지급액 - 총 공제액 = {gross_pay:,} - {total_deductions:,}"
                )
                calculation_logs.append(f"계산결과: {net_pay:,}원")

                calculation_logs.append("\n" + "=" * 80)
                calculation_logs.append(
                    f"급여 계산 완료: 직원 ID {employee_id}, 이름: {employee.name}"
                )
                calculation_logs.append(f"실수령액: {net_pay:,}원")
                calculation_logs.append("=" * 80 + "\n")

                # 급여 코드 생성 (UUID 사용)
                payroll_code = str(uuid.uuid4())

                # 기존 초안 급여 기록이 있는지 확인하고 삭제
                existing_draft = (
                    session.query(Payroll)
                    .filter(
                        Payroll.employee_id == employee_id,
                        Payroll.payment_period_start == start_date,
                        Payroll.payment_period_end == end_date,
                        Payroll.status == "draft",
                    )
                    .first()
                )

                if existing_draft:
                    session.delete(existing_draft)
                    session.flush()

                # 새 급여 기록 생성
                new_payroll = Payroll(
                    payroll_code=payroll_code,
                    employee_id=employee_id,
                    payment_period_start=start_date,
                    payment_period_end=end_date,
                    payment_date=None,  # 지급일은 아직 설정하지 않음
                    base_pay=int(base_pay),
                    overtime_pay=int(overtime_pay),
                    night_shift_pay=int(night_shift_pay),
                    holiday_pay=int(holiday_pay),
                    total_allowances=int(total_allowances),
                    gross_pay=int(gross_pay),
                    income_tax=income_tax,
                    residence_tax=residence_tax,
                    national_pension=national_pension,
                    health_insurance=health_insurance,
                    long_term_care=long_term_care,
                    employment_insurance=employment_insurance,
                    total_deductions=total_deductions,
                    net_pay=int(net_pay),
                    status="draft",
                    payroll_type="regular",
                )

                # 데이터베이스에 저장
                session.add(new_payroll)
                session.commit()

                self.logger.info(f"직원 ID {employee_id}의 급여 계산 및 저장 완료")

                # 결과 반환
                return {
                    "payroll_code": payroll_code,
                    "employee_id": employee_id,
                    "employee_name": employee.name,
                    "department": employee.department,
                    "position": employee.position,
                    "payment_period_start": start_date.strftime("%Y-%m-%d"),
                    "payment_period_end": end_date.strftime("%Y-%m-%d"),
                    "base_pay": int(base_pay),
                    "overtime_pay": int(overtime_pay),
                    "night_shift_pay": int(night_shift_pay),
                    "holiday_pay": int(holiday_pay),
                    "gross_pay": int(gross_pay),
                    "income_tax": income_tax,
                    "residence_tax": residence_tax,
                    "national_pension": national_pension,
                    "health_insurance": health_insurance,
                    "long_term_care": long_term_care,
                    "employment_insurance": employment_insurance,
                    "total_deductions": total_deductions,
                    "net_pay": int(net_pay),
                    "status": "draft",
                    "calculation_logs": calculation_logs,  # 계산 로그 포함
                }

            except Exception as e:
                session.rollback()
                self.logger.error(f"급여 계산 중 오류 발생: {str(e)}")
                raise
            finally:
                session.close()

        except Exception as e:
            self.logger.error(f"급여 계산 및 저장 중 오류 발생: {str(e)}")
            raise Exception(f"급여 계산 및 저장 중 오류가 발생했습니다: {str(e)}")

    def start_file_watcher(self):
        """파일 시스템 감시 서비스 시작 (watchdog 사용)"""
        if self.observer is not None and self.observer.is_alive():
            self.logger.info("파일 감시 Observer가 이미 실행 중입니다.")
            return

        try:
            # 이벤트 핸들러 및 Observer 설정
            self.event_handler = AttendanceFileHandler(self)
            self.observer = Observer()

            # 감시할 디렉토리 설정 (파일 자체가 아닌 파일이 있는 디렉토리를 감시)
            watch_dir = os.path.dirname(self.attendance_file_path)
            self.observer.schedule(self.event_handler, path=watch_dir, recursive=False)

            # Observer 시작
            self.observer.start()
            self.logger.info(
                f"근태 파일 감시 서비스(watchdog)가 시작되었습니다. 감시 디렉토리: {watch_dir}"
            )
        except Exception as e:
            self.logger.error(f"파일 감시 서비스 시작 오류: {str(e)}")

    def stop_file_watcher(self):
        """파일 시스템 감시 서비스 중지 (watchdog)"""
        if self.observer and self.observer.is_alive():
            try:
                self.observer.stop()
                self.observer.join(timeout=3.0)
                if self.observer.is_alive():
                    self.logger.warning(
                        "파일 감시 Observer가 3초 내에 종료되지 않았습니다."
                    )
                else:
                    self.logger.info("근태 파일 감시 서비스가 중지되었습니다.")
            except Exception as e:
                self.logger.error(f"파일 감시 서비스 중지 오류: {str(e)}")
        else:
            self.logger.info("파일 감시 서비스가 실행 중이 아닙니다.")

    def _notify_change_event(self):
        """근태 파일 변경을 알리는 글로벌 이벤트를 설정합니다."""
        # 글로벌 이벤트 설정
        FILE_CHANGED_EVENT.set()
        FILE_CHANGED_EVENT.clear()  # 이벤트 즉시 초기화

        # 등록된 모든 이벤트 핸들러 호출
        for handler in self.change_event_handlers:
            try:
                handler()
            except Exception as e:
                self.logger.error(f"이벤트 핸들러 호출 오류: {str(e)}")

    def register_change_handler(self, handler):
        """근태 파일 변경 이벤트 핸들러 등록"""
        if handler not in self.change_event_handlers:
            self.change_event_handlers.append(handler)

    def unregister_change_handler(self, handler):
        """근태 파일 변경 이벤트 핸들러 등록 해제"""
        if handler in self.change_event_handlers:
            self.change_event_handlers.remove(handler)
