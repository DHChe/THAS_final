class PayrollAnalyticsService {
  constructor() {
    this.statisticsCalculator = new StatisticsCalculator();
  }

  // 데이터 전처리 함수 수정
  _prepareDataForAnalysis(rawData) {
    try {
      console.group('급여 데이터 전처리 상세 로그');
      
      // 원본 데이터 로깅
      const firstRow = rawData[0];
      console.log('원본 데이터 첫 행:', {
        overtime_pay: firstRow.overtime_pay,
        night_shift_pay: firstRow.night_shift_pay,
        holiday_pay: firstRow.holiday_pay
      });

      const processedData = rawData.map(row => {
        // CSV에서 읽어온 문자열 값을 숫자로 변환
        const processed = {
          ...row,
          payment_id: row.payment_id,
          employee_id: row.employee_id,
          payment_date: row.payment_date,
          department: row.department,
          position: row.position,
          
          // 수치 데이터 변환
          base_salary: this._parseNumericValue(row.base_salary),
          position_allowance: this._parseNumericValue(row.position_allowance),
          overtime_pay: this._parseNumericValue(row.overtime_pay),
          night_shift_pay: this._parseNumericValue(row.night_shift_pay),
          holiday_pay: this._parseNumericValue(row.holiday_pay),
          meal_allowance: this._parseNumericValue(row.meal_allowance),
          transportation_allowance: this._parseNumericValue(row.transportation_allowance),
          bonus: this._parseNumericValue(row.bonus),
          gross_salary: this._parseNumericValue(row.gross_salary)
        };

        // 변환된 데이터 검증 로깅
        console.log('데이터 변환 결과:', {
          ID: processed.payment_id,
          연장수당: {
            before: row.overtime_pay,
            after: processed.overtime_pay
          },
          야간수당: {
            before: row.night_shift_pay,
            after: processed.night_shift_pay
          },
          휴일수당: {
            before: row.holiday_pay,
            after: processed.holiday_pay
          }
        });

        return processed;
      });

      console.groupEnd();
      return processedData;
    } catch (error) {
      console.error('데이터 전처리 중 오류:', error);
      throw error;
    }
  }

  // 숫자 변환 헬퍼 함수 추가
  _parseNumericValue(value) {
    try {
      // 입력값이 undefined나 null인 경우
      if (value == null) return 0;
      
      // 이미 숫자인 경우
      if (typeof value === 'number') return value;
      
      // 문자열 정제 및 변환
      const cleanValue = value.toString()
        .replace(/[,원\s]/g, '')  // 쉼표, '원' 문자, 공백 제거
        .trim();
      
      const numericValue = Number(cleanValue);
      
      // 변환 과정 로깅
      console.log('숫자 변환:', {
        입력값: value,
        정제값: cleanValue,
        변환결과: numericValue
      });

      return isNaN(numericValue) ? 0 : numericValue;
    } catch (error) {
      console.error('숫자 변환 중 오류:', error);
      return 0;
    }
  }

  // 필터링 함수 수정
  async filterAndAnalyzeData(data, filters) {
    try {
      console.group('필터링 및 분석 상세 로그');
      console.log('필터 조건:', filters);
      console.log('입력 데이터 샘플:', data[0]);

      const processedData = this._prepareDataForAnalysis(data);
      
      // 필터링 전 데이터 확인
      console.log('전처리 후 첫 번째 행:', processedData[0]);
      
      const filteredData = processedData.filter(row => {
        const dateMatch = this._checkDateFilter(row.payment_date, filters);
        const deptMatch = !filters.department || row.department === filters.department;
        const positionMatch = !filters.position || row.position === filters.position;
        
        // 필터 조건 매칭 로깅
        console.log('필터 매칭:', {
          행: row.payment_id,
          날짜매칭: dateMatch,
          부서매칭: deptMatch,
          직급매칭: positionMatch
        });

        return dateMatch && deptMatch && positionMatch;
      });

      // 필터링 결과 상세 검증
      console.log('필터링된 데이터 수:', filteredData.length);
      if (filteredData.length > 0) {
        const sampleRow = filteredData[0];
        console.log('필터링 결과 상세:', {
          ID: sampleRow.payment_id,
          날짜: sampleRow.payment_date,
          부서: sampleRow.department,
          직급: sampleRow.position,
          기본급: sampleRow.base_salary,
          연장수당: sampleRow.overtime_pay,
          야간수당: sampleRow.night_shift_pay,
          휴일수당: sampleRow.holiday_pay
        });
      }

      console.groupEnd();
      return filteredData;
    } catch (error) {
      console.error('필터링 및 분석 중 상세 오류:', error);
      throw error;
    }
  }

  // 날짜 필터 체크 헬퍼 함수
  _checkDateFilter(paymentDate, filters) {
    if (!filters.period) return true;
    
    const date = new Date(paymentDate);
    const filterDate = new Date(filters.period);
    
    return date.getFullYear() === filterDate.getFullYear() &&
           date.getMonth() === filterDate.getMonth();
  }
}

export default PayrollAnalyticsService; 