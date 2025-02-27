import pandas as pd
import logging
from datetime import datetime
from typing import Dict, List, Optional

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
            format='%(asctime)s - %(message)s'
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
            df['payment_date'] = pd.to_datetime(df['payment_date'])
            
            # 최근 지급월 필터링
            latest_payment_date = df['payment_date'].max()
            latest_month = latest_payment_date.strftime('%Y년 %m월')
            df_latest = df[df['payment_date'] == latest_payment_date].copy()
            
            # 컬럼명 매핑
            column_mapping = {
                'gross_salary': '총지급액',
                'base_salary': '기본급',
                'employee_id': '사원번호',
                'position_allowance': '직책수당',
                'overtime_pay': '연장근로수당',
                'night_shift_pay': '야간근로수당',
                'holiday_pay': '휴일근로수당',
                'national_pension': '국민연금',
                'health_insurance': '건강보험',
                'employment_insurance': '고용보험'
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
                '총 지급액': df['총지급액'].sum(),
                '평균 급여': df['기본급'].mean(),
                '총 인원': len(df),
                '4대보험 총액': df[['국민연금', '건강보험', '고용보험']].sum().sum()
            }
            
            return stats
            
        except Exception as e:
            self.logger.error(f"월별 통계 계산 실패: {str(e)}")
            raise