import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Divider,
  Box
} from '@mui/material';
import { format } from 'date-fns';

const EmployeeDetailModal = ({ open, onClose, employee }) => {
  if (!employee) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        직원 상세 정보
        <Typography variant="subtitle1" color="textSecondary">
          {employee.employee_id}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Divider />
          </Grid>
          
          {/* 기본 정보 */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>기본 정보</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="textSecondary">이름</Typography>
            <Typography variant="body1">{employee.name}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="textSecondary">생년월일</Typography>
            <Typography variant="body1">
              {format(new Date(employee.birth), 'yyyy-MM-dd')}
            </Typography>
          </Grid>
          
          {/* 조직 정보 */}
          <Grid item xs={12}>
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>조직 정보</Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="textSecondary">부서</Typography>
            <Typography variant="body1">{employee.department}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="textSecondary">직급</Typography>
            <Typography variant="body1">{employee.position}</Typography>
          </Grid>
          
          {/* 입사 정보 */}
          <Grid item xs={12}>
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>입사 정보</Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="textSecondary">입사일</Typography>
            <Typography variant="body1">
              {format(new Date(employee.join_date), 'yyyy-MM-dd')}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="textSecondary">근속년수</Typography>
            <Typography variant="body1">
              {((new Date() - new Date(employee.join_date)) / 
                (1000 * 60 * 60 * 24 * 365)).toFixed(1)}년
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmployeeDetailModal;