// frontend/src/context/EmployeeContext.js
// 설명: React Context API를 사용해 직원 데이터를 관리하는 파일입니다. 직원 데이터를 백엔드에서 가져옵니다.
// 라이브러리:
// - React: UI 라이브러리 (이미 프로젝트에 포함)
// - fetch: 브라우저 기본 API (추가 설치 불필요)

import React, { createContext, useContext, useState, useEffect } from 'react';

// 직원 컨텍스트 생성
const EmployeeContext = createContext();

export const useEmployees = () => {
  // 설명: EmployeeContext에서 직원 데이터를 사용하기 위한 훅
  // 예시: const { employees, loading, error } = useEmployees();로 사용
  return useContext(EmployeeContext);
};

export const EmployeeProvider = ({ children }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWithTimeout = async (url, options = {}, timeout = 5000) => {
    // 설명: fetch에 타임아웃을 추가한 함수로, 5초 내 응답이 없으면 요청 취소
    // 예시: fetchWithTimeout('http://localhost:5000/api/employees')로 백엔드 호출
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  const fetchEmployees = async () => {
    // 설명: 백엔드에서 직원 데이터를 가져오는 함수, JSON 파싱 오류 방지 및 데이터 정제, 디버깅
    // 예시: http://localhost:5000/api/employees에서 데이터를 받아 상태에 저장
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithTimeout('http://localhost:5000/api/employees', {
        headers: { 'Accept': 'application/json' }, // 명시적 JSON 요청
      });
      if (!response.ok) throw new Error(`서버 응답 오류: ${response.status} ${response.statusText}`);
      const data = await response.json();
      // 데이터 정제: 백엔드 데이터 형식을 유연하게 처리
      const cleanedData = Array.isArray(data) ? data.map(employee => ({
        employee_id: String(employee.employee_id || ''), // 문자열로 강제 변환
        base_salary: Number(employee.base_salary) || 0,
        family_count: Number(employee.family_count) || 0,
        name: String(employee.name || '').trim(),
        department: String(employee.department || '').trim(),
        position: String(employee.position || '').trim(),
        status: String(employee.status || '').trim(), // status 필드 추가 및 기본값 설정
      })).filter(employee => 
        employee.employee_id !== '' && 
        employee.status.toLowerCase() === '재직중' && 
        employee.name !== '' && 
        employee.department !== ''
      ) : [];
      setEmployees(cleanedData);
    } catch (error) {
      console.error('직원 데이터 로드 실패:', error);
      setError(`직원 데이터를 로드할 수 없습니다. 서버를 확인하세요: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 설명: 컴포넌트 마운트 시 직원 데이터를 로드
    // 예시: 페이지 로드 시 자동으로 직원 데이터를 가져옴
    fetchEmployees();
  }, []);

  const value = {
    employees,
    loading,
    error,
  };

  return (
    <EmployeeContext.Provider value={value}>
      {children}
    </EmployeeContext.Provider>
  );
};