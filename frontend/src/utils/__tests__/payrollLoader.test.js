import { loadPayrollData } from '../payrollLoader';

describe('loadPayrollData', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    // 캐시 초기화를 위해 모듈 자체를 리셋
    jest.resetModules();
    // cachedData 초기화
    jest.isolateModules(() => {
      require('../payrollLoader').cachedData = null;
    });
  });

  test('should load and parse CSV data correctly', async () => {
    // 모든 필수 필드를 포함한 CSV Mock 데이터
    const mockCSV = 
      "employee_id,name,department,position,base_salary,position_allowance,overtime_pay,night_shift_pay,holiday_pay,meal_allowance,transportation_allowance,bonus,gross_salary,national_pension,health_insurance,long_term_care,employment_insurance,income_tax,local_income_tax,net_salary,payment_date\n" +
      "E001,홍길동,개발,대리,3000000,100000,200000,100000,150000,100000,50000,0,3700000,120000,80000,10000,20000,150000,15000,3305000,2024-03-15";

    // Mock 응답 설정
    fetchMock.mockResponseOnce(mockCSV, {
      status: 200,
      headers: { 'content-type': 'text/csv' }
    });

    const result = await loadPayrollData();
    
    // 결과 검증
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    
    // 데이터 구조 및 타입 검증
    const payrollData = result[0];
    expect(payrollData).toEqual({
      employee_id: 'E001',
      name: '홍길동',
      department: '개발',
      position: '대리',
      base_salary: 3000000,
      position_allowance: 100000,
      overtime_pay: 200000,
      night_shift_pay: 100000,
      holiday_pay: 150000,
      meal_allowance: 100000,
      transportation_allowance: 50000,
      bonus: 0,
      gross_salary: 3700000,
      national_pension: 120000,
      health_insurance: 80000,
      long_term_care: 10000,
      employment_insurance: 20000,
      income_tax: 150000,
      local_income_tax: 15000,
      net_salary: 3305000,
      payment_date: '2024-03-15'
    });
  });

  test('should handle CSV parsing errors', async () => {
    const invalidCSV = "invalid,csv,data\nwithout,proper,headers";
    fetchMock.mockResponseOnce(invalidCSV);
    
    // 새로운 인스턴스의 loadPayrollData 함수 가져오기
    const { loadPayrollData: freshLoadPayrollData } = require('../payrollLoader');
    const result = await freshLoadPayrollData();
    expect(result).toEqual([]);
  });

  test('should handle network errors', async () => {
    fetchMock.mockRejectOnce(new Error('Network Error'));
    
    // 새로운 인스턴스의 loadPayrollData 함수 가져오기
    const { loadPayrollData: freshLoadPayrollData } = require('../payrollLoader');
    const result = await freshLoadPayrollData();
    expect(result).toEqual([]);
  });
}); 