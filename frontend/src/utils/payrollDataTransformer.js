export const transformPayrollData = (data, mode, startDate, endDate, employeesData) => {
  switch (mode) {
    case 'monthly':
      return transformToMonthlyView(data, employeesData);
    case 'comparison':
      return transformToComparisonView(data, startDate, endDate);
    case 'trend':
      return transformToTrendView(data);
    case 'summary':
      return transformToSummaryView(data, startDate, endDate);
    default:
      return data.map(row => {
        const employee = employeesData.find(emp => emp.employee_id === row.employee_id);
        return {
          ...row,
          name: employee?.name,
          department: employee?.department,
          position: employee?.position
        };
      });
  }
};

const transformToMonthlyView = (data) => {
  const monthlyData = data.reduce((acc, curr) => {
    const month = curr.payment_date.substring(0, 7);
    if (!acc[month]) {
      acc[month] = {
        month,
        total_employees: 0,
        total_salary: 0,
        salaries: []
      };
    }
    
    const totalSalary = Number(curr.base_salary) + 
                       Number(curr.overtime_pay) + 
                       Number(curr.night_shift_pay) + 
                       Number(curr.holiday_pay);
    
    acc[month].total_employees++;
    acc[month].total_salary += totalSalary;
    acc[month].salaries.push(totalSalary);
    
    return acc;
  }, {});

  return Object.values(monthlyData).map(month => ({
    ...month,
    avg_salary: month.total_salary / month.total_employees,
    max_salary: Math.max(...month.salaries),
    min_salary: Math.min(...month.salaries)
  }));
};

// ... 나머지 변환 함수들도 유사한 방식으로 구현 