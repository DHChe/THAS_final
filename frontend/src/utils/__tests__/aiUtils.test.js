import { formatDataForAI, createAnalysisPrompt } from '../aiUtils';

describe('AI Utilities Tests', () => {
  // 테스트용 더미 데이터
  const mockPayrollData = [{
    employee_id: '1',
    payment_date: '2024-03-20',
    base_salary: '3000000',
    overtime_pay: '200000',
    night_shift_pay: '150000',
    holiday_pay: '100000'
  }];

  const mockEmployeesData = [{
    employee_id: '1',
    name: '홍길동',
    department: 'IT',
    position: '개발자'
  }];

  test('formatDataForAI should correctly format data', () => {
    const result = formatDataForAI(mockPayrollData, mockEmployeesData);
    
    expect(result[0]).toHaveProperty('name', '홍길동');
    expect(result[0]).toHaveProperty('total_pay', 3450000);
    expect(result[0].department).toBe('IT');
  });

  test('createAnalysisPrompt should generate correct prompt', () => {
    const formattedData = formatDataForAI(mockPayrollData, mockEmployeesData);
    const userQuery = "총 급여가 가장 높은 직원은 누구인가요?";
    
    const prompt = createAnalysisPrompt(userQuery, formattedData);
    
    expect(prompt).toContain('사용자 질문');
    expect(prompt).toContain(userQuery);
    expect(prompt).toContain('홍길동');
  });
});