import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Badge,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Menu,
  LinearProgress,
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
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import NotificationsIcon from '@mui/icons-material/Notifications';
import BuildIcon from '@mui/icons-material/Build';
import ReplayIcon from '@mui/icons-material/Replay';
import SyncIcon from '@mui/icons-material/Sync';
import RefreshIcon from '@mui/icons-material/Refresh';
import HistoryIcon from '@mui/icons-material/History';
import CalculateIcon from '@mui/icons-material/Calculate';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { io } from 'socket.io-client';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { DEFAULT_PAYMENT_DAY, PAYMENT_DAY_OPTIONS } from '../../config/payrollConfig';

// dayjs 플러그인 설정
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(customParseFormat);

// 실시간 데이터 동기화를 위한 Socket.io 연결 설정
// 더 안정적인 연결을 위해 옵션 추가
const socket = io('http://localhost:5000', {
  reconnectionAttempts: 30,         // 재연결 시도 횟수 증가
  reconnectionDelay: 500,           // 재연결 지연 시간 감소
  timeout: 30000,                   // 타임아웃 증가
  transports: ['polling', 'websocket'], // polling을 먼저 시도하여 더 안정적인 연결
  autoConnect: true,                // 자동 연결 활성화
  forceNew: false,                  // 기존 연결 재사용 허용
  reconnection: true,               // 재연결 시도 활성화
  closeOnBeforeunload: false        // 페이지 새로고침 시 연결 유지
});

/**
 * 시작일과 임금 지급일을 기준으로 임금 계산 종료일을 반환합니다.
 * @param {dayjs.Dayjs} startDate - 시작일
 * @param {number} paymentDay - 임금 지급일 (1~31 사이의 숫자)
 * @param {string|null} employeeEndDate - 직원의 퇴사일 (YYYY-MM-DD 형식, 없으면 null)
 * @returns {dayjs.Dayjs|null} - 계산된 종료일 또는 null
 */
const calculateEndDate = (startDate, paymentDay, employeeEndDate = null) => {
  if (!startDate) return null;
  
  // 1. 정규 직원의 경우 - 임금 지급일 기준으로 계산
  let endDate;
  
  // 시작일에 해당하는 월 정보
  const startMonth = startDate.month();
  const startYear = startDate.year();
  const startDay = startDate.date();
  
  // 임금 지급일이 1일인 경우는 특별 케이스: 해당 월 말일을 종료일로 사용
  if (paymentDay === 1) {
    endDate = startDate.endOf('month');
  } else {
    // 일반적인 경우 - 시작일이 속한 월의 지급일과 다음 달 지급일 중 가장 가까운 날짜의 전날
    const sameMonthPayday = dayjs(new Date(startYear, startMonth, paymentDay));
    const nextMonthPayday = dayjs(new Date(startYear, startMonth + 1, paymentDay));
    
    // 시작일이 지급일보다 이전이거나 같은 경우 (예: 10월 1일 ~ 10월 10일)
    if (startDay <= paymentDay) {
      // 같은 달의 지급일 전날을 종료일로 설정
      endDate = sameMonthPayday.subtract(1, 'day');
    } else {
      // 시작일이 지급일 이후인 경우 (예: 10월 15일 ~ 11월 10일)
      // 다음 달의 지급일 전날을 종료일로 설정
      endDate = nextMonthPayday.subtract(1, 'day');
    }
    
    // 해당 월에 지급일이 존재하지 않는 경우 처리 (예: 30일이 없는 2월)
    const daysInMonth = sameMonthPayday.daysInMonth();
    if (startDay <= paymentDay && paymentDay > daysInMonth) {
      // 해당 월의 마지막 날로 조정
      endDate = dayjs(new Date(startYear, startMonth, daysInMonth));
    }
    
    const daysInNextMonth = nextMonthPayday.daysInMonth();
    if (startDay > paymentDay && paymentDay > daysInNextMonth) {
      // 다음 달의 마지막 날로 조정
      endDate = dayjs(new Date(startYear, startMonth + 1, daysInNextMonth));
    }
  }
  
  // 2. 중도 퇴사자의 경우 - 퇴사일과 정규 종료일 중 더 이른 날짜 선택
  if (employeeEndDate) {
    const quitDate = dayjs(employeeEndDate);
    if (quitDate.isBefore(endDate)) {
      endDate = quitDate;
    }
  }
  
  return endDate;
};

/**
 * 임금 지급일을 기준으로 임금 계산 시작일을 반환합니다.
 * 
 * @param {number} paymentDay - 임금 지급일 (1~31 사이의 숫자)
 * @param {string|null} employeeStartDate - 직원의 입사일 (YYYY-MM-DD 형식, 없으면 null)
 * @param {dayjs.Dayjs|null} baseDate - 계산 기준일 (제공되지 않으면 현재 날짜 사용)
 * @returns {dayjs.Dayjs} - 계산된 시작일
 */
const calculateStartDate = (paymentDay, employeeStartDate = null, baseDate = null) => {
  // 기준일이 제공되지 않은 경우 현재 날짜 사용
  const referenceDate = baseDate || dayjs();
  let startDate;
  
  // 임금 지급일 기준으로 기본 시작일 계산
  if (paymentDay === 1) {
    // 임금 지급일이 1일인 경우: 이전 달의 1일부터
    startDate = referenceDate.subtract(1, 'month').startOf('month');
  } else {
    // 임금 지급일이 2~31일인 경우
    const currentDay = referenceDate.date();
    const currentMonth = referenceDate.month();
    const currentYear = referenceDate.year();
    
    // 현재 날짜가 임금일 이전인지 이후인지에 따라 시작일 결정
    if (currentDay < paymentDay) {
      // 현재 날짜가 임금일 이전이면 이전 달의 임금일부터 계산
      const prevMonth = currentMonth - 1 < 0 ? 11 : currentMonth - 1;
      const prevYear = prevMonth === 11 ? currentYear - 1 : currentYear;
      
      // 이전 달에 해당 지급일이 없는 경우 (예: 31일이 없는 달)
      const daysInPrevMonth = dayjs(new Date(prevYear, prevMonth + 1, 0)).date();
      
      if (paymentDay > daysInPrevMonth) {
        // 해당 월의 마지막 날로 조정
        startDate = dayjs(new Date(prevYear, prevMonth, daysInPrevMonth));
      } else {
        startDate = dayjs(new Date(prevYear, prevMonth, paymentDay));
      }
    } else {
      // 현재 날짜가 임금일 이후이면 현재 달의 임금일부터 계산
      // 현재 달에 해당 지급일이 없는 경우 (예: 31일이 없는 달)
      const daysInCurrentMonth = referenceDate.daysInMonth();
      
      if (paymentDay > daysInCurrentMonth) {
        // 해당 월의 마지막 날로 조정
        startDate = dayjs(new Date(currentYear, currentMonth, daysInCurrentMonth));
      } else {
        startDate = dayjs(new Date(currentYear, currentMonth, paymentDay));
      }
    }
  }
  
  // 중도 입사자인 경우 - 입사일을 시작일로 제한
  if (employeeStartDate) {
    const employeeStart = dayjs(employeeStartDate);
    // 입사일이 기본 시작일보다 이후라면 입사일을 시작일로 사용
    if (employeeStart.isAfter(startDate)) {
      return employeeStart;
    }
  }
  
  return startDate;
};

// 빠른 기간 선택 옵션 상수
const QUICK_PERIODS = {
  CURRENT_PERIOD: 'current',    // 현재 임금 지급 주기
  PREVIOUS_PERIOD: 'previous',  // 이전 임금 지급 주기
  NEXT_PERIOD: 'next',          // 다음 임금 지급 주기
  CUSTOM: 'custom'              // 사용자 지정 기간
};

// *** 날짜 선택기 UI 설정 - 필요에 따라 값을 조정하세요 ***
const DATE_PICKER_UI = {
  POPUP_WIDTH: '355px',       // 날짜 선택 팝업 창 너비 - 이 값을 조정하여 가로 길이를 변경하세요
  YEAR_BUTTON_WIDTH: '100px', // 연도 선택 버튼 너비
  MONTH_BUTTON_WIDTH: '100px', // 월 선택 버튼 너비
  DAY_BUTTON_SIZE: '36px'     // 일 선택 버튼 크기
};

// 근태 데이터 변경 뱃지 컴포넌트
const AttendanceChangesBadge = ({ count, onClick }) => {
  return (
    <Tooltip title={`${count}개의 근태 데이터 변경사항이 있습니다`}>
      <Badge badgeContent={count} color="warning" overlap="circular" 
        sx={{ 
          '.MuiBadge-badge': { 
            fontSize: '0.7rem',
            height: '20px',
            minWidth: '20px',
            top: '4px',
            right: '4px'
          }
        }}
      >
        <IconButton 
          color="primary" 
          onClick={onClick}
          sx={{ bgcolor: 'rgba(255, 152, 0, 0.1)', mr: 1 }}
        >
          <BuildIcon />
        </IconButton>
      </Badge>
    </Tooltip>
  );
};

