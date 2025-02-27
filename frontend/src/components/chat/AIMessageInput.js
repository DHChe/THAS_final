import React, { useState, useCallback } from 'react';
import { Box, TextField, Button } from '@mui/material';
import { debounce } from '../../utils/debounce';

const AIMessageInput = ({ 
  inputMessage, 
  onInputChange, 
  onSendMessage, 
  isAiThinking 
}) => {
  // 로컬 상태 추가
  const [localInput, setLocalInput] = useState(inputMessage);

  // 디바운스된 onChange 핸들러
  const debouncedOnChange = useCallback(
    debounce((value) => {
      onInputChange(value);
    }, 100),
    [onInputChange]
  );

  // 입력 핸들러
  const handleInputChange = (e) => {
    const value = e.target.value;
    setLocalInput(value); // 즉시 로컬 상태 업데이트
    debouncedOnChange(value); // 디바운스된 부모 컴포넌트 상태 업데이트
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      gap: 1,
      pt: 2,
      borderTop: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <TextField
        fullWidth
        value={localInput}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        placeholder="AI에게 질문하기..."
        variant="outlined"
        size="small"
        sx={{
          '& .MuiInputBase-root': {
            color: '#fff',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255, 255, 255, 0.1)',
          },
          '& input::placeholder': {
            color: 'rgba(255, 255, 255, 0.5)',
          },
        }}
      />
      <Button
        variant="contained"
        onClick={onSendMessage}
        disabled={isAiThinking}
        sx={{
          background: 'linear-gradient(45deg, #4d7cfe, #00d2ff)',
          minWidth: '100px',
          opacity: isAiThinking ? 0.7 : 1,
        }}
      >
        전송
      </Button>
    </Box>
  );
};

export default React.memo(AIMessageInput);