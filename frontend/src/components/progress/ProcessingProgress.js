import React from 'react';
import {
  Box,
  LinearProgress,
  Typography,
  Paper
} from '@mui/material';

const ProcessingProgress = ({ 
  isProcessing,
  currentStep,
  totalSteps,
  stepDescription,
  progress 
}) => {
  if (!isProcessing) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1300,
        width: '400px',
      }}
    >
      <Paper
        sx={{
          p: 3,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(5px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Typography 
          variant="h6" 
          sx={{ 
            color: 'primary.light',
            mb: 1
          }}
        >
          데이터 처리 중
        </Typography>
        
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'common.white',
            mb: 2,
            opacity: 0.9
          }}
        >
          {stepDescription}
        </Typography>

        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ mb: 1 }}
        />
        
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'common.white',
            opacity: 0.7
          }}
        >
          진행 단계: {currentStep}/{totalSteps}
        </Typography>
      </Paper>
    </Box>
  );
};

export default ProcessingProgress; 