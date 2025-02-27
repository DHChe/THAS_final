import axios from 'axios';
import { API_BASE_URL, AI_ENDPOINTS } from '../config/apiConfig';

const analyzeData = async (filteredData, employeesData, userQuery) => {
  try {
    console.log('API 요청 시작');
    console.log('API URL:', `${API_BASE_URL}${AI_ENDPOINTS.analyze}`);
    
    // 데이터 포맷팅
    const formattedData = {
      payrollData: filteredData,
      employeeData: employeesData
    };

    const requestData = {
      prompt: userQuery,
      data: formattedData
    };

    console.log('요청 데이터:', {
      prompt: userQuery,
      dataSize: {
        payroll: filteredData.length,
        employees: employeesData.length
      }
    });

    const response = await axios.post(`${API_BASE_URL}${AI_ENDPOINTS.analyze}`, requestData);

    console.log('API 응답 받음:', response.data);
    return response.data;
  } catch (error) {
    console.error('API 요청 실패:', error.response?.data || error);
    throw new Error(error.response?.data?.message || '데이터 분석 중 오류가 발생했습니다.');
  }
};

// 채팅 기록 저장 함수 (옵션)
const saveChatHistory = async (messages) => {
  try {
    await axios.post(`${API_BASE_URL}${AI_ENDPOINTS.chat}/history`, {
      messages
    });
  } catch (error) {
    console.error('채팅 기록 저장 중 오류:', error);
    // 실패해도 사용자 경험에 영향을 주지 않도록 조용히 처리
  }
};

export { analyzeData, saveChatHistory };