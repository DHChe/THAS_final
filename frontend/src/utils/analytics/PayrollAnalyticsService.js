import StatisticsCalculator from './StatisticsCalculator';

/**
 * 급여 데이터 분석을 위한 하이브리드 서비스 클래스
 * 통계 계산과 LLM 기반 분석을 결합
 */
class PayrollAnalyticsService {
    /**
     * @param {Array} filteredData - 필터링된 급여 데이터
     * @param {Array} employeesData - 직원 정보 데이터
     * @param {Object} searchParams - 검색 파라미터 (기간, 부서 등)
     */
    constructor(filteredData, employeesData, searchParams) {
        this.payrollData = filteredData;
        this.employeesData = employeesData;
        this.searchParams = searchParams;
        this.statistics = null;
    }

    /**
     * 데이터 분석 실행 및 LLM 인사이트 요청
     * @param {string} query - 사용자 질문
     * @param {string} promptTemplate - 프롬프트 템플릿
     * @returns {Promise<Object>} LLM 응답 결과
     */
    async analyze(query, promptTemplate) {
        try {
            // 1. 기본 통계 계산
            this.statistics = StatisticsCalculator.calculateStatistics(
                this.payrollData,
                this.employeesData
            );

            // 2. LLM에 전달할 데이터 준비
            const enrichedData = this._prepareDataForLLM(query);

            // 3. 프롬프트 템플릿 적용
            const finalPrompt = this._applyPromptTemplate(promptTemplate, enrichedData);

            // 4. LLM 분석 요청
            return await this._requestLLMAnalysis({
                ...enrichedData,
                prompt: finalPrompt
            });
        } catch (error) {
            console.error('급여 분석 중 오류 발생:', error);
            throw new Error('급여 데이터 분석 중 오류가 발생했습니다.');
        }
    }

    /**
     * LLM에 전달할 데이터 준비
     * @private
     */
    _prepareDataForLLM(query) {
        // 검색 기간 포맷팅
        const { startDate, endDate } = this.searchParams;
        const searchPeriod = {
            start: startDate ? new Date(startDate).toLocaleDateString('ko-KR') : '날짜 미지정',
            end: endDate ? new Date(endDate).toLocaleDateString('ko-KR') : '날짜 미지정'
        };

        // 부서별 통계 요약
        const departmentSummary = Object.entries(this.statistics.departmental)
            .map(([dept, stats]) => ({
                department: dept,
                employeeCount: stats.count,
                averageBaseSalary: stats.averageBase,
                averageTotalSalary: stats.averageTotal
            }));

        // 시계열 데이터 정리
        const timeSeriesSummary = Object.entries(this.statistics.timeSeries)
            .map(([month, stats]) => ({
                month,
                averageBaseSalary: stats.averageBase,
                averageTotalSalary: stats.averageTotal
            }))
            .sort((a, b) => a.month.localeCompare(b.month));

        return {
            query,
            searchContext: {
                period: searchPeriod,
                totalEmployees: this.employeesData.length,
                filteredRecords: this.payrollData.length
            },
            statistics: {
                overall: this.statistics.overall,
                departmental: departmentSummary,
                timeSeries: timeSeriesSummary
            },
            // 상세 데이터 샘플 (필요한 경우)
            sampleData: this._prepareSampleData()
        };
    }

    /**
     * 대표적인 데이터 샘플 준비
     * @private
     */
    _prepareSampleData() {
        // 최대 10개의 대표 데이터 선택
        return this.payrollData.slice(0, 10).map(payroll => {
            const employee = this.employeesData.find(
                emp => emp.employee_id === payroll.employee_id
            );
            return {
                employeeId: payroll.employee_id,
                department: employee?.department,
                position: employee?.position,
                baseSalary: payroll.base_salary,
                totalSalary: payroll.gross_salary,
                paymentDate: payroll.payment_date
            };
        });
    }

    /**
     * LLM API 요청
     * @private
     */
    async _requestLLMAnalysis(enrichedData) {
        try {
            const response = await fetch('/api/ai/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(enrichedData)
            });

            if (!response.ok) {
                throw new Error('LLM API 요청 실패');
            }

            return await response.json();
        } catch (error) {
            console.error('LLM 분석 요청 중 오류:', error);
            throw new Error('AI 분석 처리 중 오류가 발생했습니다.');
        }
    }

    /**
     * 프롬프트 템플릿 적용
     * @private
     */
    _applyPromptTemplate(template, data) {
        if (!template) {
            console.warn('프롬프트 템플릿이 제공되지 않았습니다. 기본 템플릿을 사용합니다.');
            return PROMPT_TEMPLATES.DEFAULT_ANALYSIS;
        }

        // 템플릿의 플레이스홀더를 실제 데이터로 치환
        return template.replace(
            /{(\w+)}/g,
            (match, key) => {
                if (key === 'query' && data.query) return data.query;
                if (key === 'searchPeriod' && data.searchContext?.period) {
                    return `${data.searchContext.period.start} ~ ${data.searchContext.period.end}`;
                }
                if (key === 'totalEmployees' && data.searchContext?.totalEmployees) {
                    return data.searchContext.totalEmployees.toString();
                }
                if (key === 'filteredRecords' && data.searchContext?.filteredRecords) {
                    return data.searchContext.filteredRecords.toString();
                }
                return match; // 매칭되는 데이터가 없으면 원본 유지
            }
        );
    }
}

export default PayrollAnalyticsService;
