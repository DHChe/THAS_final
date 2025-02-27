// axios 모킹을 위한 가짜 모듈 생성
const mockPost = jest.fn();
jest.mock('axios', () => ({
  post: (...args) => mockPost(...args)
}));

// 테스트할 모듈 import
const { analyzeData } = require('../aiService');

describe('AI Service Tests', () => {
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

  beforeEach(() => {
    mockPost.mockClear();
  });

  test('analyzeData should make correct API call', async () => {
    const mockResponse = { data: { analysis: '분석 결과입니다.' } };
    mockPost.mockResolvedValue(mockResponse);

    const userQuery = "총 급여가 가장 높은 직원은 누구인가요?";
    const result = await analyzeData(mockPayrollData, mockEmployeesData, userQuery);

    expect(mockPost).toHaveBeenCalled();
    expect(result).toEqual(mockResponse.data);
  });

  test('analyzeData should handle errors', async () => {
    mockPost.mockRejectedValue(new Error('API 오류'));

    await expect(analyzeData(mockPayrollData, mockEmployeesData, "query"))
      .rejects
      .toThrow('데이터 분석 중 오류가 발생했습니다.');
  });
});