/**
 * File: frontend/src/pages/hr/EmployeeEditForm.js
 * Description: 직원 정보 수정 페이지 컴포넌트
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Grid,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { fetchEmployeeDetails, updateEmployee } from '../../services/api';

const EmployeeEditForm = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    position: '',
    status: '',
    join_date: null,
    birth: null,
    sex: '',
    family_count: 0,
    num_children: 0
  });

  // 직원 정보 로드
  useEffect(() => {
    const loadEmployee = async () => {
      try {
        setLoading(true);
        const data = await fetchEmployeeDetails(employeeId);
        setFormData({
          ...data,
          join_date: new Date(data.join_date),
          birth: new Date(data.birth)
        });
      } catch (err) {
        setError('직원 정보 로드 중 오류가 발생했습니다.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadEmployee();
  }, [employeeId]);

  // 입력 필드 변경 핸들러
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 날짜 필드 변경 핸들러
  const handleDateChange = (name, date) => {
    setFormData(prev => ({
      ...prev,
      [name]: date
    }));
  };

  // 폼 제출 핸들러
  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await updateEmployee(employeeId, formData);
      navigate(`/hr/employees/${employeeId}`);
    } catch (err) {
      setError('직원 정보 업데이트 중 오류가 발생했습니다.');
      console.error(err);
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          직원 정보 수정
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            {/* 기본 정보 */}
            <Grid item xs={12} md={6}>
              <TextField
                name="name"
                label="이름"
                value={formData.name}
                onChange={handleChange}
                fullWidth
                required
                margin="normal"
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>부서</InputLabel>
                <Select
                  name="department"
                  value={formData.department}
                  label="부서"
                  onChange={handleChange}
                  required
                >
                  <MenuItem value="개발팀">개발팀</MenuItem>
                  <MenuItem value="영업팀">영업팀</MenuItem>
                  <MenuItem value="인사팀">인사팀</MenuItem>
                  <MenuItem value="경영지원팀">경영지원팀</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth margin="normal">
                <InputLabel>직급</InputLabel>
                <Select
                  name="position"
                  value={formData.position}
                  label="직급"
                  onChange={handleChange}
                  required
                >
                  <MenuItem value="사원">사원</MenuItem>
                  <MenuItem value="대리">대리</MenuItem>
                  <MenuItem value="과장">과장</MenuItem>
                  <MenuItem value="차장">차장</MenuItem>
                  <MenuItem value="부장">부장</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* 상태 및 날짜 정보 */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>재직상태</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  label="재직상태"
                  onChange={handleChange}
                  required
                >
                  <MenuItem value="재직중">재직중</MenuItem>
                  <MenuItem value="퇴사">퇴사</MenuItem>
                </Select>
              </FormControl>
              
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="입사일"
                  value={formData.join_date}
                  onChange={(date) => handleDateChange('join_date', date)}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth margin="normal" required />
                  )}
                />
                <DatePicker
                  label="생년월일"
                  value={formData.birth}
                  onChange={(date) => handleDateChange('birth', date)}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth margin="normal" required />
                  )}
                />
              </LocalizationProvider>
            </Grid>

            {/* 부양가족 정보 */}
            <Grid item xs={12} md={6}>
              <TextField
                name="family_count"
                label="부양가족 수"
                type="number"
                value={formData.family_count}
                onChange={handleChange}
                fullWidth
                margin="normal"
                InputProps={{ inputProps: { min: 0 } }}
              />
              <TextField
                name="num_children"
                label="자녀 수"
                type="number"
                value={formData.num_children}
                onChange={handleChange}
                fullWidth
                margin="normal"
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>
          </Grid>

          {/* 버튼 영역 */}
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate(-1)}
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
            >
              저장
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default EmployeeEditForm;