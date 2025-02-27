/**
 * LLM 분석을 위한 프롬프트 템플릿 정의
 * 각 분석 상황에 맞는 지침과 형식을 제공
 */
export const PROMPT_TEMPLATES = {
    // 기본 분석 프롬프트
    DEFAULT_ANALYSIS: `
당신은 급여 데이터 분석 전문가입니다. 제공된 데이터를 기반으로 다음 지침에 따라 분석을 수행하세요:

1. 데이터 컨텍스트:
- 검색 기간: {searchPeriod}
- 총 직원 수: {totalEmployees}
- 분석 대상 데이터 수: {filteredRecords}

2. 분석 요구사항:
- 제공된 통계 데이터를 기반으로 의미있는 인사이트 도출
- 부서별 비교 분석 수행
- 시계열 패턴 파악
- 이상치나 특이사항 식별

3. 응답 형식:
[주요 발견 사항]
- 핵심 인사이트 3-5개 나열

[세부 분석]
- 발견된 패턴이나 트렌드
- 부서별 주요 차이점
- 잠재적 문제점이나 개선 기회

[권장 사항]
- 데이터 기반 추천사항 2-3개 제시

사용자 질문: {query}
`,

    // 부서별 분석 프롬프트
    DEPARTMENT_ANALYSIS: `
부서별 급여 데이터 분석을 수행하세요. 특히 다음 사항에 중점을 두어 분석하세요:

1. 부서간 급여 격차 분석
2. 각 부서의 급여 구조 특성
3. 부서별 급여 효율성 평가

[분석 대상 부서]
{departments}

[고려사항]
- 부서별 역할과 책임
- 산업 표준 대비 수준
- 형평성과 효율성 균형

사용자 질문: {query}
`,

    // 추세 분석 프롬프트
    TREND_ANALYSIS: `
급여 데이터의 시계열 패턴을 분석하세요. 다음 관점에서 분석을 수행하세요:

1. 전반적인 급여 추세
2. 계절성 또는 주기성
3. 특이 구간 식별

[분석 기간]
{timePeriod}

[중점 분석 항목]
- 증감 패턴
- 변동성
- 장기 트렌드

사용자 질문: {query}
`,

    // 개별 직원 분석 프롬프트
    EMPLOYEE_ANALYSIS: `
특정 직원 또는 직원 그룹의 급여 데이터를 분석하세요:

1. 개인별 급여 프로필
2. 유사 그룹 대비 수준
3. 경력 발전 패턴

[분석 대상]
{employeeDetails}

[고려사항]
- 직급과 경력
- 성과와 보상 연관성
- 발전 가능성

사용자 질문: {query}
`
};

/**
 * 질문 유형에 따른 프롬프트 선택
 * @param {string} query - 사용자 질문
 * @returns {string} 적절한 프롬프트 템플릿
 */
export const selectPromptTemplate = (query = '') => {
    if (!query) {
        return PROMPT_TEMPLATES.DEFAULT_ANALYSIS;
    }

    // 문자열 안전하게 처리
    const safeQuery = query.toLowerCase();
    
    // 부서 관련 질문
    if (safeQuery.includes('부서') || safeQuery.includes('팀')) {
        return PROMPT_TEMPLATES.DEPARTMENT_ANALYSIS;
    }
    
    // 추세 관련 질문
    if (safeQuery.includes('추세') || safeQuery.includes('트렌드') || safeQuery.includes('변화')) {
        return PROMPT_TEMPLATES.TREND_ANALYSIS;
    }
    
    // 특정 직원 관련 질문
    if (safeQuery.includes('직원') || safeQuery.includes('사원') || safeQuery.includes('이름')) {
        return PROMPT_TEMPLATES.EMPLOYEE_ANALYSIS;
    }
    
    // 기본 분석
    return PROMPT_TEMPLATES.DEFAULT_ANALYSIS;
};

export default {
    PROMPT_TEMPLATES,
    selectPromptTemplate
};
