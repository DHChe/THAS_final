import { analyzeQuery } from './queryAnalyzer';
import { executeQuery } from './testRAG';

const processQuery = async (query, data) => {
  try {
    // 쿼리 분석
    const queryStructure = analyzeQuery(query);
    if (!queryStructure) {
      throw new Error('쿼리 분석 실패');
    }

    // 필요한 데이터 포인트 확인
    const requiredFields = [queryStructure.target];
    if (queryStructure.groupBy) requiredFields.push(queryStructure.groupBy);
    if (queryStructure.filters.department) requiredFields.push('department');

    // 쿼리 실행
    const result = executeQuery({
      query,
      expectedDataPoints: requiredFields,
      expectedResult: queryStructure
    }, data);

    return {
      success: true,
      result,
      analysis: queryStructure
    };
  } catch (error) {
    console.error('쿼리 처리 중 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export { processQuery }; 