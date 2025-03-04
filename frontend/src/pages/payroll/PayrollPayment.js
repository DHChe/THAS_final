import React, { useState, useEffect, useMemo } from 'react';
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
  ButtonGroup,
  Snackbar,
  TextField,
  Chip,
  Divider,
  Modal,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import 'dayjs/locale/ko'; // 한국어 로케일 임포트
import dayjs from 'dayjs';
import GlobalTabs from '../../components/GlobalTabs';
import EmployeeSelector from '../../components/payroll/EmployeeSelector';
import EnhancedEmployeeSelector from '../../components/payroll/EnhancedEmployeeSelector';
import PayrollTable from '../../components/payroll/PayrollTable';
import PayrollSummary from '../../components/payroll/PayrollSummary';
import DevMemo from '../../components/payroll/DevMemo';
import { useEmployees } from '../../context/EmployeeContext';
import { StyledPaper, StyledButton } from '../../components/StyledComponents';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../styles/theme';
import commonStyles from '../../styles/styles';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningIcon from '@mui/icons-material/Warning';

// dayjs 플러그인 설정
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(customParseFormat);

// 최대 종료일 계산 함수 - 수정됨
const getMaxEndDate = (startDate) => {
  if (!startDate) return null;
  
  // 시작일이 월의 첫날인지 확인
  if (startDate.date() === 1) {
    // 월의 첫날이면 해당 월의 마지막 날까지
    return startDate.endOf('month');
  } else {
    // 월의 첫날이 아니면 다음달 (시작일-1)일까지
    // 예: 10월 5일 선택 -> 11월 4일까지
    const nextMonth = startDate.add(1, 'month');
    const dayOfMonth = startDate.date();
    
    // 종료일(다음 달의 해당 일자 하루 전)
    let endDayOfMonth = dayOfMonth - 1;
    if (endDayOfMonth === 0) {
      // 만약 1일이 선택되었다면(다음 달 0일이 되는 경우) 전 달의 마지막 날로
      return nextMonth.subtract(1, 'day').endOf('month');
    }
    
    // 특별 케이스: 1월 29일인 경우 항상 2월 28일로 처리
    if (startDate.month() === 0 && dayOfMonth === 29) {  // 0은 1월을 의미함
      return nextMonth.date(28);
    }
    
    // 특별한 처리: 시작일이 30, 31일인 경우
    const daysInNextMonth = nextMonth.daysInMonth();
    
    // 시작일이 해당 월의 마지막 날짜 또는 그 이후 날짜인 경우 (예: 1월 30일, 31일)
    // 다음 달의 마지막 날을 종료일로 설정
    if (dayOfMonth >= 30 && endDayOfMonth > daysInNextMonth) {
      return nextMonth.endOf('month');
    }
    
    // 일반적인 경우: 다음 달에 해당 일이 없으면 마지막 날로 조정
    if (endDayOfMonth > daysInNextMonth) {
      endDayOfMonth = daysInNextMonth;
    }
    
    return nextMonth.date(endDayOfMonth);
  }
};

// 빠른 기간 선택 옵션 상수
const QUICK_PERIODS = {
  CURRENT_MONTH: 'current',
  PREVIOUS_MONTH: 'previous',
  NEXT_MONTH: 'next',
  CUSTOM: 'custom'
};

// *** 날짜 선택기 UI 설정 - 필요에 따라 값을 조정하세요 ***
const DATE_PICKER_UI = {
  POPUP_WIDTH: '355px',       // 날짜 선택 팝업 창 너비 - 이 값을 조정하여 가로 길이를 변경하세요
  YEAR_BUTTON_WIDTH: '100px', // 연도 선택 버튼 너비
  MONTH_BUTTON_WIDTH: '100px', // 월 선택 버튼 너비
  DAY_BUTTON_SIZE: '36px'     // 일 선택 버튼 크기
};

