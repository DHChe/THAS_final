import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, Button, InputAdornment } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

const AIMessageInput = ({ 
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "AI에게 질문하기..."
}) => {
  const inputRef = useRef(null);
  
  // 입력란에 포커스 주기
  useEffect(() => {
    // 컴포넌트가 마운트된 후 입력란에 포커스
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 100);
    }
  }, []);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSubmit(value);
      }
    }
  };

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value);
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      gap: 1,
      alignItems: 'center'
    }}>
      <TextField
        fullWidth
        value={value}
        onChange={onChange}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        variant="outlined"
        size="small"
        inputRef={inputRef}
        disabled={disabled}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Button
                variant="contained"
                color="primary"
                size="small"
                disabled={disabled || !value.trim()}
                onClick={handleSubmit}
                sx={{ minWidth: 'unset', p: '4px 8px' }}
              >
                <SendIcon fontSize="small" />
              </Button>
            </InputAdornment>
          )
        }}
        sx={{
          '& .MuiInputBase-root': {
            borderRadius: 2,
          }
        }}
      />
    </Box>
  );
};

export default React.memo(AIMessageInput);