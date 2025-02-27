import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

const EmployeeSearch = ({ onSearch }) => {
  const [searchValues, setSearchValues] = useState({
    name: '',
    department: '',
    position: '',
    status: ''
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setSearchValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSearch(searchValues);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={3}>
          <TextField
            name="name"
            label="이름"
            value={searchValues.name}
            onChange={handleChange}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <FormControl fullWidth size="small">
            <InputLabel>부서</InputLabel>
            <Select
              name="department"
              value={searchValues.department}
              label="부서"
              onChange={handleChange}
            >
              <MenuItem value="">전체</MenuItem>
              <MenuItem value="개발팀">개발팀</MenuItem>
              <MenuItem value="영업팀">영업팀</MenuItem>
              <MenuItem value="인사팀">인사팀</MenuItem>
              <MenuItem value="경영지원팀">경영지원팀</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={3}>
          <FormControl fullWidth size="small">
            <InputLabel>직급</InputLabel>
            <Select
              name="position"
              value={searchValues.position}
              label="직급"
              onChange={handleChange}
            >
              <MenuItem value="">전체</MenuItem>
              <MenuItem value="사원">사원</MenuItem>
              <MenuItem value="대리">대리</MenuItem>
              <MenuItem value="과장">과장</MenuItem>
              <MenuItem value="차장">차장</MenuItem>
              <MenuItem value="부장">부장</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={2}>
          <FormControl fullWidth size="small">
            <InputLabel>상태</InputLabel>
            <Select
              name="status"
              value={searchValues.status}
              label="상태"
              onChange={handleChange}
            >
              <MenuItem value="">전체</MenuItem>
              <MenuItem value="재직중">재직중</MenuItem>
              <MenuItem value="퇴사">퇴사</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={1}>
          <Button
            type="submit"
            variant="contained"
            fullWidth
            startIcon={<SearchIcon />}
          >
            검색
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EmployeeSearch;