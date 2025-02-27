import { 
    preprocessPayrollData, 
    optimizeForLLM, 
    aggregatePayrollData 
  } from '../aiDataProcessor';
  
  // 테스트용 샘플 데이터
  const mockEmployeesData = [
    { employee_id: "E001", name: "홍길동", department: "개발", position: "대리" },
    { employee_id: "E002", name: "김철수", department: "영업", position: "과장" }
  ];
  
  const mockPayrollData = [
    {
      employee_id: "E001",
      payment_date: "2024-01-15",
      base_salary: "3000000",
      overtime_pay: "200000",
      night_shift_pay: "100000",
      holiday_pay: "150000"
    },
    {
      employee_id: "E002",
      payment_date: "2024-01-15",
      base_salary: "3500000",
      overtime_pay: "300000",
      night_shift_pay: "0",
      holiday_pay: "200000"
    }
  ];
  
  // 1. preprocessPayrollData 테스트
  describe('preprocessPayrollData 테스트', () => {
    test('기본 데이터 처리 확인', () => {
      const result = preprocessPayrollData(mockPayrollData, mockEmployeesData);
      
      // 테스트 항목들
      expect(result.success).toBe(true);                    // 성공 여부 확인
      expect(result.data).toHaveLength(2);                  // 데이터 개수 확인
      expect(result.data[0].name).toBe('홍길동');           // 이름 매칭 확인
      expect(result.data[0].department).toBe('개발');       // 부서 매칭 확인
      
      // 급여 계산 확인
      const expectedTotal = 3000000 + 200000 + 100000 + 150000;
      expect(result.data[0].total_salary).toBe(expectedTotal);
    });
  });
  
  // 2. optimizeForLLM 테스트
  describe('optimizeForLLM 테스트', () => {
    test('데이터 최적화 확인', () => {
      // 먼저 데이터 전처리
      const preprocessed = preprocessPayrollData(mockPayrollData, mockEmployeesData);
      // 최적화 실행
      const result = optimizeForLLM(preprocessed);
      
      expect(result.success).toBe(true);
      // 필요한 필드만 있는지 확인
      expect(result.data[0]).toHaveProperty('salary_breakdown');
      expect(result.data[0].salary_breakdown).toHaveProperty('base');
      expect(result.data[0].salary_breakdown).toHaveProperty('overtime');
    });
  });
  
  // 3. aggregatePayrollData 테스트
  describe('aggregatePayrollData 테스트', () => {
    test('통계 처리 확인', () => {
      // 전체 프로세스 테스트
      const preprocessed = preprocessPayrollData(mockPayrollData, mockEmployeesData);
      const optimized = optimizeForLLM(preprocessed);
      const result = aggregatePayrollData(optimized);
      
      // 부서별 통계 확인
      expect(result.data.department_stats).toBeDefined();
      expect(result.data.department_stats['개발']).toBeDefined();
      expect(result.data.department_stats['개발'].count).toBe(1);
      
      // 직급별 통계 확인
      expect(result.data.position_stats).toBeDefined();
      expect(result.data.position_stats['대리']).toBeDefined();
      expect(result.data.position_stats['대리'].count).toBe(1);
    });
  });