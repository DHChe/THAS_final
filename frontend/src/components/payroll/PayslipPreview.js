import React from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Divider,
  Button
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ko-KR').format(amount);
};

const PayslipPreview = ({ data }) => {
  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    // TODO: PDF 출력 기능 구현
    console.log('PDF 출력');
  };

  return (
    <Paper sx={{
      p: 3,
      background: 'rgba(30, 41, 59, 0.8)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ color: '#fff' }}>
          급여 명세서 미리보기
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            variant="outlined"
            sx={{
              color: '#fff',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              '&:hover': {
                borderColor: 'rgba(255, 255, 255, 0.5)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            인쇄
          </Button>
          <Button
            startIcon={<PictureAsPdfIcon />}
            onClick={handleExportPDF}
            variant="outlined"
            sx={{
              color: '#fff',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              '&:hover': {
                borderColor: 'rgba(255, 255, 255, 0.5)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            PDF 저장
          </Button>
        </Box>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: '#fff', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                직원정보
              </TableCell>
              <TableCell sx={{ color: '#fff', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                지급내역
              </TableCell>
              <TableCell sx={{ color: '#fff', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                공제내역
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((employee) => (
              <TableRow key={employee.employee_id}>
                <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="subtitle2" sx={{ color: '#fff' }}>
                      {employee.name} ({employee.employee_id})
                    </Typography>
                    <Typography variant="body2">
                      {employee.department} | {employee.position}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>기본급</Typography>
                      <Typography>{formatCurrency(employee.base_salary)}원</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>연장근로수당</Typography>
                      <Typography>{formatCurrency(employee.overtime_pay)}원</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>야간근로수당</Typography>
                      <Typography>{formatCurrency(employee.night_shift_pay)}원</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>휴일근로수당</Typography>
                      <Typography>{formatCurrency(employee.holiday_pay)}원</Typography>
                    </Box>
                    <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ color: '#fff' }}>지급액 계</Typography>
                      <Typography sx={{ color: '#fff' }}>
                        {formatCurrency(employee.total_pay)}원
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>국민연금</Typography>
                      <Typography>{formatCurrency(employee.national_pension)}원</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>건강보험</Typography>
                      <Typography>{formatCurrency(employee.health_insurance)}원</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>고용보험</Typography>
                      <Typography>{formatCurrency(employee.employment_insurance)}원</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>소득세</Typography>
                      <Typography>{formatCurrency(employee.income_tax)}원</Typography>
                    </Box>
                    <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ color: '#fff' }}>공제액 계</Typography>
                      <Typography sx={{ color: '#fff' }}>
                        {formatCurrency(employee.total_deduction)}원
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(0, 0, 0, 0.2)', borderRadius: 1 }}>
        <Typography variant="h6" sx={{ color: '#fff', mb: 2 }}>
          총 지급액 정보
        </Typography>
        <Box sx={{ display: 'flex', gap: 4 }}>
          <Box>
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              대상 인원: {data.length}명
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              총 지급액: {formatCurrency(data.reduce((sum, emp) => sum + emp.total_pay, 0))}원
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              총 공제액: {formatCurrency(data.reduce((sum, emp) => sum + emp.total_deduction, 0))}원
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default PayslipPreview; 