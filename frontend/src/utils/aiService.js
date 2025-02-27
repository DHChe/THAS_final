// 검색 결과 데이터를 요약하는 함수
export const summarizeSearchResults = (filtered, employees, startDate, endDate) => {
  const uniqueEmployees = new Set(filtered.map(item => item.employee_id));
  const departmentCounts = filtered.reduce((acc, curr) => {
    const employee = employees.find(emp => emp.employee_id === curr.employee_id);
    if (employee) {
      const dept = employee.department.replace('팀', '');  // '팀' 제거
      acc[dept] = (acc[dept] || 0) + 1;
    }
    return acc;
  }, {});

  // dayjs 객체인지 확인하고 안전하게 포맷팅
  const formatDate = (date) => {
    if (!date) return '';
    return date.isValid() ? date.format('YYYY-MM') : '';
  };

  const periodText = startDate && endDate
    ? `${formatDate(startDate)} ~ ${formatDate(endDate)}`
    : '기간 미지정';

  return {
    totalCount: filtered.length,
    employeeCount: uniqueEmployees.size,
    period: periodText,
    departmentDistribution: departmentCounts
  };
};

// AI 메시지 생성 함수
export const generateInitialAIMessage = (summary) => {
  return `🔍 검색 결과 분석\n
📌 기본 정보
• 총 ${summary.totalCount}건의 급여 데이터
• ${summary.employeeCount}명의 직원 데이터
• 검색 기간: ${summary.period}\n
📋 부서별 데이터 분포
${Object.entries(summary.departmentDistribution)
  .map(([dept, count]) => `• ${dept}: ${count}건`)
  .join('\n')}\n
💡 어떤 분석을 도와드릴까요?`;
};