/**
 * File: frontend/src/pages/hr/EmployeeDetail.js
 * Description: 직원 상세 정보 페이지 컴포넌트
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Grid,
  Typography,
  Button,
  Box,
  Chip,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { fetchEmployeeDetails } from '../../services/api';
import { formatDate } from '../../utils/format';

const EmployeeDetail = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [employee, setEmployee] = useState(null);

  useEffect(() => {
    const loadEmployee = async () => {
      try {
        setLoading(true);
        const data = await fetchEmployeeDetails(employeeId);
        setEmployee(data);
      } catch (err) {
        setError('직원 정보 로드 중 오류가 발생했습니다.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadEmployee();
  }, [employeeId]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!employee) return <Alert severity="info">직원 정보를 찾을 수 없습니다.</Alert>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        {/* 상단 버튼 영역 */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
          >
            돌아가기
          </Button>
          <Button
            startIcon={<EditIcon />}
            variant="contained"
            onClick={() => navigate(`/hr/employees/${employeeId}/edit`)}
          >
            정보 수정
          </Button>
        </Box>

        {/* 기본 정보 */}
        <Typography variant="h5" gutterBottom>
          기본 정보
        </Typography>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <InfoItem label="사원번호" value={employee.employee_id} />
            <InfoItem label="이름" value={employee.name} />
            <InfoItem label="부서" value={employee.department} />
            <InfoItem label="직급" value={employee.position} />
          </Grid>
          <Grid item xs={12} md={6}>
            <InfoItem label="입사일" value={formatDate(employee.join_date)} />
            <InfoItem label="상태">
              <Chip 
                label={employee.status}
                color={employee.status === '재직중' ? 'success' : 'error'}
              />
            </InfoItem>
            {employee.status === '퇴사' && (
              <InfoItem 
                label="퇴사일" 
                value={formatDate(employee.resignation_date)} 
              />
            )}
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* 개인 정보 */}
        <Typography variant="h5" gutterBottom>
          개인 정보
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <InfoItem label="생년월일" value={formatDate(employee.birth)} />
            <InfoItem label="성별" value={employee.sex} />
          </Grid>
          <Grid item xs={12} md={6}>
            <InfoItem label="부양가족 수" value={`${employee.family_count}명`} />
            <InfoItem label="자녀 수" value={`${employee.num_children}명`} />
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

// 정보 표시를 위한 헬퍼 컴포넌트
const InfoItem = ({ label, value, children }) => (
  <Box sx={{ mb: 2 }}>
    <Typography color="textSecondary" variant="subtitle2">
      {label}
    </Typography>
    {children || (
      <Typography variant="body1">
        {value || '-'}
      </Typography>
    )}
  </Box>
);

export default EmployeeDetail;