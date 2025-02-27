import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { ko } from 'date-fns/locale';
import GlobalTabs from '../../components/GlobalTabs';
import EmployeeSelector from '../../components/payroll/EmployeeSelector';
import PayrollTable from '../../components/payroll/PayrollTable';
import PayrollSummary from '../../components/payroll/PayrollSummary';
import DevMemo from '../../components/payroll/DevMemo';
import { useEmployees } from '../../context/EmployeeContext';
import { format, addDays, lastDayOfMonth, differenceInDays, isValid } from 'date-fns'; // isValid 추가
import { StyledPaper, StyledButton } from '../../components/StyledComponents';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../styles/theme';
import commonStyles from '../../styles/styles';

// 최대 종료일 계산 함수
const getMaxEndDate = (startDate) => {
  if (!startDate) return null;
  const lastDay = lastDayOfMonth(startDate);
  const daysInMonth = differenceInDays(lastDay, startDate);
  return addDays(startDate, daysInMonth);
};

const PayrollPayment = () => {
  const { employees, loading: employeesLoading, error } = useEmployees();
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState({ start: null, end: null });
  const [payrollData, setPayrollData] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [attendanceData, setAttendanceData] = useState([]);
  const [calculationResults, setCalculationResults] = useState([]);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/attendance');
        if (!response.ok) throw new Error('근태 데이터 로드 실패');
        const data = await response.json();
        setAttendanceData(data.map(record => ({
          ...record,
          check_in: record.check_in || '',
          check_out: record.check_out || '',
          attendance_type: record.attendance_type || '정상',
        })) || []);
      } catch (err) {
        setAlert({ open: true, message: `근태 데이터 로드 오류: ${err.message}`, severity: 'error' });
      }
    };
    fetchAttendance();
  }, []);

  // 기간 변경 핸들러 (키보드 입력 검증 강화)
  const handlePeriodChange = (type, date) => {
    // 유효하지 않은 날짜인지 확인 (예: 잘못된 형식 또는 존재하지 않는 날짜)
    if (date && !isValid(date)) {
      setAlert({ open: true, message: '유효하지 않은 날짜 형식입니다.', severity: 'warning' });
      return;
    }

    if (type === 'start') {
      if (selectedPeriod.end) {
        const maxEndDate = getMaxEndDate(date);
        if (selectedPeriod.end > maxEndDate) {
          setAlert({ open: true, message: '종료일은 시작일이 속한 월의 마지막 날을 초과할 수 없습니다.', severity: 'warning' });
          setSelectedPeriod({ start: date, end: null }); // 종료일 초기화
          return;
        }
      }
      setSelectedPeriod(prev => ({ ...prev, start: date }));
    } else if (type === 'end') {
      if (!selectedPeriod.start) {
        setAlert({ open: true, message: '먼저 시작일을 선택해주세요.', severity: 'warning' });
        return;
      }
      if (date < selectedPeriod.start) {
        setAlert({ open: true, message: '종료일은 시작일 이후여야 합니다.', severity: 'warning' });
        return;
      }
      const maxEndDate = getMaxEndDate(selectedPeriod.start);
      if (date > maxEndDate) {
        setAlert({ open: true, message: '종료일은 시작일이 속한 월의 마지막 날을 초과할 수 없습니다.', severity: 'warning' });
        return;
      }
      setSelectedPeriod(prev => ({ ...prev, end: date }));
    }
  };

  const handleEmployeeSelection = (selectedIds) => {
    setSelectedEmployees(selectedIds);
  };

  const handleCalculatePayroll = async () => {
    if (!selectedPeriod.start || !selectedPeriod.end || selectedEmployees.length === 0) {
      setAlert({ open: true, message: '기간과 직원을 선택해주세요.', severity: 'warning' });
      return;
    }

    // 날짜 유효성 추가 검증
    if (!isValid(selectedPeriod.start) || !isValid(selectedPeriod.end)) {
      setAlert({ open: true, message: '선택한 날짜가 유효하지 않습니다.', severity: 'error' });
      return;
    }

    setCalculating(true);
    try {
      const payload = {
        start_date: format(selectedPeriod.start, 'yyyy-MM-dd'),
        end_date: format(selectedPeriod.end, 'yyyy-MM-dd'),
        employee_ids: selectedEmployees,
        attendance_data: attendanceData
      };
      const response = await fetch('http://localhost:5000/api/payroll/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '급여 계산 실패');
      }
      const data = await response.json();
      setCalculationResults(data.results);
      setAlert({ open: true, message: '급여 계산 완료', severity: 'success' });
    } catch (err) {
      setAlert({ open: true, message: `계산 오류: ${err.message}`, severity: 'error' });
    } finally {
      setCalculating(false);
    }
  };

  const handleCloseAlert = () => {
    setAlert({ ...alert, open: false });
  };

  if (employeesLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', ...commonStyles.pageContainer }}>
        <CircularProgress sx={{ color: theme.palette.text.primary }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, ...commonStyles.pageContainer }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={commonStyles.pageContainer}>
        <GlobalTabs />
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
            급여 지급관리
          </Typography>
          <Typography variant="body1" sx={{ color: theme.palette.text.secondary, mb: 4 }}>
            근태기록 기반 급여 계산 및 급여 명세서 발행을 관리합니다.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <StyledPaper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>급여 계산 기간</Typography>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <DatePicker
                        label="시작일"
                        value={selectedPeriod.start}
                        onChange={(date) => handlePeriodChange('start', date)}
                        slotProps={{ textField: { fullWidth: true } }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <DatePicker
                        label="종료일"
                        value={selectedPeriod.end}
                        onChange={(date) => handlePeriodChange('end', date)}
                        minDate={selectedPeriod.start}
                        maxDate={selectedPeriod.start ? getMaxEndDate(selectedPeriod.start) : null}
                        slotProps={{ textField: { fullWidth: true } }}
                      />
                    </Grid>
                  </Grid>
                </LocalizationProvider>
              </StyledPaper>
            </Grid>

            <Grid item xs={12} md={6}>
              <EmployeeSelector selectedEmployees={selectedEmployees} onSelectionChange={handleEmployeeSelection} employees={employees} />
            </Grid>

            <Grid item xs={12}>
              <StyledPaper>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">급여 계산 결과</Typography>
                  <StyledButton
                    variant="contained"
                    onClick={handleCalculatePayroll}
                    disabled={calculating}
                  >
                    {calculating ? <CircularProgress size={24} /> : '급여 계산'}
                  </StyledButton>
                </Box>
                <PayrollSummary calculationResults={calculationResults} employees={employees} />
                <PayrollTable calculationResults={calculationResults} employees={employees} />
              </StyledPaper>
            </Grid>
          </Grid>
        </Container>

        <DevMemo />

        {/* Dialog로 모든 경고 표시 */}
        <Dialog
          open={alert.open}
          onClose={handleCloseAlert}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">
            {alert.severity === 'success' ? '성공' : '알림'}
          </DialogTitle>
          <DialogContent>
            <Alert severity={alert.severity} sx={{ width: '100%' }}>
              {alert.message}
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAlert} color="primary" autoFocus>
              확인
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
};

export default PayrollPayment;