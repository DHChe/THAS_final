import React, { useState, useCallback } from 'react';
import { TextField } from '@mui/material';
import { debounce } from '../../utils/debounce';

const SearchInput = React.memo(({ onSearchChange }) => {
  const [localValue, setLocalValue] = useState('');

  const debouncedOnChange = useCallback(
    debounce((value) => {
      onSearchChange(value);
    }, 50), // 디바운스 시간을 100ms에서 50ms로 줄임
    [onSearchChange]
  );

  const handleChange = (e) => {
    const value = e.target.value;
    setLocalValue(value);
    debouncedOnChange(value);
  };

  return (
    <TextField
      fullWidth
      size="small"
      value={localValue}
      onChange={handleChange}
      placeholder="이름 또는 사번을 입력하세요"
      sx={{
        '& .MuiInputBase-root': {
          height: '40px',
          fontSize: '0.875rem',
          color: '#fff',
          '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
          '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
        }
      }}
    />
  );
});

SearchInput.displayName = 'SearchInput';

export default SearchInput;