const PayrollPayment = () => {
  const { employees, loading: employeesLoading, error } = useEmployees();
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState({ 
    start: null, 
    end: null, 
    type: QUICK_PERIODS.CUSTOM 
  });
  const [payrollData, setPayrollData] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [attendanceData, setAttendanceData] = useState([]);
  const [calculationResults, setCalculationResults] = useState([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmedPayrolls, setConfirmedPayrolls] = useState([]);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // 컴포넌트 마운트 시 기본값 설정
  useEffect(() => {
    // 현재 월의 첫날과 마지막 날로 기본 설정
    const now = dayjs();
    const firstDay = now.startOf('month');
    const lastDay = now.endOf('month');
    setSelectedPeriod({ 
      start: firstDay, 
      end: lastDay, 
      type: QUICK_PERIODS.CURRENT_MONTH 
    });
  }, []);

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

  // 기간 변경 핸들러 (임시 업데이트용)
  const handlePeriodChange = (type, date) => {
    // 임시 날짜 업데이트 (유효성 검사 없이)
    if (type === 'start') {
      setSelectedPeriod(prev => ({ ...prev, start: date, type: QUICK_PERIODS.CUSTOM }));
    } else if (type === 'end') {
      setSelectedPeriod(prev => ({ ...prev, end: date, type: QUICK_PERIODS.CUSTOM }));
    }
  };
  
  // 날짜 선택 완료 시 유효성 검사 (최종 선택 시)
  const handleDateAccept = (type, date) => {
    // 유효하지 않은 날짜인지 확인 (isValid 플러그인 없이도 동작)
    if (!date || !dayjs(date).isValid()) {
      setAlert({ open: true, message: '유효하지 않은 날짜 형식입니다.', severity: 'warning' });
      return;
    }

    if (type === 'start') {
      if (selectedPeriod.end) {
        const maxEndDate = getMaxEndDate(date);
        if (selectedPeriod.end.isAfter(maxEndDate)) {
          setAlert({ 
            open: true, 
            message: '시작일에 따른 유효한 종료일로 조정되었습니다.', 
            severity: 'info' 
          });
          setSelectedPeriod(prev => ({ ...prev, start: date, end: maxEndDate, type: QUICK_PERIODS.CUSTOM }));
        } else {
          setSelectedPeriod(prev => ({ ...prev, start: date, type: QUICK_PERIODS.CUSTOM }));
        }
      } else {
        setSelectedPeriod(prev => ({ ...prev, start: date, type: QUICK_PERIODS.CUSTOM }));
      }
    } else if (type === 'end') {
      if (!selectedPeriod.start) {
        setAlert({ open: true, message: '먼저 시작일을 선택해주세요.', severity: 'warning' });
        return;
      }
      if (date.isBefore(selectedPeriod.start)) {
        setAlert({ open: true, message: '종료일은 시작일 이후여야 합니다.', severity: 'warning' });
        setSelectedPeriod(prev => ({ ...prev, end: null })); // 종료일만 초기화
        return;
      }
      const maxEndDate = getMaxEndDate(selectedPeriod.start);
      if (date.isAfter(maxEndDate)) {
        setAlert({ 
          open: true, 
          message: '시작일에 따른 최대 종료일로 조정되었습니다.', 
          severity: 'info' 
        });
        setSelectedPeriod(prev => ({ ...prev, end: maxEndDate, type: QUICK_PERIODS.CUSTOM }));
      } else {
        setSelectedPeriod(prev => ({ ...prev, end: date, type: QUICK_PERIODS.CUSTOM }));
      }
    }
  };

  // 빠른 기간 선택 핸들러
  const handleQuickPeriodSelect = (periodType) => {
    const now = dayjs();
    let start, end;

    switch (periodType) {
      case QUICK_PERIODS.CURRENT_MONTH:
        start = now.startOf('month');
        end = now.endOf('month');
        break;
      case QUICK_PERIODS.PREVIOUS_MONTH:
        start = now.subtract(1, 'month').startOf('month');
        end = now.subtract(1, 'month').endOf('month');
        break;
      case QUICK_PERIODS.NEXT_MONTH:
        start = now.add(1, 'month').startOf('month');
        end = now.add(1, 'month').endOf('month');
        break;
      default:
        return; // CUSTOM의 경우 아무것도 하지 않음
    }

    setSelectedPeriod({ start, end, type: periodType });
  };

  const handleEmployeeSelection = (selectedIds) => {
    setSelectedEmployees(selectedIds);
  };

  const handleCalculatePayroll = async () => {
    if (!selectedPeriod.start || !selectedPeriod.end || selectedEmployees.length === 0) {
      setAlert({ open: true, message: '기간과 직원을 선택해주세요.', severity: 'warning' });
      return;
    }

    // 날짜 유효성 추가 검증 (isValid 플러그인 없이도 동작)
    if (!dayjs(selectedPeriod.start).isValid() || !dayjs(selectedPeriod.end).isValid()) {
      setAlert({ open: true, message: '선택한 날짜가 유효하지 않습니다.', severity: 'error' });
      return;
    }

    setCalculating(true);
    try {
      const payload = {
        start_date: selectedPeriod.start.format('YYYY-MM-DD'),
        end_date: selectedPeriod.end.format('YYYY-MM-DD'),
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
      
      // 계산 결과를 저장할 때 status 필드 유지 확인
      // 각 결과 항목에 status 필드가 없는 경우 백엔드에서 제공된 status를 사용
      // 그렇지 않으면 기본값 'unconfirmed' 설정
      const resultsWithStatus = data.results.map(result => {
        // 백엔드에서 이미 status 필드를 포함한 경우 그대로 사용
        if (result.status) {
          return result;
        }
        // 기존 confirmPayrolls 중에서 일치하는 항목이 있는지 확인
        const existingPayroll = confirmedPayrolls.find(
          p => p.employee_id === result.employee_id
        );
        // 일치하는 항목이 있으면 해당 상태 사용, 없으면 기본값
        return {
          ...result,
          status: existingPayroll ? 'confirmed' : 'unconfirmed'
        };
      });
      
      setCalculationResults(resultsWithStatus);
      setAlert({ open: true, message: '급여 계산 완료', severity: 'success' });
    } catch (err) {
      setAlert({ open: true, message: `계산 오류: ${err.message}`, severity: 'error' });
    } finally {
      setCalculating(false);
    }
  };

  // 급여 명세서 생성 및 이메일 발송 핸들러
  const handleSendPayslips = async () => {
    if (calculationResults.length === 0) {
      setAlert({ open: true, message: '먼저 급여를 계산해주세요.', severity: 'warning' });
      return;
    }

    setCalculating(true);
    try {
      // 백엔드 API 호출 (아직 구현되지 않음)
      const response = await fetch('http://localhost:5000/api/payroll/send-payslips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          payroll_data: calculationResults,
          period: {
            start: selectedPeriod.start.format('YYYY-MM-DD'),
            end: selectedPeriod.end.format('YYYY-MM-DD')
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '급여명세서 발송 실패');
      }
      
      setAlert({ open: true, message: '급여명세서가 성공적으로 발송되었습니다.', severity: 'success' });
    } catch (err) {
      // 실제 구현 전에는 성공 메시지 표시 (시뮬레이션)
      setAlert({ open: true, message: '급여명세서 발송 시뮬레이션 완료 (백엔드 미구현)', severity: 'info' });
      console.error('급여명세서 발송 오류:', err);
    } finally {
      setCalculating(false);
    }
  };

  // 급여 확정 모달 열기 함수
  const handleOpenConfirmModal = () => {
    if (calculationResults.length === 0) {
      setAlert({ open: true, message: '먼저 급여를 계산해주세요.', severity: 'warning' });
      return;
    }
    setConfirmModalOpen(true);
  };

  // 급여 확정 처리 함수
  const handleConfirmPayroll = async () => {
    setIsConfirming(true);
    try {
      // 계산된 급여 결과에서 payroll_code 목록 추출
      const payrollIds = calculationResults.map(result => result.payroll_code);
      
      const response = await fetch('http://localhost:5000/api/payroll/confirm', {
        method: 'PUT', // PUT 메소드로 변경 (백엔드 API와 일치)
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payroll_ids: payrollIds, // 백엔드 API와 일치하는 필드명
          remarks: `${selectedPeriod.start.format('YYYY-MM-DD')}~${selectedPeriod.end.format('YYYY-MM-DD')} 급여 확정`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '급여 확정 실패');
      }

      const data = await response.json();
      setConfirmedPayrolls(data.confirmed_payrolls || []);
      
      // 상태 업데이트: 현재 계산 결과의 상태를 'confirmed'로 변경
      const updatedResults = calculationResults.map(result => ({
        ...result,
        status: 'confirmed'
      }));
      setCalculationResults(updatedResults);
      
      // 급여 확정 성공 메시지와 함께 분석 페이지로 이동 안내 추가
      setAlert({ 
        open: true, 
        message: `${data.message || '급여 확정이 완료되었습니다.'} 이제 급여 분석 페이지에서 확정된 급여 데이터를 분석할 수 있습니다.`, 
        severity: 'success',
        action: (
          <Button 
            color="primary" 
            size="small" 
            onClick={() => window.location.href = '/payroll/analysis'}
          >
            분석 페이지로 이동
          </Button>
        )
      });
      
      // 모달 닫기
      setConfirmModalOpen(false);
    } catch (err) {
      setAlert({ open: true, message: `급여 확정 오류: ${err.message}`, severity: 'error' });
    } finally {
      setIsConfirming(false);
    }
  };

  // 모달 닫기 함수
  const handleCloseConfirmModal = () => {
    setConfirmModalOpen(false);
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
              <StyledPaper sx={{ p: 3, height: '3' }}>
                <Typography variant="h6" gutterBottom>급여 계산 기간</Typography>
                
                {/* 빠른 기간 선택 버튼 그룹 */}
                <Box sx={{ mb: 2 }}>
                  <ButtonGroup variant="outlined" size="small" sx={{ mb: 1 }}>
                    <Button 
                      onClick={() => handleQuickPeriodSelect(QUICK_PERIODS.PREVIOUS_MONTH)}
                      variant={selectedPeriod.type === QUICK_PERIODS.PREVIOUS_MONTH ? 'contained' : 'outlined'}
                    >
                      전월
                    </Button>
                    <Button 
                      onClick={() => handleQuickPeriodSelect(QUICK_PERIODS.CURRENT_MONTH)}
                      variant={selectedPeriod.type === QUICK_PERIODS.CURRENT_MONTH ? 'contained' : 'outlined'}
                    >
                      당월
                    </Button>
                    <Button 
                      onClick={() => handleQuickPeriodSelect(QUICK_PERIODS.NEXT_MONTH)}
                      variant={selectedPeriod.type === QUICK_PERIODS.NEXT_MONTH ? 'contained' : 'outlined'}
                    >
                      익월
                    </Button>
                  </ButtonGroup>
                </Box>
                
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <DatePicker
                        label="시작일"
                        value={selectedPeriod.start}
                        onChange={(date) => handlePeriodChange('start', date)}
                        onAccept={(date) => handleDateAccept('start', date)}
                        openTo="year"
                        views={['year', 'month', 'day']}
                        disableOpenPicker={false}
                        // 연도 범위 제한 (현재 연도가 마지막 값, 총 12개 표시)
                        minDate={dayjs().subtract(11, 'year')}
                        maxDate={dayjs()}
                        slotProps={{ 
                          textField: { 
                            fullWidth: true,
                            helperText: '월 단위 급여 계산의 시작일',
                            InputProps: {
                              readOnly: true // 직접 키보드로 입력 방지
                            }
                          },
                          // 달력 팝업 창 스타일 조정
                          desktopPaper: {
                            sx: {
                              width: DATE_PICKER_UI.POPUP_WIDTH, // 팝업 창 너비 변수 사용
                              '& .MuiPickersDay-root': {
                                width: DATE_PICKER_UI.DAY_BUTTON_SIZE,
                                height: DATE_PICKER_UI.DAY_BUTTON_SIZE,
                                fontSize: '0.875rem'
                              },
                              '& .MuiDayCalendar-header': {
                                justifyContent: 'space-around'
                              },
                              '& .MuiPickersYear-yearButton': {
                                width: DATE_PICKER_UI.YEAR_BUTTON_WIDTH,
                                margin: '2px',
                                fontSize: '0.875rem'
                              },
                              '& .MuiPickersMonth-monthButton': {
                                width: DATE_PICKER_UI.MONTH_BUTTON_WIDTH,
                                margin: '2px',
                                fontSize: '0.875rem'
                              },
                              '& .MuiPickersCalendarHeader-root': {
                                paddingLeft: '16px',
                                paddingRight: '16px'
                              },
                              '& .MuiYearCalendar-root': {
                                width: '100%',
                                maxHeight: '280px',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                justifyContent: 'center'
                              },
                              // 월/년 선택기 스타일 수정 (순서 조정)
                              '& .MuiMonthCalendar-root': {
                                marginTop: '8px',
                                width: '100%'
                              },
                              // 다이얼로그 내부 순서 제어
                              '& .MuiPickersLayout-contentWrapper': {
                                '& > div:first-of-type': {
                                  order: 0  // 연도 선택 패널을 첫 번째로
                                },
                                '& > div:nth-of-type(2)': {
                                  order: 1  // 월 선택 패널을 두 번째로
                                }
                              }
                            }
                          },
                          // 모바일 뷰도 동일하게 조정
                          mobilePaper: {
                            sx: {
                              '& .MuiPickersYear-yearButton': {
                                width: DATE_PICKER_UI.YEAR_BUTTON_WIDTH,
                                margin: '2px',
                                fontSize: '0.875rem'
                              },
                              '& .MuiYearCalendar-root': {
                                maxHeight: '280px',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)'
                              },
                              // 월/년 선택기 스타일 수정 (순서 조정)
                              '& .MuiPickersLayout-contentWrapper': {
                                '& > div:first-of-type': {
                                  order: 0  // 연도 선택 패널을 첫 번째로
                                },
                                '& > div:nth-of-type(2)': {
                                  order: 1  // 월 선택 패널을 두 번째로
                                }
                              }
                            }
                          }
                        }}
                        yearCalendarProps={{
                          autoFocus: true,
                          defaultHighlight: dayjs().subtract(11, 'year')
                        }}
                        monthCalendarProps={{
                          autoFocus: false
                        }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <DatePicker
                        label="종료일"
                        value={selectedPeriod.end}
                        onChange={(date) => handlePeriodChange('end', date)}
                        onAccept={(date) => handleDateAccept('end', date)}
                        minDate={selectedPeriod.start}
                        maxDate={selectedPeriod.start ? getMaxEndDate(selectedPeriod.start) : null}
                        openTo="year"
                        views={['year', 'month', 'day']}
                        disableOpenPicker={false}
                        // 연도 범위 제한 (현재 연도가 마지막 값, 총 12개 표시)
                        slotProps={{ 
                          textField: { 
                            fullWidth: true,
                            helperText: '월 단위 급여 계산의 종료일',
                            InputProps: {
                              readOnly: true // 직접 키보드로 입력 방지
                            }
                          },
                          // 달력 팝업 창 스타일 조정
                          desktopPaper: {
                            sx: {
                              width: DATE_PICKER_UI.POPUP_WIDTH, // 팝업 창 너비 변수 사용
                              '& .MuiPickersDay-root': {
                                width: DATE_PICKER_UI.DAY_BUTTON_SIZE,
                                height: DATE_PICKER_UI.DAY_BUTTON_SIZE,
                                fontSize: '0.875rem'
                              },
                              '& .MuiDayCalendar-header': {
                                justifyContent: 'space-around'
                              },
                              '& .MuiPickersYear-yearButton': {
                                width: DATE_PICKER_UI.YEAR_BUTTON_WIDTH,
                                margin: '2px',
                                fontSize: '0.875rem'
                              },
                              '& .MuiPickersMonth-monthButton': {
                                width: DATE_PICKER_UI.MONTH_BUTTON_WIDTH,
                                margin: '2px',
                                fontSize: '0.875rem'
                              },
                              '& .MuiPickersCalendarHeader-root': {
                                paddingLeft: '16px',
                                paddingRight: '16px'
                              },
                              '& .MuiYearCalendar-root': {
                                width: '100%',
                                maxHeight: '280px',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                justifyContent: 'center'
                              },
                              // 월/년 선택기 스타일 수정 (순서 조정)
                              '& .MuiMonthCalendar-root': {
                                marginTop: '8px',
                                width: '100%'
                              },
                              // 다이얼로그 내부 순서 제어
                              '& .MuiPickersLayout-contentWrapper': {
                                '& > div:first-of-type': {
                                  order: 0  // 연도 선택 패널을 첫 번째로
                                },
                                '& > div:nth-of-type(2)': {
                                  order: 1  // 월 선택 패널을 두 번째로
                                }
                              }
                            }
                          },
                          // 모바일 뷰도 동일하게 조정
                          mobilePaper: {
                            sx: {
                              '& .MuiPickersYear-yearButton': {
                                width: DATE_PICKER_UI.YEAR_BUTTON_WIDTH,
                                margin: '2px',
                                fontSize: '0.875rem'
                              },
                              '& .MuiYearCalendar-root': {
                                maxHeight: '280px',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)'
                              },
                              // 월/년 선택기 스타일 수정 (순서 조정)
                              '& .MuiPickersLayout-contentWrapper': {
                                '& > div:first-of-type': {
                                  order: 0  // 연도 선택 패널을 첫 번째로
                                },
                                '& > div:nth-of-type(2)': {
                                  order: 1  // 월 선택 패널을 두 번째로
                                }
                              }
                            }
                          }
                        }}
                        yearCalendarProps={{
                          autoFocus: true
                        }}
                        monthCalendarProps={{
                          autoFocus: false
                        }}
                      />
                    </Grid>
                  </Grid>
                </LocalizationProvider>
                
                {/* 선택된 기간 정보 표시 */}
                {selectedPeriod.start && selectedPeriod.end && (
                  <Box sx={{ mt: 2, p: 1, bgcolor: 'rgba(0, 0, 0, 0.05)', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      선택 기간: {selectedPeriod.start.format('YYYY년 MM월 DD일')} ~ {selectedPeriod.end.format('YYYY년 MM월 DD일')}
                      {' '}({selectedPeriod.end.diff(selectedPeriod.start, 'day') + 1}일)
                    </Typography>
                  </Box>
                )}
              </StyledPaper>
            </Grid>

            <Grid item xs={12} md={6}>
              <EnhancedEmployeeSelector 
              selectedEmployees={selectedEmployees} 
              onSelectionChange={handleEmployeeSelection} 
              employees={employees} 
              />
            </Grid>

            <Grid item xs={12}>
              <StyledPaper>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">급여 계산 결과</Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <StyledButton
                      variant="contained"
                      onClick={handleCalculatePayroll}
                      disabled={calculating}
                    >
                      {calculating ? <CircularProgress size={24} /> : '급여 계산'}
                    </StyledButton>
                    
                    {/* 급여명세서 발송 버튼 추가 */}
                    <StyledButton
                      variant="outlined"
                      onClick={handleOpenConfirmModal}
                      disabled={calculating || calculationResults.length === 0}
                      sx={{
                        backgroundColor: 'white',
                        color: theme.palette.primary.main,
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.05)',
                        },
                      }}
                    >
                      {calculating ? <CircularProgress size={24} /> : '급여 확정'}
                    </StyledButton>
                  </Box>
                </Box>
                <PayrollSummary calculationResults={calculationResults} employees={employees} />
                <PayrollTable 
                  calculationResults={calculationResults} 
                  employees={employees}
                  confirmedPayrolls={confirmedPayrolls}
                />
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
            {alert.severity === 'success' ? '성공' : alert.severity === 'error' ? '오류' : '알림'}
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

        {/* 급여 확정 모달 */}
        <Dialog
          open={confirmModalOpen}
          onClose={handleCloseConfirmModal}
          aria-labelledby="confirm-payroll-dialog-title"
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle id="confirm-payroll-dialog-title">
            <Box display="flex" alignItems="center">
              <WarningIcon sx={{ color: 'warning.main', mr: 1 }} />
              급여 확정
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" gutterBottom>
              {selectedEmployees.length}명의 직원에 대한 급여를 확정하시겠습니까?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              급여 기간: {selectedPeriod.start?.format('YYYY년 MM월 DD일')} ~ {selectedPeriod.end?.format('YYYY년 MM월 DD일')}
            </Typography>
            <Alert severity="warning" sx={{ mt: 2 }}>
              급여 확정 후에는 수정이 불가능합니다. 계산된 급여 정보를 다시 한 번 확인해주세요.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseConfirmModal}>취소</Button>
            <Button 
              onClick={handleConfirmPayroll} 
              variant="contained" 
              color="primary"
              disabled={isConfirming}
              startIcon={isConfirming ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isConfirming ? '처리 중...' : '확정하기'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 알림 메시지 */}
        <Snackbar
          open={alert.open}
          autoHideDuration={6000}
          onClose={handleCloseAlert}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleCloseAlert} 
            severity={alert.severity} 
            sx={{ width: '100%' }}
            action={alert.action}
          >
            {alert.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default PayrollPayment;