import { useState, useCallback } from 'react';
import { getUserFriendlyError } from '../utils/errors.js';

/**
 * 에러 처리를 위한 커스텀 훅
 * - 에러 상태 관리
 * - 사용자 친화적 에러 메시지 생성
 * - 에러 복구 기능 제공
 */
export const useErrorHandler = () => {
  const [error, setError] = useState(null);

  const handleError = useCallback((error) => {
    const friendlyError = getUserFriendlyError(error);
    setError(friendlyError);
    
    // 에러 로깅 (필요한 경우)
    console.error('Error occurred:', error);
    
    return friendlyError;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError
  };
};
