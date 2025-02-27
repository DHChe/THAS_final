export const TestLogger = {
  results: [],
  
  logTestResult(testCase, result, metadata) {
    const testResult = {
      timestamp: new Date().toISOString(),
      testCase,
      result,
      metadata,
      environment: process.env.NODE_ENV
    };
    
    this.results.push(testResult);
    
    // 콘솔 출력 포맷팅
    console.group(`테스트 케이스: ${testCase.description}`);
    console.log('결과:', result ? '성공' : '실패');
    console.log('메타데이터:', metadata);
    console.groupEnd();
    
    return testResult;
  },
  
  getSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.result).length;
    
    return {
      total,
      passed,
      failed: total - passed,
      successRate: `${((passed / total) * 100).toFixed(1)}%`
    };
  },
  
  clear() {
    this.results = [];
  }
}; 