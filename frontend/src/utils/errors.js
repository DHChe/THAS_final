/**
 * 데이터 검증 관련 에러
 */
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.code = 'VALIDATION_ERROR';
  }
}

/**
 * 데이터 로드 관련 에러
 */
export class DataLoadError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DataLoadError';
    this.code = 'DATA_LOAD_ERROR';
  }
}

/**
 * 데이터 처리 관련 에러
 */
export class ProcessingError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProcessingError';
    this.code = 'PROCESSING_ERROR';
  }
}

/**
 * AI 최적화 관련 에러
 */
export class OptimizationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OptimizationError';
    this.code = 'OPTIMIZATION_ERROR';
  }
}

/**
 * 데이터 형식 관련 에러
 */
export class DataFormatError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DataFormatError';
    this.code = 'DATA_FORMAT_ERROR';
  }
}

/**
 * 에러 메시지를 사용자 친화적으로 변환
 */
export const getUserFriendlyError = (error) => {
  const errorMessages = {
    VALIDATION_ERROR: '데이터 검증에 실패했습니다',
    DATA_LOAD_ERROR: '데이터를 불러오는데 실패했습니다',
    PROCESSING_ERROR: '데이터 처리 중 오류가 발생했습니다',
    OPTIMIZATION_ERROR: 'AI 최적화 중 오류가 발생했습니다',
    DATA_FORMAT_ERROR: '데이터 형식이 올바르지 않습니다'
  };

  return {
    message: errorMessages[error.code] || '알 수 없는 오류가 발생했습니다',
    details: error.message,
    code: error.code
  };
}; 