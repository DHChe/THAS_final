import { loadPayrollData } from '../payrollLoader.js';
import { 
  preprocessPayrollData, 
  optimizeForLLM, 
  aggregatePayrollData 
} from '../aiDataProcessor.js';

/**
 * 실제 데이터 테스트를 위한 함수
 */
const testWithRealData = async () => {
  console.log('실제 데이터 테스트 시작...\n');

  try {
    // 1. 데이터 로드
    console.log('1. 급여 데이터 로드 중...');
    const rawData = await loadPayrollData();
    console.log(`- 로드된 데이터 수: ${rawData.length}`);
    console.log('- 샘플 데이터:', JSON.stringify(rawData[0], null, 2));

    // 2. 데이터 전처리 (employeesData 추가)
    console.log('\n2. 데이터 전처리 중...');
    const preprocessed = preprocessPayrollData(rawData, rawData); // rawData를 employeesData로도 사용
    console.log(`- 전처리된 데이터 수: ${preprocessed.data.length}`);
    console.log('- 메타데이터:', preprocessed.metadata);

    // 3. LLM 최적화
    console.log('\n3. LLM 최적화 중...');
    const optimized = optimizeForLLM(preprocessed);
    console.log(`- 최적화된 데이터 수: ${optimized.data.length}`);
    console.log('- 샘플 최적화 데이터:', JSON.stringify(optimized.data[0], null, 2));

    // 4. 통계 처리
    console.log('\n4. 통계 처리 중...');
    const aggregated = aggregatePayrollData(optimized);
    
    // 5. 결과 분석
    console.log('\n5. 분석 결과:');
    if (aggregated.data) {
      console.log('- 부서별 통계:', Object.keys(aggregated.data.department_stats || {}).length, '개 부서');
      console.log('- 직급별 통계:', Object.keys(aggregated.data.position_stats || {}).length, '개 직급');
    }

    return {
      success: true,
      metrics: {
        totalRecords: rawData.length,
        processedRecords: preprocessed.data.length,
        departments: aggregated.data ? Object.keys(aggregated.data.department_stats || {}).length : 0,
        positions: aggregated.data ? Object.keys(aggregated.data.position_stats || {}).length : 0
      }
    };

  } catch (error) {
    console.error('\n에러 발생:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 테스트 실행
testWithRealData().then(result => {
  console.log('\n테스트 결과:', result);
}); 