// 쿼리 패턴 정의
const QUERY_PATTERNS = {
  timePatterns: {
    year: /(\d{4})년/,
    month: /(\d{1,2})월/,
    quarter: /(1|2|3|4)분기/,
    period: /(올해|이번 달|지난 달|작년)/
  },
  
  targetPatterns: {
    salary: /(급여|연봉|임금|월급)/,
    allowance: /(수당|야간 수당|연장|특근)/,
    bonus: /(상여금|보너스|성과급)/,
    deduction: /(공제|세금|보험료)/
  },
  
  aggregatePatterns: {
    average: /(평균|평균적|평균값)/,
    max: /(최대|가장 높은|최고)/,
    min: /(최소|가장 낮은|최저)/,
    total: /(총|전체|합계)/,
    count: /(몇 명|인원|수)/
  },
  
  groupPatterns: {
    department: /(부서별|부서 기준|부서단위)/,
    position: /(직급별|직급 기준|직위별)/,
    year: /(연도별|년도별)/,
    month: /(월별|달별)/
  }
};

// 대상 필드 매핑
const TARGET_FIELD_MAP = {
  '급여': 'base_salary',
  '기본급': 'base_salary',
  '야간 수당': 'night_shift_pay',
  '연장 수당': 'overtime_pay',
  '상여금': 'bonus',
  '총급여': 'gross_salary',
  '식대': 'meal_allowance',
  '교통비': 'transportation_allowance'
};

const analyzeQuery = (query) => {
  try {
    // 1. 시간 필터 분석
    const timeFilters = {};
    Object.entries(QUERY_PATTERNS.timePatterns).forEach(([key, pattern]) => {
      const match = query.match(pattern);
      if (match) timeFilters[key] = match[1];
    });

    // 2. 집계 타입 분석
    let aggregateType = 'average'; // 기본값
    Object.entries(QUERY_PATTERNS.aggregatePatterns).forEach(([type, pattern]) => {
      if (pattern.test(query)) aggregateType = type;
    });

    // 3. 대상 필드 분석
    let targetField = 'base_salary'; // 기본값
    Object.entries(TARGET_FIELD_MAP).forEach(([key, field]) => {
      if (query.includes(key)) targetField = field;
    });

    // 4. 그룹화 분석
    let groupBy = null;
    Object.entries(QUERY_PATTERNS.groupPatterns).forEach(([field, pattern]) => {
      if (pattern.test(query)) groupBy = field;
    });

    // 5. 부서 필터 분석 (기존 로직 유지)
    const departmentMatch = query.match(/(개발팀|인사팀|영업팀|재무팀)/);

    // 6. 결과 구조화
    return {
      type: aggregateType,
      filters: {
        ...timeFilters,
        ...(departmentMatch && { department: departmentMatch[1] })
      },
      groupBy,
      target: targetField,
      metadata: {
        confidence: calculateConfidence(query, targetField, aggregateType),
        originalQuery: query
      }
    };
  } catch (error) {
    console.error('쿼리 분석 중 오류:', error);
    return null;
  }
};

// 분석 신뢰도 계산
const calculateConfidence = (query, targetField, aggregateType) => {
  let confidence = 1.0;
  
  // 대상 필드가 명시적으로 언급되지 않은 경우
  if (!Object.values(TARGET_FIELD_MAP).includes(targetField)) {
    confidence *= 0.8;
  }
  
  // 집계 타입이 명시적으로 언급되지 않은 경우
  if (aggregateType === 'average' && !QUERY_PATTERNS.aggregatePatterns.average.test(query)) {
    confidence *= 0.9;
  }
  
  return confidence;
};

export { analyzeQuery }; 