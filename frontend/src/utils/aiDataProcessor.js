/**
 * 급여 데이터 전처리 및 LLM 최적화를 위한 유틸리티
 */

import { ValidationError, ProcessingError, OptimizationError, DataFormatError } from './errors.js';

/**
 * 데이터 유효성 검사
 * @param {Array} filteredData - 필터링된 급여 데이터
 * @param {Array} employeesData - 직원 정보
 * @throws {ValidationError} 데이터 유효성 검사 실패 시
 */
const validateInputData = (filteredData, employeesData) => {
  if (!Array.isArray(filteredData) || !Array.isArray(employeesData)) {
    throw new ValidationError('입력 데이터가 배열 형식이 아닙니다.');
  }

  if (filteredData.length === 0 || employeesData.length === 0) {
    throw new ValidationError('데이터가 비어있습니다.');
  }

  // 필수 필드 검사
  const requiredFields = ['employee_id', 'payment_date', 'base_salary'];
  filteredData.forEach((record, index) => {
    const missingFields = requiredFields.filter(field => !record[field]);
    if (missingFields.length > 0) {
      throw new ValidationError(
        `${index + 1}번째 레코드에서 필수 필드 누락: ${missingFields.join(', ')}`
      );
    }
  });
};

/**
 * 안전한 숫자 변환
 * @param {any} value - 변환할 값
 * @param {number} defaultValue - 기본값
 * @returns {number} 변환된 숫자
 */
const safeNumberConversion = (value, defaultValue = 0) => {
  const converted = Number(value);
  return isNaN(converted) ? defaultValue : converted;
};

/**
 * 날짜 유효성 검사 및 변환
 * @param {string} dateStr - 날짜 문자열
 * @returns {Date} 변환된 Date 객체
 * @throws {DataFormatError} 날짜 형식이 잘못된 경우
 */
const validateAndParseDate = (dateStr) => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new DataFormatError(`잘못된 날짜 형식: ${dateStr}`);
  }
  return date;
};

/**
 * 필터링된 데이터를 LLM 분석에 적합한 형태로 전처리
 * @param {Array} filteredData - 필터링된 급여 데이터
 * @param {Array} employeesData - 직원 기본 정보 데이터
 * @returns {Object} 전처리된 데이터
 */
export const preprocessPayrollData = (filteredData, employeesData) => {
  try {
    // 입력 데이터 유효성 검사
    validateInputData(filteredData, employeesData);

    const processedData = filteredData.map((record, index) => {
      try {
        // 필수 필드 검증
        const requiredFields = ['employee_id', 'base_salary', 'net_salary'];
        const missingFields = requiredFields.filter(field => !record[field]);
        if (missingFields.length > 0) {
          throw new ValidationError(
            `${index + 1}번째 레코드에서 필수 필드가 누락됨: ${missingFields.join(', ')}`
          );
        }

        // 직원 정보 매칭
        const employee = employeesData.find(emp => emp.employee_id === record.employee_id);
        if (!employee) {
          throw new ValidationError(
            `${record.employee_id} 직원의 기본 정보를 찾을 수 없습니다.`
          );
        }

        // 숫자 데이터 검증 및 변환
        const salaryFields = ['base_salary', 'net_salary', 'bonus'];
        salaryFields.forEach(field => {
          if (record[field] && isNaN(Number(record[field]))) {
            throw new ValidationError(
              `${index + 1}번째 레코드의 ${field}가 올바른 숫자 형식이 아닙니다.`
            );
          }
        });

        // 날짜 형식 통일 (YYYY-MM)
        const paymentMonth = record.payment_date.substring(0, 7);

        // 숫자 데이터 정규화
        const normalizedSalary = {
          base_salary: Number(record.base_salary) || 0,
          overtime_pay: Number(record.overtime_pay) || 0,
          night_shift_pay: Number(record.night_shift_pay) || 0,
          holiday_pay: Number(record.holiday_pay) || 0
        };

        // 총 급여 계산
        const total_salary = Object.values(normalizedSalary).reduce((sum, val) => sum + val, 0);

        return {
          ...record,
          ...employee,
          base_salary: Number(record.base_salary),
          net_salary: Number(record.net_salary),
          bonus: record.bonus ? Number(record.bonus) : 0,
          payment_month: paymentMonth,
          ...normalizedSalary,
          total_salary,
          data_type: 'payroll',
          processed_at: new Date().toISOString()
        };
      } catch (error) {
        throw new ProcessingError(
          `${index + 1}번째 레코드 처리 중 오류: ${error.message}`
        );
      }
    });

    return {
      success: true,
      data: processedData,
      metadata: {
        totalRecords: processedData.length,
        uniqueEmployees: new Set(processedData.map(d => d.employee_id)).size,
        period: {
          start: new Date(Math.min(...processedData.map(d => new Date(d.payment_date)))),
          end: new Date(Math.max(...processedData.map(d => new Date(d.payment_date))))
        }
      }
    };

  } catch (error) {
    console.error('데이터 전처리 실패:', error);
    return {
      success: false,
      error: error instanceof ValidationError ? error : new ProcessingError(error.message),
      data: []
    };
  }
};

/**
 * 데이터 최적화 (중복 제거, 불필요 필드 제거 등)
 * @param {Object} data - 전처리된 데이터
 * @returns {Object} 최적화된 데이터
 */
