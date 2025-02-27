import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const DevMemo = () => {
  // 개발 모드에서만 표시 (배포 시 제거 또는 숨김)
  if (process.env.NODE_ENV === 'production') return null;

  return (
    <Box sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
      <Paper sx={{ p: 2, background: 'rgba(255, 255, 255, 0.1)', border: '1px dashed #ff4d4d', color: '#ff4d4d' }}>
        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
          [개발 메모] 무단결근 시 로직: 기본급에서 `monthly_salary / 30 * 결근 일수` 차감, 주휴수당(주 40시간 미달 시)도 차감. 추후 기업 규정에 맞게 수정 필요.
        </Typography>
      </Paper>
    </Box>
  );
};

export default DevMemo;