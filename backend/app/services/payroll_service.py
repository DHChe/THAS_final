import pandas as pd
import logging
from datetime import datetime
from typing import Dict, List, Optional
import uuid
from sqlalchemy.orm import Session
from config.database import get_db_session
from models.models import Payroll, PayrollAudit, PayrollDocument


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

    def setup_logging(self):
        """로깅 설정"""
        logging.basicConfig(
            filename=f'logs/payroll_{datetime.now().strftime("%Y%m")}.log',
            level=logging.INFO,
            format="%(asctime)s - %(message)s",
        )
        self.logger = logging.getLogger(__name__)

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

    def confirm_payroll(
        self, payroll_data: List[Dict], payment_period: Dict, confirmed_by: str
    ) -> List[Dict]:
        """급여 계산 결과를 확정하고 데이터베이스에 저장

        Args:
            payroll_data: 급여 계산 결과 데이터
            payment_period: 급여 기간 정보 (start, end)
            confirmed_by: 확정자 ID

        Returns:
            List[Dict]: 저장된 급여 정보 목록
        """
        try:
            self.logger.info(
                f"급여 확정 요청: {len(payroll_data)}건, 기간: {payment_period['start']} ~ {payment_period['end']}"
            )

            # 세션 생성
            session = get_db_session()
            saved_payrolls = []

            # 현재 시간 (확정 시간)
            confirmed_at = datetime.now()

            try:
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
                        employment_insurance=item.get("employment_insurance", 0),
                        total_deductions=item.get("total_deductions", 0),
                        net_pay=item["net_pay"],
                        status="confirmed",  # 확정 상태로 저장
                        confirmed_at=confirmed_at,
                        confirmed_by=confirmed_by,
                        payment_method=item.get("payment_method", "계좌이체"),
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
                            "gross_pay": item["gross_pay"],
                            "net_pay": item["net_pay"],
                        }
                    )

                # 모든 레코드 커밋
                session.commit()
                self.logger.info(f"급여 확정 완료: {len(saved_payrolls)}건 저장됨")

                return saved_payrolls

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
