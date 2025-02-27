/**
 * File: frontend/src/utils/format.js
 * Description: 데이터 포맷팅을 위한 유틸리티 함수들
 */

/**
 * 날짜를 한국 형식으로 포맷팅
 * @param {string|Date} date - 날짜
 * @returns {string} 포맷팅된 날짜 문자열
 */
export const formatDate = (date) => {
    if (!date) return '-';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };
  
  /**
   * 숫자를 통화 형식으로 포맷팅
   * @param {number} number - 숫자
   * @returns {string} 포맷팅된 숫자 문자열
   */
  export const formatNumber = (number) => {
    if (number === undefined || number === null) return '-';
    
    return new Intl.NumberFormat('ko-KR').format(number);
  };
  
  /**
   * 근속연수 계산
   * @param {string|Date} joinDate - 입사일
   * @returns {string} 근속연수 문자열
   */
  export const calculateYearsOfService = (joinDate) => {
    if (!joinDate) return '-';
    
    const join = new Date(joinDate);
    if (isNaN(join.getTime())) return '-';
    
    const today = new Date();
    const years = today.getFullYear() - join.getFullYear();
    const months = today.getMonth() - join.getMonth();
    
    if (months < 0) {
      return `${years - 1}년 ${months + 12}개월`;
    }
    
    return `${years}년 ${months}개월`;
  };