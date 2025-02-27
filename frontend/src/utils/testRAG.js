import { preprocessForRAG } from './aiDataProcessor';

// 실제 데이터를 사용하는 테스트 함수
export const testRAGPreprocessing = (payrollData, employeesData) => {
  console.group('RAG 시스템 테스트 (실제 데이터)');
  
  try {
    // 1. 데이터 전처리 테스트
    const samplePayroll = payrollData.slice(0, 5);
    const uniqueEmployeeIds = [...new Set(samplePayroll.map(p => p.employee_id))];
    const sampleEmployees = employeesData.filter(e => uniqueEmployeeIds.includes(e.employee_id));

    console.log('테스트 데이터 샘플:', {
      급여데이터: samplePayroll,
      직원정보: sampleEmployees
    });

    const result = preprocessForRAG(samplePayroll, sampleEmployees);
    
    // 2. 데이터 정규화 검증
    if (result.success) {
      console.log('데이터 정규화 검증:');
      result.data.forEach((item, index) => {
        console.log(`샘플 ${index + 1}:`, {
          직원정보: `${item.department} ${item.position} ${item.name}`,
          급여정보: {
            기본급: item.base_salary,
            초과근무수당: item.overtime_pay,
            야간근무수당: item.night_shift_pay,
            휴일근무수당: item.holiday_pay
          },
          정규화된_값: item.normalized_values || '정규화 데이터 없음'
        });
      });
    }

    // 3. 테스트 쿼리 실행
    console.log('\n분석 쿼리 테스트:');
    const testQueries = [
      "2023년 개발팀의 평균 급여는 얼마인가요?",
      "야간 근무 수당이 가장 높은 부서는 어디인가요?",
      "직급별 평균 급여는 어떻게 되나요?"
    ];

    console.log('테스트할 쿼리:', testQueries);
    
    return result.success;
  } catch (error) {
    console.error('테스트 중 오류 발생:', error);
    return false;
  } finally {
    console.groupEnd();
  }
}; 