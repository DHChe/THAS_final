import React from 'react';
import { 
  Alert, 
  AlertTitle, 
  Box, 
  Button, 
  Collapse, 
  IconButton 
} from '@mui/material';
import { Close as CloseIcon, Refresh as RefreshIcon } from '@mui/icons-material';

/**
 * 에러 메시지 표시 컴포넌트
 * @param {Object} props
 * @param {Object} props.error - 에러 객체 (message, details, code 포함)
 * @param {Function} props.onClose - 에러 메시지 닫기 핸들러
 * @param {Function} props.onRetry - 작업 재시도 핸들러
 * @param {string} props.className - 추가 스타일링을 위한 클래스
 */
const ErrorDisplay = ({ error, onClose, onRetry, className }) => {
  if (!error) return null;

  // 에러 코드에 따른 심각도 매핑
  const severityMap = {
    VALIDATION_ERROR: 'warning',
    DATA_LOAD_ERROR: 'error',
    PROCESSING_ERROR: 'error',
    OPTIMIZATION_ERROR: 'error'
  };

  // 에러 코드에 따른 조치 방법 매핑
  const actionMap = {
    VALIDATION_ERROR: '입력 데이터를 확인하고 다시 시도해주세요.',
    DATA_LOAD_ERROR: '페이지를 새로고침하거나 잠시 후 다시 시도해주세요.',
    PROCESSING_ERROR: '시스템 관리자에게 문의해주세요.',
    OPTIMIZATION_ERROR: '다시 시도해주세요. 문제가 지속되면 관리자에게 문의하세요.'
  };

  return (
    <Box className={className} sx={{ my: 2 }}>
      <Collapse in={!!error}>
        <Alert
          severity={severityMap[error.code] || 'error'}
          action={
            <Box>
              {onRetry && (
                <IconButton
                  aria-label="retry"
                  color="inherit"
                  size="small"
                  onClick={onRetry}
                >
                  <RefreshIcon />
                </IconButton>
              )}
              {onClose && (
                <IconButton
                  aria-label="close"
                  color="inherit"
                  size="small"
                  onClick={onClose}
                >
                  <CloseIcon />
                </IconButton>
              )}
            </Box>
          }
        >
          <AlertTitle>{error.message}</AlertTitle>
          {error.details && (
            <Box sx={{ mt: 1, mb: 2 }}>
              <strong>상세 내용:</strong> {error.details}
            </Box>
          )}
          <Box sx={{ mt: 1 }}>
            <strong>권장 조치:</strong> {actionMap[error.code] || '다시 시도해주세요.'}
          </Box>
          {onRetry && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={onRetry}
              sx={{ mt: 2 }}
            >
              다시 시도
            </Button>
          )}
        </Alert>
      </Collapse>
    </Box>
  );
};

export default ErrorDisplay; 