export const optimizeForLLM = (preprocessedData) => {
  try {
    if (!preprocessedData || !preprocessedData.success || !Array.isArray(preprocessedData.data)) {
      throw new ValidationError('전처리된 데이터가 올바른 형식이 아닙니다.');
    }

    const optimizedData = preprocessedData.data.map((record, index) => {
      try {
        return {
          id: record.employee_id,
          name: record.name,
          department: record.department,
          position: record.position,
          salary: {
            base: record.base_salary,
            net: record.net_salary,
            bonus: record.bonus || 0
          },
          payment_date: record.payment_date
        };
      } catch (error) {
        throw new OptimizationError(
          `${index + 1}번째 레코드 최적화 중 오류: ${error.message}`
        );
      }
    });

    return {
      success: true,
      data: optimizedData,
      metadata: {
        ...preprocessedData.metadata,
        optimized_at: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('LLM 최적화 실패:', error);
    return {
      success: false,
      error: error instanceof ValidationError ? error : new OptimizationError(error.message),
      data: []
    };
  }
};

/**
 * 급여 데이터 통계 분석
 */
export const aggregatePayrollData = (optimizedData) => {
  try {
    // 입력 데이터 검증
    if (!optimizedData || !optimizedData.success || !Array.isArray(optimizedData.data)) {
      throw new ValidationError('최적화된 데이터가 올바른 형식이 아닙니다.');
    }

    const data = optimizedData.data;
    if (data.length === 0) {
      throw new ValidationError('분석할 데이터가 없습니다.');
    }

    // 부서별 통계
    const department_stats = data.reduce((acc, record) => {
      try {
        const dept = record.department;
        if (!acc[dept]) {
          acc[dept] = {
            count: 0,
            total_salary: 0,
            avg_salary: 0,
            salary_range: { min: Infinity, max: -Infinity }
          };
        }

        const salary = record.salary.net;
        acc[dept].count += 1;
        acc[dept].total_salary += salary;
        acc[dept].salary_range.min = Math.min(acc[dept].salary_range.min, salary);
        acc[dept].salary_range.max = Math.max(acc[dept].salary_range.max, salary);
        acc[dept].avg_salary = acc[dept].total_salary / acc[dept].count;

        return acc;
      } catch (error) {
        throw new ProcessingError(`부서별 통계 계산 중 오류: ${error.message}`);
      }
    }, {});

    // 직급별 통계
    const position_stats = data.reduce((acc, record) => {
      try {
        const pos = record.position;
        if (!acc[pos]) {
          acc[pos] = {
            count: 0,
            total_salary: 0,
            avg_salary: 0,
            bonus_stats: { total: 0, avg: 0 }
          };
        }

        const { net, bonus } = record.salary;
        acc[pos].count += 1;
        acc[pos].total_salary += net;
        acc[pos].bonus_stats.total += bonus || 0;
        acc[pos].avg_salary = acc[pos].total_salary / acc[pos].count;
        acc[pos].bonus_stats.avg = acc[pos].bonus_stats.total / acc[pos].count;

        return acc;
      } catch (error) {
        throw new ProcessingError(`직급별 통계 계산 중 오류: ${error.message}`);
      }
    }, {});

    // 전체 통계
    const overall_stats = {
      total_employees: data.length,
      avg_salary: data.reduce((sum, r) => sum + r.salary.net, 0) / data.length,
      salary_range: {
        min: Math.min(...data.map(r => r.salary.net)),
        max: Math.max(...data.map(r => r.salary.net))
      },
      total_bonus: data.reduce((sum, r) => sum + (r.salary.bonus || 0), 0)
    };

    return {
      success: true,
      data: {
        department_stats,
        position_stats,
        overall_stats,
        analysis_date: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('급여 데이터 집계 실패:', error);
    return {
      success: false,
      error: error instanceof ValidationError ? error : new ProcessingError(error.message),
      data: null
    };
  }
};

/**
 * RAG 시스템을 위한 급여 데이터 전처리
 * @param {Array} filteredData - 필터링된 급여 데이터
 * @param {Array} employeesData - 직원 기본 정보
 * @returns {Object} 전처리된 데이터와 메타데이터
 */
export const preprocessForRAG = (filteredData, employeesData) => {
  try {
    // 입력 데이터 유효성 검사
    validateInputData(filteredData, employeesData);

    // 데이터 통합 및 정규화
    const processedData = filteredData.map(record => {
      const employee = employeesData.find(emp => emp.employee_id === record.employee_id);
      
      // 급여 항목 정규화 (0~1 스케일)
      const salaryFields = ['base_salary', 'overtime_pay', 'night_shift_pay', 'holiday_pay'];
      const normalizedSalaries = {};
      
      salaryFields.forEach(field => {
        const values = filteredData.map(r => Number(r[field] || 0));
        const max = Math.max(...values);
        const min = Math.min(...values);
        normalizedSalaries[field] = max === min ? 
          0 : (Number(record[field] || 0) - min) / (max - min);
      });

      return {
        metadata: {
          employee_id: record.employee_id,
          department: employee?.department || '부서미상',
          position: employee?.position || '직급미상',
          name: employee?.name || '이름미상'
        },
        raw_data: {
          ...record,
          ...employee
        },
        normalized_values: normalizedSalaries,
        department: employee?.department || '부서미상',
        position: employee?.position || '직급미상',
        name: employee?.name || '이름미상',
        base_salary: record.base_salary,
        overtime_pay: record.overtime_pay,
        night_shift_pay: record.night_shift_pay,
        holiday_pay: record.holiday_pay
      };
    });

    return {
      success: true,
      data: processedData,
      metadata: {
        total_records: processedData.length,
        departments: [...new Set(processedData.map(d => d.metadata.department))],
        positions: [...new Set(processedData.map(d => d.metadata.position))]
      }
    };

  } catch (error) {
    console.error('RAG 데이터 전처리 실패:', error);
    return {
      success: false,
      error,
      metadata: {
        error_timestamp: new Date().toISOString(),
        error_type: error.constructor.name
      }
    };
  }
};
