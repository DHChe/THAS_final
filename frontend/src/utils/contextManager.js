class ContextManager {
  constructor() {
    this.conversationHistory = [];
    this.searchContext = null;
    this.maxHistoryLength = 10; // 대화 기록 최대 유지 수
  }

  // 검색 컨텍스트 업데이트
  updateSearchContext(filters, results) {
    const summary = this.summarizeResults(results);
    
    this.searchContext = {
      filters,
      resultsSummary: summary,
      timestamp: new Date(),
      dataSnapshot: {
        totalCount: results.length,
        departments: this.extractUniqueDepartments(results),
        dateRange: filters.dateRange,
      }
    };
  }

  // 대화 기록 추가
  addConversation(message) {
    this.conversationHistory.push({
      ...message,
      context: { ...this.searchContext },
      timestamp: new Date()
    });

    // 최대 기록 수 유지
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory.shift();
    }
  }

  // 결과 요약 생성
  summarizeResults(results) {
    if (!results.length) return null;

    return {
      totalEmployees: results.length,
      departmentStats: this.calculateDepartmentStats(results),
      salaryStats: this.calculateSalaryStats(results)
    };
  }

  // 부서별 통계 계산
  calculateDepartmentStats(results) {
    const stats = {};
    results.forEach(record => {
      const dept = record.department;
      if (!stats[dept]) {
        stats[dept] = {
          count: 0,
          totalSalary: 0
        };
      }
      stats[dept].count++;
      stats[dept].totalSalary += Number(record.total_salary || 0);
    });
    return stats;
  }

  // 급여 통계 계산
  calculateSalaryStats(results) {
    const salaries = results.map(r => Number(r.total_salary || 0));
    return {
      average: salaries.reduce((a, b) => a + b, 0) / salaries.length,
      min: Math.min(...salaries),
      max: Math.max(...salaries)
    };
  }

  // 현재 컨텍스트 기반 프롬프트 생성
  generateContextualPrompt(userQuery) {
    return {
      systemContext: this.buildSystemContext(),
      recentHistory: this.getRecentHistory(3), // 최근 3개 대화만 포함
      currentQuery: userQuery,
      searchContext: this.searchContext
    };
  }

  // 시스템 컨텍스트 구성
  buildSystemContext() {
    if (!this.searchContext) return null;

    return {
      currentFilters: this.searchContext.filters,
      dataOverview: this.searchContext.resultsSummary,
      timestamp: this.searchContext.timestamp
    };
  }

  // 최근 대화 기록 조회
  getRecentHistory(count) {
    return this.conversationHistory.slice(-count);
  }

  // 고유 부서 추출
  extractUniqueDepartments(results) {
    return [...new Set(results.map(r => r.department))];
  }
}

export default ContextManager; 