// 근태 변경 목록 다이얼로그 컴포넌트
const AttendanceChangesDialog = ({ 
  open, 
  onClose, 
  changedRecords, 
  originalRecords, 
  onSave, 
  onRevert 
}) => {
  // 원본과 변경된 값 차이 확인 함수
  const getChangeDiff = (original, modified, field) => {
    if (!original) return { hasChange: true, original: '없음', modified: modified[field] || '없음' };
    
    const originalValue = original[field] || '없음';
    const modifiedValue = modified[field] || '없음';
    
    return {
      hasChange: originalValue !== modifiedValue,
      original: originalValue,
      modified: modifiedValue
    };
  };
  
  // 개별 레코드 복원 처리
  const handleRevertRecord = (employeeId, date) => {
    onRevert(employeeId, date);
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">
            근태 데이터 변경사항 ({changedRecords.length}개)
          </Typography>
          <Button 
            startIcon={<SaveIcon />} 
            variant="contained" 
            color="primary" 
            onClick={onSave}
            disabled={changedRecords.length === 0}
          >
            모든 변경사항 저장
          </Button>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {changedRecords.length === 0 ? (
          <Alert severity="info">변경된 근태 데이터가 없습니다.</Alert>
        ) : (
          <List>
            {changedRecords.map((record, index) => {
              const original = originalRecords.find(
                r => r.employee_id === record.employee_id && r.date === record.date
              );
              
              const checkInDiff = getChangeDiff(original, record, 'check_in');
              const checkOutDiff = getChangeDiff(original, record, 'check_out');
              const typeDiff = getChangeDiff(original, record, 'attendance_type');
              
              return (
                <React.Fragment key={`${record.employee_id}-${record.date}`}>
                  {index > 0 && <Divider variant="inset" component="li" />}
                  <ListItem alignItems="flex-start">
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" mb={1}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {record.employee_id} - {record.date}
                          </Typography>
                          <Chip 
                            label="변경됨" 
                            color="warning" 
                            size="small"
                            sx={{ ml: 1, height: '20px' }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          {checkInDiff.hasChange && (
                            <Typography variant="body2" component="div">
                              출근시간: <s>{checkInDiff.original}</s> → <strong>{checkInDiff.modified}</strong>
                            </Typography>
                          )}
                          {checkOutDiff.hasChange && (
                            <Typography variant="body2" component="div">
                              퇴근시간: <s>{checkOutDiff.original}</s> → <strong>{checkOutDiff.modified}</strong>
                            </Typography>
                          )}
                          {typeDiff.hasChange && (
                            <Typography variant="body2" component="div">
                              근태유형: <s>{typeDiff.original}</s> → <strong>{typeDiff.modified}</strong>
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="변경 취소">
                        <IconButton 
                          edge="end" 
                          onClick={() => handleRevertRecord(record.employee_id, record.date)}
                        >
                          <ReplayIcon />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                </React.Fragment>
              );
            })}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          닫기
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ProgressBar 컴포넌트 추가 (컴포넌트 정의 섹션에 추가)
const ProgressBar = ({ value, message }) => {
  return (
    <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', mt: 2 }}>
      <Box sx={{ width: '100%', mr: 1 }}>
        <LinearProgress variant="determinate" value={value} sx={{ height: 10, borderRadius: 5 }} />
      </Box>
      <Box sx={{ minWidth: 35, mt: 1 }}>
        <Typography variant="body2" color="text.secondary">{`${Math.round(value)}%`}</Typography>
      </Box>
      {message && (
        <Typography variant="caption" sx={{ mt: 1, textAlign: 'center' }}>
          {message}
        </Typography>
      )}
    </Box>
  );
};

const PayrollPayment = () => {
  const { employees, loading: employeesLoading, error } = useEmployees();
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  
  // 임금 지급일 설정 - 설정 파일에서 가져옴
  const [paymentDay, setPaymentDay] = useState(DEFAULT_PAYMENT_DAY);
  
  const [selectedPeriod, setSelectedPeriod] = useState({ 
    start: null, 
    end: null, 
    type: QUICK_PERIODS.CURRENT_PERIOD 
  });
  const [payrollData, setPayrollData] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [attendanceData, setAttendanceData] = useState([]);
  const [originalAttendanceData, setOriginalAttendanceData] = useState([]);
  const [modifiedAttendance, setModifiedAttendance] = useState([]);
  const [hasAttendanceChanges, setHasAttendanceChanges] = useState(false);
  const [calculationResults, setCalculationResults] = useState([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmedPayrolls, setConfirmedPayrolls] = useState([]);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [attendanceChangesDialogOpen, setAttendanceChangesDialogOpen] = useState(false);
  const [attendanceFileChanged, setAttendanceFileChanged] = useState(false);
  const [attendanceLastModified, setAttendanceLastModified] = useState(null);
  const [calculationProgress, setCalculationProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [attendanceAuditData, setAttendanceAuditData] = useState([]);
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState({ connected: false, checking: true });
  
  // 실시간 업데이트 관련 상태 추가
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // API 연결 상태 확인
  useEffect(() => {
    const checkApiConnection = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/health', {
          headers: {
            'Accept': 'application/json'
          }
        });
        if (response.ok) {
          setApiStatus({ connected: true, checking: false });
        } else {
          setApiStatus({ connected: false, checking: false });
          setAlert({
            open: true,
            message: '서버 연결 상태가 좋지 않습니다. 잠시 후 다시 시도해주세요.',
            severity: 'error'
          });
        }
      } catch (error) {
        setApiStatus({ connected: false, checking: false });
        setAlert({
          open: true,
          message: '서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.',
          severity: 'error'
        });
      }
    };

    checkApiConnection();
  }, []);

  // 근태 데이터 로드 함수 개선
  const loadAttendanceData = async () => {
    if (!selectedPeriod.start || !selectedPeriod.end || !apiStatus.connected) {
      return;
    }

    setIsLoading(true);
    setProgressMessage('근태 데이터 로드 중...');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      const response = await fetch('http://localhost:5000/api/attendance/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          start_date: selectedPeriod.start.format('YYYY-MM-DD'),
          end_date: selectedPeriod.end.format('YYYY-MM-DD'),
          employee_ids: selectedEmployees
        })
      });

      if (!response.ok) {
        throw new Error(`근태 데이터 로드 실패: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data || !data.data || !Array.isArray(data.data)) {
        throw new Error('잘못된 근태 데이터 형식입니다.');
      }

      setAttendanceData(data.data);
      setOriginalAttendanceData(data.data);
      setAttendanceLastModified(new Date());
      setHasAttendanceChanges(false);

    } catch (error) {
      console.error('근태 데이터 로드 오류:', error);
      setAlert({
        open: true,
        message: error.message || '근태 데이터를 불러오는 중 오류가 발생했습니다.',
        severity: 'error'
      });
      setAttendanceData([]);
      setOriginalAttendanceData([]);
    } finally {
      setIsLoading(false);
      setProgressMessage('');
    }
  };

  // 선택된 기간이나 직원이 변경될 때 근태 데이터 자동 로드
  useEffect(() => {
    if (selectedPeriod.start && selectedPeriod.end && selectedEmployees.length > 0 && apiStatus.connected) {
      loadAttendanceData();
    }
  }, [selectedPeriod, selectedEmployees, apiStatus.connected]);

  const navigate = useNavigate();

  // 컴포넌트 마운트 시 기본값 설정
  useEffect(() => {
    // 임금 지급일 기준으로 기본 기간 설정
    const defaultStart = calculateStartDate(paymentDay);
    const defaultEnd = calculateEndDate(defaultStart, paymentDay);
    
    setSelectedPeriod({ 
      start: defaultStart, 
      end: defaultEnd, 
      type: QUICK_PERIODS.CURRENT_PERIOD 
    });
    
    // 근태 파일 변경 여부 확인
    checkAttendanceFileChanges();
    
    // Socket.io 연결 설정
    setupSocketConnection();
    
    // 주기적으로 근태 데이터 확인 (3분마다)
    const intervalId = setInterval(() => {
      console.log('정기 근태 데이터 확인 실행...');
      if (!socketConnected) {
        checkAttendanceFileChanges();
      } else {
        socket.emit('check_attendance_changes');
      }
    }, 180000); // 3분 = 180000ms
    
    // 컴포넌트 언마운트 시 소켓 연결 및 타이머 해제
    return () => {
      socket.disconnect();
      clearInterval(intervalId);
    };
  }, [paymentDay]); // 임금 지급일이 변경될 때도 기간 재계산

  // Socket.io 연결 설정 함수
  const setupSocketConnection = () => {
    // 기존 이벤트 리스너 제거하여 중복 등록 방지
    socket.off('connect');
    socket.off('disconnect');
    socket.off('connect_error');
    socket.off('reconnect_attempt');
    socket.off('reconnect');
    socket.off('attendance_changed');
    socket.off('attendance_check_result');

    // 연결 이벤트
    socket.on('connect', () => {
      console.log('Socket.io 서버에 연결되었습니다.');
      console.log('Socket ID:', socket.id);
      setSocketConnected(true);
      
      // 연결 직후 변경사항 확인 요청
      socket.emit('check_attendance_changes');
    });
    
    // 연결 해제 이벤트
    socket.on('disconnect', (reason) => {
      console.log('Socket.io 서버와 연결이 끊어졌습니다. 사유:', reason);
      setSocketConnected(false);
      
      // 연결 끊어진 후 수동으로 데이터 확인 시도
      checkAttendanceFileChanges();
      
      // 일부 disconnect 사유는 자동 재연결되지 않음 - 수동 재연결 시도
      if (reason === 'io server disconnect' || reason === 'transport close') {
        console.log('서버에서 연결이 끊겼습니다. 수동으로 재연결을 시도합니다.');
        // 1초 후 재연결 시도
        setTimeout(() => {
          console.log('Socket 재연결 시도 중...');
          socket.connect();
        }, 1000);
      }
    });
    
    // 연결 오류 이벤트 처리 추가
    socket.on('connect_error', (error) => {
      console.error('Socket.io 연결 오류:', error.message);
      setSocketConnected(false);
      
      // 연결 실패 시 HTTP 방식으로 변경 확인
      checkAttendanceFileChanges();
      
      // 오류 상세 정보 기록
      console.log('연결 오류 세부 정보:', {
        message: error.message,
        type: error.type,
        description: error.description,
        stack: error.stack
      });
    });
    
    // 재연결 시도 이벤트
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Socket.io 재연결 시도 (${attemptNumber}번째)`);
    });
    
    // 재연결 성공 이벤트
    socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket.io 재연결 성공 (${attemptNumber}번의 시도 후)`);
      setSocketConnected(true);
      
      // 재연결 후 변경사항 확인 요청
      socket.emit('check_attendance_changes');
    });
    
    // 근태 데이터 변경 이벤트 수신
    socket.on('attendance_changed', (data) => {
      console.log('근태 데이터 변경 감지:', data);
      
      // 알림 표시
      setAlert({
        open: true,
        message: data.message,
        severity: 'info'
      });
      
      // 마지막 업데이트 시간 기록
      setLastUpdated(data.timestamp);
      
      // 근태 데이터 자동 갱신
      fetchAttendance();
      
      // 변경 플래그 초기화
      setAttendanceFileChanged(false);
    });
    
    // 근태 데이터 확인 결과 이벤트 수신
    socket.on('attendance_check_result', (data) => {
      console.log('근태 데이터 확인 결과:', data);
      
      if (data.changes_detected) {
        // 변경 감지 시 데이터 갱신
        fetchAttendance();
        
        // 알림 표시
        setAlert({
          open: true,
          message: data.message,
          severity: 'info'
        });
        
        // 마지막 업데이트 시간 기록
        setLastUpdated(data.timestamp);
        
        // 변경 플래그 설정
        setAttendanceFileChanged(true);
      }
    });
    
    // 연결 직후 한 번 더 connect 시도 - 가끔 연결이 제대로 안 되는 경우 해결
    // 최초 연결 시도가 실패한 경우를 대비
    if (!socket.connected) {
      console.log('초기 소켓 연결 확인 - 연결 시도 중...');
      socket.connect();
    }
  };

  // 근태 데이터 로드 함수 개선
  const fetchAttendance = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // 캐시를 완전히 방지하기 위해 타임스탬프 추가
      const timestamp = new Date().getTime();
      const response = await fetch(`http://localhost:5000/api/attendance?nocache=${timestamp}`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('근태 데이터 로드 실패');
      
      const data = await response.json();
      const formattedData = data.map(record => ({
        ...record,
        check_in: record.check_in || '',
        check_out: record.check_out || '',
        attendance_type: record.attendance_type || '정상',
      })) || [];
      
      // 데이터 로깅 추가
      console.log('로드된 근태 데이터 (첫 5개):', formattedData.slice(0, 5));
      
      setAttendanceData(formattedData);
      // 원본 데이터도 저장 (변경 감지용)
      setOriginalAttendanceData(JSON.parse(JSON.stringify(formattedData)));
      
      // 마지막 업데이트 시간 기록
      const updateTime = new Date().toLocaleString();
      setLastUpdated(updateTime);
      
      console.log(`${formattedData.length}개의 근태 기록을 로드했습니다. (${updateTime})`);
    } catch (err) {
      console.error('근태 데이터 로드 오류:', err);
      setAlert({ open: true, message: `근태 데이터 로드 오류: ${err.message}`, severity: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // 컴포넌트 마운트 시 근태 데이터 로드
  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // 근태 파일 변경 확인 함수
  const checkAttendanceFileChanges = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:5000/api/attendance/check-changes', {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('근태 파일 변경 확인 실패');
      }
      
      const data = await response.json();
      setAttendanceFileChanged(data.changes_detected);
      setAttendanceLastModified(data.last_modified);
      
      if (data.changes_detected) {
        // 변경 사항이 감지되면 알림 표시
        setAlert({
          open: true,
          message: '근태 파일이 변경되었습니다. 임금 계산 시 최신 데이터가 반영됩니다.',
          severity: 'info'
        });
        
        // 변경된 근태 데이터 로드
        fetchAttendance();
      }
      
      return data.changes_detected;
    } catch (err) {
      console.error('근태 파일 변경 확인 오류:', err);
      setAlert({
        open: true,
        message: `근태 파일 변경 확인 오류: ${err.message}`,
        severity: 'error'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // 근태 파일 수동 동기화 함수 개선
  const syncAttendanceFile = async () => {
    try {
      setIsLoading(true);
      
      // 1단계: 먼저 일반 동기화 시도
      let response = await fetch('http://localhost:5000/api/attendance/sync-file', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        // 2단계: 일반 동기화 실패 시 강제 CSV 동기화 시도
        console.log('첫 번째 동기화 시도 실패, CSV 강제 동기화 시도...');
        response = await fetch('http://localhost:5000/api/attendance/sync-csv', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ force: true })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '근태 파일 동기화 실패');
        }
      }
      
      const result = await response.json();
      
      // 3단계: 동기화 후 근태 데이터 강제 재로드
      console.log('동기화 성공, 근태 데이터 강제 재로드...');
      await fetchAttendance();
      
      setAttendanceFileChanged(false);
      setAttendanceLastModified(result.last_modified);
      
      setAlert({
        open: true,
        message: result.message || "근태 파일이 성공적으로 동기화되었습니다. 다시 임금 계산을 시도해보세요.",
        severity: 'success'
      });
      
      // 성공 시 true 반환
      return true;
    } catch (err) {
      console.error('근태 파일 동기화 오류:', err);
      setAlert({
        open: true,
        message: `근태 파일 동기화 오류: ${err.message}. 백엔드 서버가 실행 중인지 확인하세요.`,
        severity: 'error'
      });
      // 실패 시 false 반환
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 수동으로 근태 변경 확인 요청 함수
  const manualCheckChanges = async () => {
    setIsLoading(true);
    setAlert({
      open: true,
      message: '근태 데이터 변경 확인 중...',
      severity: 'info'
    });
    
    try {
      if (socketConnected) {
        socket.emit('check_attendance_changes');
      } else {
        // 소켓 연결이 없으면 HTTP 방식으로 확인
        const changesDetected = await checkAttendanceFileChanges();
        
        if (!changesDetected) {
          // 변경사항이 없으면 알림
          setAlert({
            open: true,
            message: '근태 데이터 변경사항이 없습니다. DB와 CSV 파일이 이미 동기화되어 있습니다.',
            severity: 'info'
          });
        }
      }
    } catch (err) {
      console.error('근태 데이터 변경 확인 오류:', err);
      setAlert({
        open: true,
        message: `근태 데이터 변경 확인 오류: ${err.message}`,
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 임금 지급일 변경 처리 함수
   * @param {Event} event - 변경 이벤트
   */
  const handlePaymentDayChange = (event) => {
    const newPaymentDay = parseInt(event.target.value, 10);
    
    // 유효한 지급일 범위 확인 (1~31)
    if (newPaymentDay >= 1 && newPaymentDay <= 31) {
      setPaymentDay(newPaymentDay);
      
      // 지급일 변경 시 기간 자동 재계산
      // 현재 기간이 선택되어 있지 않으면 현재 날짜 기준으로 계산
      if (!selectedPeriod.start) {
        const newStart = calculateStartDate(newPaymentDay);
        const newEnd = calculateEndDate(newStart, newPaymentDay);
        
        setSelectedPeriod({
          start: newStart,
          end: newEnd,
          type: QUICK_PERIODS.CURRENT_PERIOD
        });
      } else {
        // 기존에 선택된 시작일이 있으면 시작일은 유지하고 종료일만 재계산
        const newEnd = calculateEndDate(selectedPeriod.start, newPaymentDay);
        
        setSelectedPeriod(prev => ({
          ...prev,
          end: newEnd,
          // 빠른 선택 옵션 사용 중이었다면 커스텀으로 변경
          type: prev.type === QUICK_PERIODS.CUSTOM ? QUICK_PERIODS.CUSTOM : QUICK_PERIODS.CURRENT_PERIOD
        }));
        
        setAlert({
          open: true,
          message: '임금 지급일 변경으로 종료일이 재계산되었습니다.',
          severity: 'info'
        });
      }
    }
  };

  /**
   * 기간 변경 처리 함수 (날짜 선택 시 임시 상태 업데이트)
   * @param {string} type - 'start' 또는 'end'
   * @param {dayjs.Dayjs} date - 선택된 날짜
   */
  const handlePeriodChange = (type, date) => {
    // 임시 날짜 업데이트 (유효성 검사 없이)
    if (type === 'start') {
      setSelectedPeriod(prev => ({ ...prev, start: date, type: QUICK_PERIODS.CUSTOM }));
    } else if (type === 'end') {
      setSelectedPeriod(prev => ({ ...prev, end: date, type: QUICK_PERIODS.CUSTOM }));
    }
  };
  
  /**
   * 날짜 선택 완료 시 유효성 검사 (최종 선택 시)
   * @param {string} type - 'start' 또는 'end'
   * @param {dayjs.Dayjs} date - 선택된 날짜
   */
  const handleDateAccept = (type, date) => {
    // 유효하지 않은 날짜인지 확인
    if (!date || !dayjs(date).isValid()) {
      setAlert({ open: true, message: '유효하지 않은 날짜 형식입니다.', severity: 'warning' });
      return;
    }

    if (type === 'start') {
      // 선택된 직원들의 입사일 확인 (중도 입사자인 경우)
      let earliestStart = null;
      
      if (selectedEmployees.length > 0) {
        // 선택된 직원들 중 가장 늦은 입사일 찾기
        for (const employeeId of selectedEmployees) {
          const employee = employees.find(emp => emp.id === employeeId);
          if (employee && employee.start_date) {
            const empStartDate = dayjs(employee.start_date);
            // 현재 선택된 시작일보다 늦은 입사일이면 갱신
            if (!earliestStart || empStartDate.isAfter(earliestStart)) {
              earliestStart = empStartDate;
            }
          }
        }
      }
      
      // 입사일이 선택된 시작일보다 늦으면 입사일로 시작일 조정
      if (earliestStart && earliestStart.isAfter(date)) {
        setAlert({ 
          open: true, 
          message: '선택된 직원의 입사일에 맞게 시작일이 조정되었습니다.', 
          severity: 'info' 
        });
        date = earliestStart;
      }
      
      // 종료일 조정
      if (selectedPeriod.end) {
        // 시작일에 따른 임금 지급일 기준 유효한 종료일 계산
        // 임금일 전에 있는 가장 가까운 날짜로 종료일 계산
        const validEndDate = calculateEndDate(date, paymentDay);
        
        // 선택된 직원들의 퇴사일 확인 (중도 퇴사자인 경우)
        let earliestQuit = null;
        
        if (selectedEmployees.length > 0) {
          // 선택된 직원들 중 가장 빠른 퇴사일 찾기
          for (const employeeId of selectedEmployees) {
            const employee = employees.find(emp => emp.id === employeeId);
            if (employee && employee.end_date) {
              const empEndDate = dayjs(employee.end_date);
              // 가장 빠른 퇴사일 업데이트
              if (!earliestQuit || empEndDate.isBefore(earliestQuit)) {
                earliestQuit = empEndDate;
              }
            }
          }
        }
        
        // 퇴사일이 계산된 종료일보다 이르면 퇴사일로 종료일 설정
        if (earliestQuit && earliestQuit.isBefore(validEndDate)) {
          setSelectedPeriod(prev => ({ 
            ...prev, 
            start: date, 
            end: earliestQuit,
            type: QUICK_PERIODS.CUSTOM 
          }));
          
          setAlert({
            open: true,
            message: '퇴사일에 맞게 종료일이 자동 조정되었습니다.',
            severity: 'info'
          });
        } else if (!selectedPeriod.end.isSame(validEndDate)) {
          // 기존 종료일이 유효한 종료일과 다르면 조정
          setSelectedPeriod(prev => ({ 
            ...prev, 
            start: date, 
            end: validEndDate,
            type: QUICK_PERIODS.CUSTOM 
          }));
          
          setAlert({ 
            open: true, 
            message: '임금 지급일 기준으로 종료일이 조정되었습니다.', 
            severity: 'info' 
          });
        } else {
          // 종료일이 유효하면 시작일만 업데이트
          setSelectedPeriod(prev => ({ ...prev, start: date, type: QUICK_PERIODS.CUSTOM }));
        }
      } else {
        // 종료일이 없으면 자동으로 계산하여 설정
        const calculatedEndDate = calculateEndDate(date, paymentDay);
        setSelectedPeriod(prev => ({ 
          ...prev, 
          start: date, 
          end: calculatedEndDate,
          type: QUICK_PERIODS.CUSTOM 
        }));
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
      
      // 임금 지급일 기준으로 유효한 종료일 계산
      const validEndDate = calculateEndDate(selectedPeriod.start, paymentDay);
      
      // 선택된 직원들의 퇴사일 확인 (중도 퇴사자인 경우)
      let earliestQuit = null;
      
      if (selectedEmployees.length > 0) {
        // 선택된 직원들 중 가장 빠른 퇴사일 찾기
        for (const employeeId of selectedEmployees) {
          const employee = employees.find(emp => emp.id === employeeId);
          if (employee && employee.end_date) {
            const empEndDate = dayjs(employee.end_date);
            // 가장 빠른 퇴사일 업데이트
            if (!earliestQuit || empEndDate.isBefore(earliestQuit)) {
              earliestQuit = empEndDate;
            }
          }
        }
      }
      
      // 퇴사일이 있고, 선택된 종료일보다 빠르면 퇴사일로 설정
      if (earliestQuit && earliestQuit.isBefore(date)) {
        setSelectedPeriod(prev => ({ ...prev, end: earliestQuit, type: QUICK_PERIODS.CUSTOM }));
        
        setAlert({
          open: true,
          message: '퇴사일에 맞게 종료일이 자동 조정되었습니다.',
          severity: 'info'
        });
      } else if (date.isAfter(validEndDate)) {
        // 선택된 날짜가 임금 지급일 기준 유효 범위를 넘어가면 조정
        setAlert({ 
          open: true, 
          message: '임금 지급일 기준으로 종료일이 조정되었습니다.', 
          severity: 'info' 
        });
        setSelectedPeriod(prev => ({ ...prev, end: validEndDate, type: QUICK_PERIODS.CUSTOM }));
      } else {
        // 유효한 종료일이면 그대로 설정
        setSelectedPeriod(prev => ({ ...prev, end: date, type: QUICK_PERIODS.CUSTOM }));
      }
    }
  };

  /**
   * 빠른 기간 선택 핸들러
   * @param {string} periodType - QUICK_PERIODS 상수 중 하나
   */
  const handleQuickPeriodSelect = (periodType) => {
    const now = dayjs();
    let start, end;

    switch (periodType) {
      case QUICK_PERIODS.CURRENT_PERIOD:
        // 현재 임금 지급 주기: 임금 지급일 기준 현재 기간
        start = calculateStartDate(paymentDay);
        end = calculateEndDate(start, paymentDay);
        break;
        
      case QUICK_PERIODS.PREVIOUS_PERIOD:
        // 이전 임금 지급 주기: 한 달 전의 임금 기간
        if (paymentDay === 1) {
          // 지급일이 1일인 경우: 2개월 전 달의 1일부터 1개월 전 달의 말일까지
          start = now.subtract(2, 'month').startOf('month');
          end = now.subtract(1, 'month').endOf('month');
        } else {
          // 지급일이 1일이 아닌 경우: 2개월 전 달의 지급일부터 1개월 전 지급일 전날까지
          const twoMonthsAgo = now.subtract(2, 'month');
          const oneMonthAgo = now.subtract(1, 'month');
          
          // 해당 월에 지급일이 없는 경우 조정
          if (paymentDay > twoMonthsAgo.daysInMonth()) {
            start = twoMonthsAgo.endOf('month');
          } else {
            start = twoMonthsAgo.date(paymentDay);
          }
          
          if (paymentDay === 1) {
            end = oneMonthAgo.endOf('month');
          } else {
            const endDay = paymentDay - 1;
            if (endDay > oneMonthAgo.daysInMonth()) {
              end = oneMonthAgo.endOf('month');
            } else {
              end = oneMonthAgo.date(endDay);
            }
          }
        }
        break;
        
      case QUICK_PERIODS.NEXT_PERIOD:
        // 다음 임금 지급 주기: 한 달 후의 임금 기간
        if (paymentDay === 1) {
          // 지급일이 1일인 경우: 다음 달의 1일부터 다음 달의 말일까지
          start = now.add(1, 'month').startOf('month');
          end = now.add(1, 'month').endOf('month');
        } else {
          // 지급일이 1일이 아닌 경우: 현재 달의 지급일부터 다음 달 지급일 전날까지
          const thisMonth = now;
          const nextMonth = now.add(1, 'month');
          
          // 해당 월에 지급일이 없는 경우 조정
          if (paymentDay > thisMonth.daysInMonth()) {
            start = thisMonth.endOf('month');
          } else {
            start = thisMonth.date(paymentDay);
          }
          
          if (paymentDay === 1) {
            end = nextMonth.endOf('month');
          } else {
            const endDay = paymentDay - 1;
            if (endDay > nextMonth.daysInMonth()) {
              end = nextMonth.endOf('month');
            } else {
              end = nextMonth.date(endDay);
            }
          }
        }
        break;
        
      default:
        return; // CUSTOM의 경우 아무것도 하지 않음
    }

    // 선택된 직원들의 입사일/퇴사일에 맞게 기간 조정
    if (selectedEmployees.length > 0) {
      let latestStart = null;
      let earliestEnd = null;
      
      for (const employeeId of selectedEmployees) {
        const employee = employees.find(emp => emp.id === employeeId);
        
        if (employee) {
          // 입사일 체크
          if (employee.start_date) {
            const empStart = dayjs(employee.start_date);
            if (empStart.isAfter(start) && (!latestStart || empStart.isAfter(latestStart))) {
              latestStart = empStart;
            }
          }
          
          // 퇴사일 체크
          if (employee.end_date) {
            const empEnd = dayjs(employee.end_date);
            if (empEnd.isBefore(end) && (!earliestEnd || empEnd.isBefore(earliestEnd))) {
              earliestEnd = empEnd;
            }
          }
        }
      }
      
      // 입사일/퇴사일에 맞게 기간 조정
      if (latestStart) start = latestStart;
      if (earliestEnd) end = earliestEnd;
      
      // 조정된 기간이 유효한지 확인
      if (start.isAfter(end)) {
        setAlert({
          open: true, 
          message: '선택된 직원의 입사일과 퇴사일로 인해 유효한 임금 기간이 없습니다.', 
          severity: 'warning'
        });
        return;
      }
    }

    setSelectedPeriod({ start, end, type: periodType });
  };

  const handleEmployeeSelection = (selectedIds) => {
    setSelectedEmployees(selectedIds);
  };

  // 이미 확정된 급여 데이터 확인
  const checkExistingConfirmedPayrolls = async () => {
    try {
      if (!selectedPeriod.start || !selectedPeriod.end || selectedEmployees.length === 0) {
        return { exists: false, data: [] };
      }
      
      const response = await fetch('http://localhost:5000/api/payroll/check-existing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          start_date: selectedPeriod.start.format('YYYY-MM-DD'),
          end_date: selectedPeriod.end.format('YYYY-MM-DD'),
          employee_ids: selectedEmployees
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      
      return { exists: false, data: [] };
    } catch (error) {
      console.error('확정 데이터 확인 오류:', error);
      return { exists: false, data: [] };
    }
  };

  // 급여 계산 함수
  const handleCalculatePayroll = async () => {
    if (!selectedPeriod.start || !selectedPeriod.end) {
      setAlert({ open: true, message: '급여 계산 기간을 선택해주세요.', severity: 'warning' });
      return;
    }

    if (selectedEmployees.length === 0) {
      setAlert({ open: true, message: '직원을 선택해주세요.', severity: 'warning' });
      return;
    }

    // 이미 확정된 급여 데이터가 있는지 확인 (백엔드에 API 엔드포인트가 있는 경우)
    try {
      const { exists, data } = await checkExistingConfirmedPayrolls();
      if (exists) {
        // 이미 확정된 직원이 있는 경우 경고 표시
        const employeeNames = data.map(item => {
          const employee = employees.find(emp => emp.employee_id === item.employee_id || emp.id === item.employee_id);
          return employee ? employee.name : `직원 ID: ${item.employee_id}`;
        }).join(', ');
        
        setAlert({
          open: true,
          message: `선택한 기간에 이미 확정된 급여가 있는 직원이 있습니다: ${employeeNames}. 계속 진행할까요?`,
          severity: 'warning',
          action: (
            <Button 
              color="primary" 
              size="small"
              onClick={() => {
                setAlert({ open: false });
                proceedWithCalculation(data);
              }}
            >
              계속 진행
            </Button>
          )
        });
        return;
      } else {
        // 중복 없는 경우 바로 계산 진행
        proceedWithCalculation([]);
      }
    } catch (error) {
      // API가 없는 경우 등 오류 발생 시 그냥 계산 진행
      proceedWithCalculation([]);
    }
  };

  // 실제 급여 계산 진행 함수 (기존 handleCalculatePayroll 내용을 이동)
  const proceedWithCalculation = async (existingData = []) => {
    setCalculating(true);
    setCalculationProgress(0);
    setProgressMessage('준비 중...');
    setShowProgressBar(true);

    // 직원별 스켈레톤 UI로 결과 테이블 즉시 채우기
    const employeeSkeletons = selectedEmployees.map(employeeId => {
      const employee = employees.find(emp => emp.id === employeeId);
      // 이미 확정된 직원인지 확인
      const isAlreadyConfirmed = existingData.some(item => item.employee_id === employeeId);
      
      return {
        employee_id: employeeId,
        employee_name: employee?.name || '직원',
        department: employee?.department || '',
        position: employee?.position || '',
        isLoading: true,
        period_start: selectedPeriod.start.format('YYYY-MM-DD'),
        period_end: selectedPeriod.end.format('YYYY-MM-DD'),
        status: isAlreadyConfirmed ? 'confirmed' : 'calculating', // 이미 확정된 직원은 확정 상태로 표시
        base_salary: '계산 중...',
        total_deduction: '계산 중...',
        total_payment: '계산 중...',
        allowances: {},
        deductions: {},
        attendance: { present_days: '-', absent_days: '-', late_days: '-' }
      };
    });

    // 스켈레톤 UI 즉시 표시
    setCalculationResults(employeeSkeletons);

    try {
      // 동기화 강제 실행 및 완료 대기
      setProgressMessage('근태 데이터 동기화 중...');
      const syncSuccess = await syncAttendanceFile();
      if (!syncSuccess) {
        throw new Error('근태 데이터 동기화에 실패했습니다.');
      }

      // 동기화 후 데이터 재로드
      await fetchAttendance();
      setProgressMessage('임금 계산을 시작합니다...');

      // 계산 요청 데이터 준비
      const requestData = {
        start_date: selectedPeriod.start.format('YYYY-MM-DD'),
        end_date: selectedPeriod.end.format('YYYY-MM-DD'),
        employee_ids: selectedEmployees,
        attendance_data: attendanceData,
        // 항상 재계산 및 캐시 무시
        force_recalculate: true,
        ignore_cache: true,
        timestamp: new Date().getTime() // 캐시 방지용 타임스탬프
      };
      
      console.log('임금 계산 요청 데이터:', requestData);
      
      // 스트리밍 응답을 처리하기 위한 fetch 요청
      const response = await fetch('http://localhost:5000/api/payroll/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '임금 계산 실패');
      }
      
      // 스트리밍 응답 처리를 위한 reader 설정
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let calculationResults = [];
      let completedEmployees = 0;
      const totalEmployees = selectedEmployees.length;
      
      while (true) {
        const { value, done } = await reader.read();
        
        if (done) {
          break;
        }
        
        // 디코딩 후 라인별로 처리
        const text = decoder.decode(value);
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            console.log('서버 응답 라인:', data);
            
            // 진행 상태 업데이트
            if (data.status === 'progress') {
              setCalculationProgress(data.progress);
              setProgressMessage(data.message);
            } 
            // 단일 직원 계산 완료 처리
            else if (data.status === 'employee_calculated' && data.employee_data) {
              completedEmployees++;
              
              // 직원별 계산 완료 시 즉시 UI 업데이트
              setCalculationResults(prev => prev.map(item => 
                item.employee_id === data.employee_data.employee_id
                  ? { ...data.employee_data, isLoading: false, status: 'unconfirmed' }
                  : item
              ));
              
              // 진행률 업데이트
              const progress = Math.floor((completedEmployees / totalEmployees) * 100);
              setCalculationProgress(progress);
              setProgressMessage(`${completedEmployees}/${totalEmployees} 직원 임금 계산 완료`);
              
              // 결과 저장
              calculationResults.push(data.employee_data);
            }
            // 계산 로그 처리
            else if (data.status === 'calculation_logs') {
              console.group(`임금 계산 결과 - 직원 ID: ${data.employee_id}`);
              if (data.logs && Array.isArray(data.logs)) {
                data.logs.forEach(log => console.log(log));
              }
              console.groupEnd();
            }
            // 오류 메시지 처리
            else if (data.status === 'error') {
              console.error('임금 계산 중 오류:', data.message);
              
              // 특정 직원 계산 오류 시 해당 직원만 오류 표시
              if (data.employee_id) {
                setCalculationResults(prev => prev.map(item => 
                  item.employee_id === data.employee_id
                    ? { 
                        ...item, 
                        isLoading: false, 
                        hasError: true,
                        errorMessage: data.message,
                        status: 'error' 
                      }
                    : item
                ));
              } else {
                // 전체 오류
                setAlert({
                  open: true,
                  message: `계산 중 오류 발생: ${data.message}`,
                  severity: 'warning'
                });
              }
            } 
            // 최종 완료 처리
            else if (data.status === 'complete') {
              setCalculationProgress(100);
              setProgressMessage(data.message || '임금 계산이 완료되었습니다.');
              
              // 계산 결과가 있으면 저장 (이미 UI는 업데이트됨)
              if (data.data && Array.isArray(data.data)) {
                calculationResults = data.data;
                // 완료된 직원 수 업데이트
                completedEmployees = calculationResults.length;
              }
            }
          } catch (e) {
            console.error('응답 파싱 오류:', e, line);
          }
        }
      }
      
      // 최종 상태 업데이트 (미처리된 항목이 있을 경우)
      if (calculationResults.length > 0) {
        // 각 결과 항목에 status 필드가 없는 경우 기본값 'unconfirmed' 설정
        const resultsWithStatus = calculationResults.map(result => {
          if (result.status) {
            return result;
          }
          
          // 기존 confirmPayrolls 중에서 일치하는 항목이 있는지 확인
          const existingPayroll = confirmedPayrolls.find(
            p => p.employee_id === result.employee_id && 
            p.period_start === result.period_start && 
            p.period_end === result.period_end
          );
          
          return {
            ...result,
            status: existingPayroll ? existingPayroll.status : 'unconfirmed',
            isLoading: false
          };
        });
        
        // 모든 직원의 최종 상태를 한번에 설정
        setCalculationResults(resultsWithStatus);
        
        // 성공적으로 계산된 직원 수 계산 (오류가 있는 항목 제외)
        const successfullyCalculated = resultsWithStatus.filter(item => !item.hasError).length;
        
        setAlert({
          open: true, 
          message: `${successfullyCalculated}명의 직원에 대한 임금 계산이 완료되었습니다.`, 
          severity: 'success'
        });
      }
    } catch (err) {
      console.error('임금 계산 오류:', err);
      
      // 오류 발생 시 모든 스켈레톤 항목에 오류 표시
      setCalculationResults(prev => prev.map(item => 
        item.isLoading ? { 
          ...item, 
          isLoading: false, 
          hasError: true,
          errorMessage: err.message,
          status: 'error' 
        } : item
      ));
      
      setAlert({
        open: true,
        message: `임금 계산 중 오류가 발생했습니다: ${err.message}`,
        severity: 'error'
      });
    } finally {
      setCalculating(false);
      // 5초 후 진행 상태 표시 닫기
      setTimeout(() => {
        setShowProgressBar(false);
      }, 5000);
    }
  };

  // 임금 명세서 생성 및 이메일 발송 핸들러
  const handleSendPayslips = async () => {
    if (calculationResults.length === 0) {
      setAlert({ open: true, message: '먼저 임금을 계산해주세요.', severity: 'warning' });
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
        throw new Error(errorData.error || '임금명세서 발송 실패');
      }
      
      setAlert({ open: true, message: '임금명세서가 성공적으로 발송되었습니다.', severity: 'success' });
    } catch (err) {
      // 실제 구현 전에는 성공 메시지 표시 (시뮬레이션)
      setAlert({ open: true, message: '임금명세서 발송 시뮬레이션 완료 (백엔드 미구현)', severity: 'info' });
      console.error('임금명세서 발송 오류:', err);
    } finally {
      setCalculating(false);
    }
  };

  // 임금 확정 모달 열기 함수
  const handleOpenConfirmModal = () => {
    if (calculationResults.length === 0) {
      setAlert({ open: true, message: '먼저 임금을 계산해주세요.', severity: 'warning' });
      return;
    }
    setConfirmModalOpen(true);
  };

  // 토큰 확인 및 로그인 상태 체크 함수
  const checkAuthToken = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setAlert({
        open: true,
        message: '로그인이 필요합니다. 로그인 페이지로 이동합니다.',
        severity: 'warning'
      });
      // 2초 후 로그인 페이지로 리다이렉트
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      return false;
    }
    return true;
  };

  // 임금 확정 처리 함수
  const handleConfirmPayroll = async () => {
    // 토큰 체크
    if (!checkAuthToken()) {
      return;
    }

    setIsConfirming(true);
    try {
      // 계산된 임금 결과에서 미확정 데이터만 필터링
      const unconfirmedResults = calculationResults.filter(
        result => result.payroll_code && result.status !== 'confirmed'
      );
      
      if (unconfirmedResults.length === 0) {
        throw new Error('확정할 급여 데이터가 없습니다.');
      }

      // payroll_ids와 payroll_data 모두 전송
      const payrollIds = unconfirmedResults.map(result => result.payroll_code);
      
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/payroll/confirm', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          payroll_ids: payrollIds,
          payroll_data: unconfirmedResults, // 미확정 데이터 전체를 전송
          payment_period: {
            start: selectedPeriod.start.format('YYYY-MM-DD'),
            end: selectedPeriod.end.format('YYYY-MM-DD')
          },
          remarks: `${selectedPeriod.start.format('YYYY-MM-DD')}~${selectedPeriod.end.format('YYYY-MM-DD')} 임금 확정`,
          payroll_type: 'regular'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          // 인증 오류인 경우
          setAlert({
            open: true,
            message: '인증이 만료되었습니다. 다시 로그인해주세요.',
            severity: 'error'
          });
          setTimeout(() => {
            navigate('/login');
          }, 2000);
          return;
        }
        
        // 급여 기간 중복 오류 처리 - 사용자 친화적인 오류 메시지 표시
        if (errorData.error && errorData.error.includes('급여 기간이 기존 데이터와 중복됩니다')) {
          // 중복된 직원 정보 추출
          const duplicatedEmployees = [];
          const errorLines = errorData.error.split('\n');
          
          let currentEmployee = null;
          errorLines.forEach(line => {
            if (line.includes('직원 ID:')) {
              const employeeId = line.split('직원 ID:')[1].trim();
              const employee = employees.find(emp => emp.employee_id === employeeId || emp.id === employeeId);
              currentEmployee = {
                id: employeeId,
                name: employee ? employee.name : `직원 ID: ${employeeId}`,
                periods: []
              };
              duplicatedEmployees.push(currentEmployee);
            } else if (line.includes('기간:') && currentEmployee) {
              const periodMatch = line.match(/기간: (.*?) ~ (.*?) \(상태:/);
              if (periodMatch) {
                currentEmployee.periods.push({
                  start: periodMatch[1],
                  end: periodMatch[2]
                });
              }
            }
          });
          
          // 사용자 친화적인 오류 메시지 생성
          const duplicatedNames = duplicatedEmployees.map(emp => emp.name).join(', ');
          setAlert({
            open: true,
            message: `다음 직원들은 이미 해당 기간에 확정된 급여가 있습니다: ${duplicatedNames}`,
            severity: 'warning',
            duplicatedInfo: duplicatedEmployees
          });
          return;
        }
        
        throw new Error(errorData.error || '임금 확정 실패');
      }

      const data = await response.json();
      console.log('급여 확정 응답:', data);
      
      // 상태 업데이트: 확정된 급여의 상태를 'confirmed'로 변경
      const updatedResults = calculationResults.map(result => {
        // 확인된 payroll_code 목록 추출
        const confirmedPayrollCodes = data.confirmed_payrolls.map(item => 
          typeof item === 'string' ? item : item.payroll_code
        );
        
        // payroll_code가 확정된 목록에 있는지 확인
        if (confirmedPayrollCodes.includes(result.payroll_code)) {
          console.log(`상태 업데이트: ${result.payroll_code} -> confirmed`);
          return { ...result, status: 'confirmed' };
        }
        return result;
      });
      
      // 디버깅용 로그 추가
      console.log('업데이트 전 상태:', calculationResults.map(r => ({ code: r.payroll_code, status: r.status })));
      console.log('업데이트 후 상태:', updatedResults.map(r => ({ code: r.payroll_code, status: r.status })));
      
      setCalculationResults(updatedResults);
      setConfirmedPayrolls(prev => [...prev, ...data.confirmed_payrolls]);
      
      setAlert({ 
        open: true, 
        message: data.message || '임금 확정이 완료되었습니다.', 
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
      
      setConfirmModalOpen(false);
    } catch (error) {
      console.error('임금 확정 오류:', error);
      setAlert({
        open: true,
        message: error.message || '임금 확정 중 오류가 발생했습니다.',
        severity: 'error'
      });
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

  // 근태 데이터 편집 함수 수정
  const handleAttendanceEdit = (record, updatedData) => {
    // 근태 데이터 업데이트 로직
    const updatedAttendance = attendanceData.map(item => {
      if (item.employee_id === record.employee_id && item.date === record.date) {
        return { ...item, ...updatedData };
      }
      return item;
    });
    
    setAttendanceData(updatedAttendance);
    setHasAttendanceChanges(true); // 데이터가 수정되었음을 표시
    
    // 원본 데이터와 변경된 데이터를 추적
    const original = attendanceData.find(item => 
      item.employee_id === record.employee_id && item.date === record.date
    );
    
    // 변경 내역을 attendanceChanges에 저장
    if (original) {
      const changes = {
        ...record,
        original: {
          check_in: original.check_in || '',
          check_out: original.check_out || '',
          attendance_type: original.attendance_type || '정상'
        },
        modified: {
          check_in: updatedData.check_in || original.check_in || '',
          check_out: updatedData.check_out || original.check_out || '',
          attendance_type: updatedData.attendance_type || original.attendance_type || '정상'
        }
      };
      
      // 이미 변경 내역이 있는지 확인
      const existingChangeIndex = modifiedAttendance.findIndex(change => 
        change.employee_id === record.employee_id && change.date === record.date
      );
      
      if (existingChangeIndex >= 0) {
        // 기존 변경 내역 업데이트
        const updatedChanges = [...modifiedAttendance];
        updatedChanges[existingChangeIndex] = changes;
        setModifiedAttendance(updatedChanges);
      } else {
        // 새로운 변경 내역 추가
        setModifiedAttendance([...modifiedAttendance, changes]);
      }
    }
    
    setAlert({ open: true, message: '근태 데이터가 수정되었습니다. 임금 계산 시 적용됩니다.', severity: 'success' });
  };

  // 근태 변경 다이얼로그 열기
  const handleOpenAttendanceChangesDialog = () => {
    setAttendanceChangesDialogOpen(true);
  };

  // 근태 변경 다이얼로그 닫기
  const handleCloseAttendanceChangesDialog = () => {
    setAttendanceChangesDialogOpen(false);
  };

  // 근태 데이터 변경사항 저장 함수
  const saveAttendanceChanges = async () => {
    try {
      if (modifiedAttendance.length === 0) {
        setAlert({ open: true, message: '저장할 근태 데이터 변경사항이 없습니다.', severity: 'info' });
        return true;
      }

      setIsLoading(true);
      
      // 변경된 데이터 포맷팅
      const changes = modifiedAttendance.map(record => ({
        employee_id: record.employee_id,
        date: record.date,
        check_in: record.modified?.check_in || record.check_in,
        check_out: record.modified?.check_out || record.check_out,
        attendance_type: record.modified?.attendance_type || record.attendance_type
      }));

      // API 요청
      const response = await fetch('http://localhost:5000/api/attendance/update-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: changes })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '근태 데이터 업데이트 실패');
      }

      const result = await response.json();
      
      // 저장 성공 후 데이터 재로드
      await fetchAttendance();
      
      // 변경 내역 초기화
      setModifiedAttendance([]);
      setHasAttendanceChanges(false);
      
      // 다이얼로그 닫기
      setAttendanceChangesDialogOpen(false);
      
      // 성공 메시지
      setAlert({
        open: true,
        message: result.message || `${changes.length}개의 근태 데이터가 성공적으로 업데이트되었습니다.`,
        severity: 'success'
      });
      
      return true;
    } catch (err) {
      console.error('근태 데이터 저장 오류:', err);
      setAlert({
        open: true,
        message: `근태 데이터 저장 오류: ${err.message}`,
        severity: 'error'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 근태 변경 이력 조회 함수 추가
  const fetchAttendanceAudit = async (employeeId = null, fromDate = null, toDate = null) => {
    setAuditLoading(true);
    try {
      // API URL 구성 - 선택적 필터링 파라미터 추가
      let url = 'http://localhost:5000/api/attendance/audit';
      const params = new URLSearchParams();
      
      if (employeeId) params.append('employee_id', employeeId);
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('근태 변경 이력 조회 실패');
      }
      
      const data = await response.json();
      setAttendanceAuditData(data.audit_records || []);
    } catch (err) {
      console.error('근태 변경 이력 조회 오류:', err);
      setAlert({
        open: true,
        message: `근태 변경 이력 조회 오류: ${err.message}`,
        severity: 'error'
      });
    } finally {
      setAuditLoading(false);
    }
  };
  
  // 변경 이력 대화상자 열기
  const handleOpenAuditDialog = async () => {
    // 현재 선택된 기간에 해당하는 변경 이력 조회
    if (selectedPeriod.start && selectedPeriod.end) {
      await fetchAttendanceAudit(
        null, 
        selectedPeriod.start.format('YYYY-MM-DD'),
        selectedPeriod.end.format('YYYY-MM-DD')
      );
    } else {
      // 기간 선택이 없으면 모든 이력 조회
      await fetchAttendanceAudit();
    }
    
    setAuditDialogOpen(true);
  };
  
  // 변경 이력 대화상자 닫기
  const handleCloseAuditDialog = () => {
    setAuditDialogOpen(false);
  };

  // 컴포넌트 마운트 시 토큰 체크
  useEffect(() => {
    checkAuthToken();
  }, []);

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
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
          {/* API 상태 알림 */}
          {!apiStatus.connected && !apiStatus.checking && (
            <Alert severity="error" sx={{ mb: 2 }}>
              서버 연결에 실패했습니다. 네트워크 연결을 확인하고 페이지를 새로고침해주세요.
            </Alert>
          )}

          {/* <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
            임금 지급 관리
          </Typography>
           */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
              임금 지급관리
            </Typography>
            
            <Box display="flex" alignItems="center" gap={2}>
              {/* 실시간 연결 상태 표시 - 아이콘으로 변경 */}
              <Tooltip title={socketConnected ? "실시간 연결됨" : "연결 안됨"}>
                <span> {/* 버튼을 span으로 감싸서 Tooltip 경고 해결 */}
                  <IconButton 
                    size="small" 
                    sx={{ 
                      bgcolor: socketConnected ? 'rgba(46, 125, 50, 0.1)' : 'rgba(211, 47, 47, 0.1)', 
                      color: socketConnected ? 'success.main' : 'error.main',
                      width: '32px',
                      height: '32px'
                    }}
                    disabled={true}
                  >
                    {socketConnected ? <CheckCircleOutlineIcon fontSize="small" /> : <CloseIcon fontSize="small" />}
                  </IconButton>
                </span>
              </Tooltip>
              
              {/* 마지막 업데이트 시간 */}
              {lastUpdated && (
                <Typography variant="caption" color="text.secondary">
                  마지막 업데이트: {lastUpdated}
                </Typography>
              )}
              
              {/* 근태 데이터 변경 뱃지 */}
              {hasAttendanceChanges && (
                <AttendanceChangesBadge 
                  count={modifiedAttendance.length} 
                  onClick={handleOpenAttendanceChangesDialog} 
                />
              )}
              
              {/* 수동 변경 확인 버튼 */}
              <Tooltip title="수동으로 변경사항 확인">
                <IconButton 
                  color="primary" 
                  size="small"
                  onClick={manualCheckChanges}
                  disabled={isLoading}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          <Typography variant="body1" sx={{ color: theme.palette.text.secondary, mb: 4 }}>
            근태기록 기반 임금 계산 및 임금 명세서 발행을 관리합니다.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <StyledPaper sx={{ p: 3, height: '3' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" gutterBottom>임금 계산 기간</Typography>
                  
                  {/* 임금 지급일 설정 */}
                  {PAYMENT_DAY_OPTIONS.length > 0 ? (
                    <FormControl sx={{ width: 120 }} size="small">
                      <InputLabel id="payment-day-label">임금 지급일</InputLabel>
                      <Select
                        labelId="payment-day-label"
                        value={paymentDay}
                        onChange={handlePaymentDayChange}
                        label="임금 지급일"
                      >
                        {PAYMENT_DAY_OPTIONS.map(day => (
                          <MenuItem key={day} value={day}>매월 {day}일</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <Tooltip title={`임금 지급일은 config/payrollConfig.js 파일에서 설정 가능합니다. 현재: 매월 ${paymentDay}일`}>
                      <Typography variant="body2" sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        border: '1px dashed #aaa', 
                        p: 0.5, 
                        px: 1, 
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        color: 'text.secondary',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
                      }}>
                        <CalendarTodayIcon sx={{ mr: 0.5, fontSize: '0.9rem' }} />
                        지급일: {paymentDay}일
                      </Typography>
                    </Tooltip>
                  )}
                </Box>
                
                {/* 빠른 기간 선택 버튼 그룹 */}
                <Box sx={{ mb: 2 }}>
                  <ButtonGroup variant="outlined" size="small" sx={{ mb: 1 }}>
                    <Button 
                      onClick={() => handleQuickPeriodSelect(QUICK_PERIODS.PREVIOUS_PERIOD)}
                      variant={selectedPeriod.type === QUICK_PERIODS.PREVIOUS_PERIOD ? 'contained' : 'outlined'}
                    >
                      전기
                    </Button>
                    <Button 
                      onClick={() => handleQuickPeriodSelect(QUICK_PERIODS.CURRENT_PERIOD)}
                      variant={selectedPeriod.type === QUICK_PERIODS.CURRENT_PERIOD ? 'contained' : 'outlined'}
                    >
                      당기
                    </Button>
                    <Button 
                      onClick={() => handleQuickPeriodSelect(QUICK_PERIODS.NEXT_PERIOD)}
                      variant={selectedPeriod.type === QUICK_PERIODS.NEXT_PERIOD ? 'contained' : 'outlined'}
                    >
                      차기
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
                            helperText: '월 단위 임금 계산의 시작일',
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
                        maxDate={selectedPeriod.start ? calculateEndDate(selectedPeriod.start, paymentDay) : null}
                        openTo="year"
                        views={['year', 'month', 'day']}
                        disableOpenPicker={false}
                        // 연도 범위 제한 (현재 연도가 마지막 값, 총 12개 표시)
                        slotProps={{ 
                          textField: { 
                            fullWidth: true,
                            helperText: '월 단위 임금 계산의 종료일',
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
                
                {/* 근태 변경 이력 및 동기화 버튼 추가 */}
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Tooltip title="근태 변경 이력">
                    <IconButton
                      color="info"
                      onClick={handleOpenAuditDialog}
                    >
                      <HistoryIcon />
                    </IconButton>
                  </Tooltip>
                  
                  {/* 근태 파일 동기화 버튼 - 아이콘으로 변경 */}
                  <Tooltip title="근태 데이터 동기화">
                    <IconButton
                      color={attendanceFileChanged ? "warning" : "primary"}
                      onClick={syncAttendanceFile}
                      disabled={isLoading}
                    >
                      <SyncIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
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
                <Box 
                  display="flex" 
                  justifyContent="space-between" 
                  alignItems="center"
                  py={2}
                  px={1}
                  sx={{ 
                    minHeight: '60px',
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>임금 계산 및 지급</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    {hasAttendanceChanges && (
                      <Tooltip title={`${modifiedAttendance.length}개 근태 변경사항`}>
                        <IconButton
                          color="warning"
                          size="small"
                          onClick={handleOpenAttendanceChangesDialog}
                        >
                          <Badge badgeContent={modifiedAttendance.length} color="warning">
                            <WarningIcon />
                          </Badge>
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    {/* 변경사항 저장 버튼 - 아이콘으로 변경 */}
                    <Tooltip title="변경사항 저장">
                      <IconButton
                        color={attendanceFileChanged ? "warning" : "primary"}
                        size="small"
                        onClick={syncAttendanceFile}
                        disabled={isLoading}
                      >
                        <SaveIcon />
                      </IconButton>
                    </Tooltip>
                    
                    {/* 임금 계산 버튼 - 아이콘으로 변경 */}
                    <Tooltip title="임금 계산">
                      <span> {/* span으로 감싸서 disabled 상태에서도 툴팁 표시 */}
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={handleCalculatePayroll}
                          disabled={calculating || isLoading}
                        >
                          {calculating ? <CircularProgress size={16} color="inherit" /> : <CalculateIcon />}
                        </IconButton>
                      </span>
                    </Tooltip>
                    
                    {/* 임금 확정 버튼 - 아이콘 버튼으로 변경 */}
                    <Tooltip title="임금 확정">
                      <span> {/* span으로 감싸서 disabled 상태에서도 툴팁 표시 */}
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={handleOpenConfirmModal}
                          disabled={calculating || calculationResults.length === 0}
                        >
                          <CheckCircleOutlineIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
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

        {/* 임금 확정 모달 */}
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
              임금 확정
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              임금 기간: {selectedPeriod.start?.format('YYYY년 MM월 DD일')} ~ {selectedPeriod.end?.format('YYYY년 MM월 DD일')}
            </Typography>
            <Alert severity="warning" sx={{ mt: 2 }}>
              임금 확정 후에는 수정이 불가능합니다. 계산된 임금 정보를 다시 한 번 확인해주세요.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleCloseConfirmModal}
              variant="outlined"
              size="small"
            >
              취소
            </Button>
            <Button 
              onClick={handleConfirmPayroll} 
              variant="contained" 
              size="small"
              color="primary"
              disabled={isConfirming}
              startIcon={isConfirming ? <CircularProgress size={16} color="inherit" /> : <CheckCircleOutlineIcon />}
            >
              {isConfirming ? '처리 중...' : '확정하기'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 근태 변경 다이얼로그 */}
        <AttendanceChangesDialog 
          open={attendanceChangesDialogOpen}
          onClose={handleCloseAttendanceChangesDialog}
          changedRecords={modifiedAttendance}
          originalRecords={originalAttendanceData}
          onSave={saveAttendanceChanges}
          onRevert={handleAttendanceEdit}
        />

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

        {/* 진행 상황 모달 */}
        <Dialog
          open={showProgressBar}
          aria-labelledby="progress-dialog-title"
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle id="progress-dialog-title">
            임금 계산 진행 중
          </DialogTitle>
          <DialogContent dividers>
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {progressMessage || '데이터를 처리 중입니다...'}
              </Typography>
              <ProgressBar value={calculationProgress} message={`${calculationProgress}% 완료됨`} />
            </Box>
          </DialogContent>
        </Dialog>

        {/* 근태 변경 이력 대화상자 */}
        <Dialog
          open={auditDialogOpen}
          onClose={handleCloseAuditDialog}
          aria-labelledby="audit-dialog-title"
          maxWidth="md"
          fullWidth
        >
          <DialogTitle id="audit-dialog-title">
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">근태 변경 이력</Typography>
              <IconButton onClick={handleCloseAuditDialog} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            {auditLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : attendanceAuditData.length === 0 ? (
              <Alert severity="info">변경 이력이 없습니다.</Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>직원 ID</TableCell>
                      <TableCell>날짜</TableCell>
                      <TableCell>변경 항목</TableCell>
                      <TableCell>이전 값</TableCell>
                      <TableCell>변경 값</TableCell>
                      <TableCell>변경 유형</TableCell>
                      <TableCell>변경자</TableCell>
                      <TableCell>변경 시간</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {attendanceAuditData.map((audit, index) => (
                      <TableRow key={index}>
                        <TableCell>{audit.employee_id}</TableCell>
                        <TableCell>{audit.date}</TableCell>
                        <TableCell>{audit.field_name}</TableCell>
                        <TableCell>{audit.old_value || '-'}</TableCell>
                        <TableCell>{audit.new_value || '-'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={
                              audit.change_type === 'create' ? '생성' :
                              audit.change_type === 'update' ? '수정' :
                              audit.change_type === 'delete' ? '삭제' : 
                              audit.change_type
                            }
                            color={
                              audit.change_type === 'create' ? 'success' :
                              audit.change_type === 'update' ? 'info' :
                              audit.change_type === 'delete' ? 'error' : 
                              'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{audit.changed_by}</TableCell>
                        <TableCell>{new Date(audit.changed_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={handleCloseAuditDialog} 
              variant="outlined"
              size="small"
              startIcon={<CloseIcon />}
            >
              닫기
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
};

export default PayrollPayment;