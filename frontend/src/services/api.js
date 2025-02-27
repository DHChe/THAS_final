import axios from 'axios';

// API 기본 설정
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// 요청 인터셉터 - JWT 토큰 추가
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * 급여 현황 요약 데이터 조회
 * @returns {Promise<Object>} 급여 통계 정보
 */
export const fetchPayrollSummary = async () => {
  try {
    const response = await api.get('/payroll/summary');
    return response.data.data;
  } catch (error) {
    console.error('급여 요약 데이터 조회 실패:', error);
    throw error;
  }
};

/**
 * 현재 월 급여 데이터 조회
 * @returns {Promise<Object>} 급여 데이터 및 메타 정보
 */
export const fetchCurrentMonthPayroll = async () => {
  try {
    const response = await api.get('/payroll/current-month');
    return response.data;
  } catch (error) {
    console.error('현재 월 급여 데이터 조회 실패:', error);
    throw error;
  }
};

// ... 기존 코드 유지 ...

/**
 * 인사 현황 요약 정보 조회
 */
export const fetchHRSummary = async () => {
    try {
      const response = await api.get('/hr/summary');
      return response.data.data;
    } catch (error) {
      console.error('인사 현황 요약 조회 실패:', error);
      throw error;
    }
  };
  
  /**
   * 직원 검색
   */
  export const searchEmployees = async (params) => {
    try {
      const response = await api.get('/hr/employees', { params });
      return response.data.data;
    } catch (error) {
      console.error('직원 검색 실패:', error);
      throw error;
    }
  };
  
  /**
   * 직원 상세 정보 조회
   * @param {string} employeeId - 직원 ID
   * @returns {Promise<Object>} 직원 상세 정보
   */
  export const fetchEmployeeDetails = async (employeeId) => {
    try {
      const response = await api.get(`/hr/employees/${employeeId}`);
      return response.data.data;
    } catch (error) {
      console.error('직원 상세 정보 조회 실패:', error);
      throw error;
    }
  };

  /**
   * 직원 정보 업데이트
   * @param {string} employeeId - 직원 ID
   * @param {Object} data - 업데이트할 직원 정보
   * @returns {Promise<Object>} 업데이트된 직원 정보
   */
  export const updateEmployee = async (employeeId, data) => {
    try {
      const response = await api.put(`/hr/employees/${employeeId}`, data);
      return response.data;
    } catch (error) {
      console.error('직원 정보 업데이트 실패:', error);
      throw error;
    }
  };