import pandas as pd
from datetime import datetime
import logging
from typing import Dict, List, Optional

class HRService:
    """인사 관리 서비스 클래스
    
    직원 정보 관리, 조회, 통계 등 인사 관련 모든 비즈니스 로직을 처리합니다.
    """
    
    def __init__(self, config):
        self.config = config
        self.setup_logging()
        
    def setup_logging(self):
        """로깅 설정"""
        logging.basicConfig(
            filename=f'logs/hr_{datetime.now().strftime("%Y%m")}.log',
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)

    def load_employee_data(self) -> pd.DataFrame:
        """직원 데이터 로드 및 전처리
        
        Returns:
            pd.DataFrame: 처리된 직원 데이터
        """
        try:
            df = pd.read_csv(self.config.EMPLOYEE_DATA)
            
            # 날짜 형식 변환
            date_columns = ['join_date', 'birth', 'resignation_date']
            for col in date_columns:
                if col in df.columns:
                    df[col] = pd.to_datetime(df[col])
            
            return df
            
        except Exception as e:
            self.logger.error(f"직원 데이터 로드 실패: {str(e)}")
            raise

    def get_employee_summary(self) -> Dict:
        """직원 현황 요약 정보
        
        Returns:
            Dict: 직원 통계 정보
        """
        try:
            df = self.load_employee_data()
            
            # 현재 날짜 기준 재직자만 필터링
            current_employees = df[
                (df['status'] == '재직중') | 
                (pd.isna(df['resignation_date']))
            ]
            
            summary = {
                'total_employees': len(current_employees),
                'departments': current_employees['department'].nunique(),
                'positions': current_employees['position'].nunique(),
                'avg_years': (datetime.now() - current_employees['join_date']).mean().days / 365,
                'department_stats': current_employees['department'].value_counts().to_dict(),
                'position_stats': current_employees['position'].value_counts().to_dict(),
                'gender_ratio': current_employees['sex'].value_counts(normalize=True).to_dict()
            }
            
            return summary
            
        except Exception as e:
            self.logger.error(f"직원 통계 계산 실패: {str(e)}")
            raise

    def get_employee_details(self, employee_id: str) -> Optional[Dict]:
        """특정 직원의 상세 정보 조회
        
        Args:
            employee_id: 직원 ID
            
        Returns:
            Dict: 직원 상세 정보
        """
        try:
            df = self.load_employee_data()
            employee = df[df['employee_id'] == employee_id]
            
            if employee.empty:
                return None
                
            return employee.iloc[0].to_dict()
            
        except Exception as e:
            self.logger.error(f"직원 상세 정보 조회 실패: {str(e)}")
            raise

    def search_employees(self, query: Dict) -> List[Dict]:
        """직원 검색 기능
        
        Args:
            query: 검색 조건
            
        Returns:
            List[Dict]: 검색 결과 직원 목록
        """
        try:
            df = self.load_employee_data()
            filtered_df = df.copy()
            
            # 검색 조건 적용
            if query.get('department'):
                filtered_df = filtered_df[filtered_df['department'] == query['department']]
            if query.get('position'):
                filtered_df = filtered_df[filtered_df['position'] == query['position']]
            if query.get('status'):
                filtered_df = filtered_df[filtered_df['status'] == query['status']]
            if query.get('name'):
                filtered_df = filtered_df[filtered_df['name'].str.contains(query['name'])]
            
            return filtered_df.to_dict('records')
            
        except Exception as e:
            self.logger.error(f"직원 검색 실패: {str(e)}")
            raise
        
def update_employee(self, employee_id: str, update_data: Dict) -> Optional[Dict]:
    """직원 정보 업데이트
    
    Args:
        employee_id (str): 직원 ID
        update_data (Dict): 업데이트할 정보
        
    Returns:
        Optional[Dict]: 업데이트된 직원 정보
    """
    try:
        # 현재 데이터 로드
        df = self.load_employee_data()
        
        # 해당 직원 존재 여부 확인
        if employee_id not in df['employee_id'].values:
            return None
            
        # 날짜 형식 처리
        date_columns = ['join_date', 'birth', 'resignation_date']
        for col in date_columns:
            if col in update_data and update_data[col]:
                update_data[col] = pd.to_datetime(update_data[col])
        
        # 데이터 업데이트
        df.loc[df['employee_id'] == employee_id, update_data.keys()] = update_data.values()
        
        # 파일 저장
        df.to_csv(self.config.EMPLOYEE_DATA, index=False)
        
        # 업데이트된 직원 정보 반환
        updated_employee = df[df['employee_id'] == employee_id].iloc[0].to_dict()
        
        # 로그 기록
        self.logger.info(f"직원 정보 업데이트 완료 - ID: {employee_id}")
        
        return updated_employee
        
    except Exception as e:
        self.logger.error(f"직원 정보 업데이트 실패: {str(e)}")
        raise

def validate_employee_data(self, data: Dict) -> List[str]:
    """직원 데이터 유효성 검증
    
    Args:
        data (Dict): 검증할 직원 데이터
        
    Returns:
        List[str]: 오류 메시지 목록
    """
    errors = []
    
    # 필수 필드 검증
    required_fields = ['name', 'department', 'position', 'status']
    for field in required_fields:
        if field not in data or not data[field]:
            errors.append(f"{field} 필드는 필수입니다.")
    
    # 날짜 형식 검증
    date_fields = ['join_date', 'birth']
    for field in date_fields:
        if field in data and data[field]:
            try:
                pd.to_datetime(data[field])
            except:
                errors.append(f"{field}의 날짜 형식이 올바르지 않습니다.")
    
    # 부서 유효성 검증
    valid_departments = ['개발팀', '영업팀', '인사팀', '경영지원팀']
    if data.get('department') and data['department'] not in valid_departments:
        errors.append("올바르지 않은 부서입니다.")
    
    # 직급 유효성 검증
    valid_positions = ['사원', '대리', '과장', '차장', '부장']
    if data.get('position') and data['position'] not in valid_positions:
        errors.append("올바르지 않은 직급입니다.")
    
    # 상태 유효성 검증
    valid_statuses = ['재직중', '퇴사']
    if data.get('status') and data['status'] not in valid_statuses:
        errors.append("올바르지 않은 재직상태입니다.")
    
    return errors