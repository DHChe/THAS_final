import axios from 'axios';
import { API_BASE_URL, AI_ENDPOINTS } from '../config/apiConfig';

/**
 * 급여 데이터 및 직원 정보를 바탕으로 AI 분석을 요청하는 함수
 * 
 * @param {Array} filteredData - 필터링된 급여 데이터
 * @param {Array} employeesData - 직원 정보 데이터
 * @param {string} userQuery - 사용자의 자연어 쿼리
 * @returns {Promise<Object>} - AI 분석 결과
 */
const analyzeData = async (filteredData, employeesData, userQuery) => {
  try {
    console.log('AI 분석 요청 시작:', userQuery);
    
    // 데이터 포맷팅
    const formattedPayrollData = filteredData.map(record => {
      // 직원 정보 찾기
      const employee = employeesData.find(emp => emp.employee_id === record.employee_id) || {};
      
      // 필드명이 API 응답과 일치하는지 확인하고 필요한 필드만 포함
      return {
        ...record,
        employee_name: employee.name || '',
        department: employee.department || '',
        position: employee.position || '',
      };
    });

    const requestData = {
      query: userQuery,
      payrollData: formattedPayrollData,
      employeeData: employeesData,
      metadata: {
        recordCount: filteredData.length,
        employeeCount: employeesData.length,
        searchContext: {
          // 여기에 검색 컨텍스트 정보 추가 가능
        }
      }
    };

    console.log('요청 데이터:', {
      query: userQuery,
      dataSize: {
        payroll: filteredData.length,
        employees: employeesData.length
      }
    });

    // 상대 경로를 사용하여 API 요청 실행
    const response = await axios.post(`/api/payroll/insights`, requestData);

    console.log('AI 분석 응답 받음:', response.data);
    return response.data;
  } catch (error) {
    console.error('AI 분석 요청 실패:', error.response?.data || error);
    throw new Error(error.response?.data?.message || '데이터 분석 중 오류가 발생했습니다.');
  }
};

// 채팅 기록 저장 함수 (옵션)
const saveChatHistory = async (messages) => {
  try {
    await axios.post(`/api/chat/history`, {
      messages
    });
  } catch (error) {
    console.error('채팅 기록 저장 중 오류:', error);
    // 실패해도 사용자 경험에 영향을 주지 않도록 조용히 처리
  }
};

export { analyzeData, saveChatHistory };