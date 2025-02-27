// 검색 결과를 AI 분석용 포맷으로 변환
const formatDataForAI = (filteredData, employeesData) => {
  return filteredData.map(payroll => {
    const employee = employeesData.find(emp => emp.employee_id === payroll.employee_id);
    return {
      payment_date: payroll.payment_date,
      employee_id: payroll.employee_id,
      name: employee?.name,
      department: employee?.department,
      position: employee?.position,
      base_salary: payroll.base_salary,
      overtime_pay: payroll.overtime_pay,
      night_shift_pay: payroll.night_shift_pay,
      holiday_pay: payroll.holiday_pay,
      total_pay: Number(payroll.base_salary) + 
                Number(payroll.overtime_pay) + 
                Number(payroll.night_shift_pay) + 
                Number(payroll.holiday_pay)
    };
  });
};

// 기본 프롬프트 템플릿 생성
const createAnalysisPrompt = (userQuery, formattedData) => {
  return `
급여 데이터 분석 요청입니다.

[분석 대상 데이터]
${JSON.stringify(formattedData, null, 2)}

[사용자 질문]
${userQuery}

다음 가이드라인에 따라 분석해주세요:
1. 데이터를 기반으로 한 객관적인 분석을 제공해주세요.
2. 가능한 경우 수치와 통계를 포함해주세요.
3. 분석 결과는 명확하고 이해하기 쉽게 설명해주세요.
4. 필요한 경우 추가적인 인사이트나 제안을 포함해주세요.
`;
};

// 검색 결과 요약 함수
const summarizeSearchResults = (filteredData, employeesData) => {
  const summary = {
    totalRecords: filteredData.length,
    uniqueEmployees: new Set(filteredData.map(item => item.employee_id)).size,
    departments: {},
    totalAmount: 0,
    dateRange: {
      start: null,
      end: null
    }
  };

  // 데이터 분석
  filteredData.forEach(payroll => {
    const employee = employeesData.find(emp => emp.employee_id === payroll.employee_id);
    
    // 부서별 통계
    if (employee) {
      summary.departments[employee.department] = (summary.departments[employee.department] || 0) + 1;
    }

    // 총 금액 계산
    const totalPay = Number(payroll.base_salary) + 
                    Number(payroll.overtime_pay) + 
                    Number(payroll.night_shift_pay) + 
                    Number(payroll.holiday_pay);
    summary.totalAmount += totalPay;

    // 날짜 범위 업데이트
    const currentDate = payroll.payment_date;
    if (!summary.dateRange.start || currentDate < summary.dateRange.start) {
      summary.dateRange.start = currentDate;
    }
    if (!summary.dateRange.end || currentDate > summary.dateRange.end) {
      summary.dateRange.end = currentDate;
    }
  });

  return summary;
};

// 초기 AI 메시지 생성 함수
const generateInitialAIMessage = (summary) => {
  if (summary.totalRecords === 0) {
    return "검색 결과가 없습니다. 다른 검색 조건을 시도해보세요.";
  }

  const message = [
    `검색 결과 분석이 완료되었습니다.`,
    `\n📊 검색 결과 요약:`,
    `• 총 ${summary.totalRecords}건의 급여 데이터`,
    `• ${summary.uniqueEmployees}명의 직원 정보`,
    `• 기간: ${summary.dateRange.start} ~ ${summary.dateRange.end}`,
    `• 총 지급액: ${new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(summary.totalAmount)}`,
    `\n부서별 데이터 분포:`,
    Object.entries(summary.departments)
      .map(([dept, count]) => `• ${dept}: ${count}건`)
      .join('\n'),
    `\n원하시는 분석 내용을 질문해 주세요. 예시:`,
    `• "부서별 평균 급여는 얼마인가요?"`,
    `• "연장근무 수당이 가장 높은 부서는 어디인가요?"`,
    `• "직급별 기본급 분포를 알려주세요."`
  ].join('\n');

  return message;
};

module.exports = {
  formatDataForAI,
  createAnalysisPrompt,
  summarizeSearchResults,
  generateInitialAIMessage
};
