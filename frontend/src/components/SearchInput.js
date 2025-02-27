import React from 'react';
import { TextField } from '@mui/material';

const SearchInput = ({ 
    value = '', 
    onChange, 
    placeholder = "검색어를 입력하세요",
    disabled = false,
    size = "small"
}) => {
    const handleChange = (e) => {
        if (onChange) {
            onChange(e.target.value);
        }
    };

    return (
        <TextField
            fullWidth
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            size={size}
            sx={{
                '& .MuiInputBase-root': {
                    height: size === 'small' ? '40px' : '48px',
                    color: '#fff',
                    '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                        borderColor: '#4d7cfe',
                    },
                },
                '& .MuiInputBase-input': {
                    '&::placeholder': {
                        color: 'rgba(255, 255, 255, 0.5)',
                        opacity: 1,
                    },
                },
            }}
        />
    );
};

export default SearchInput; 