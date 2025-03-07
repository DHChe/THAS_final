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
  const [selectedPeriod, setSelectedPeriod] = useState({ 
    start: null, 
    end: null, 
    type: QUICK_PERIODS.CUSTOM 
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
    
    // 근태 파일 변경 여부 확인
    checkAttendanceFileChanges();
  }, []);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/attendance');
        if (!response.ok) throw new Error('근태 데이터 로드 실패');
        const data = await response.json();
        const formattedData = data.map(record => ({
          ...record,
          check_in: record.check_in || '',
          check_out: record.check_out || '',
          attendance_type: record.attendance_type || '정상',
        })) || [];
        
        setAttendanceData(formattedData);
        // 원본 데이터도 저장 (변경 감지용)
        setOriginalAttendanceData(JSON.parse(JSON.stringify(formattedData)));
      } catch (err) {
        setAlert({ open: true, message: `근태 데이터 로드 오류: ${err.message}`, severity: 'error' });
      }
    };
    fetchAttendance();
  }, []);

  // 근태 파일 변경 확인 함수
  const checkAttendanceFileChanges = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/attendance/check-changes');
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
          message: '근태 파일이 변경되었습니다. 급여 계산 시 최신 데이터가 반영됩니다.',
          severity: 'info'
        });
      }
    } catch (err) {
      console.error('근태 파일 변경 확인 오류:', err);
    }
  };
  
  // 근태 파일 수동 동기화 함수
  const syncAttendanceFile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:5000/api/attendance/sync-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '근태 파일 동기화 실패');
      }
      
      const result = await response.json();
      
      // 동기화 후 근태 데이터 다시 로드
      await fetchAttendance();
      
      setAttendanceFileChanged(false);
      setAttendanceLastModified(result.last_modified);
      
      setAlert({
        open: true,
        message: result.message,
        severity: 'success'
      });
    } catch (err) {
      console.error('근태 파일 동기화 오류:', err);
      setAlert({
        open: true,
        message: `근태 파일 동기화 오류: ${err.message}`,
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 근태 데이터 변경 감지 및 추적 함수
  const updateAttendance = (employeeId, date, field, value) => {
    // 현재 근태 데이터 복사
    const updatedAttendance = [...attendanceData];
    
    // 해당 직원의 해당 날짜 근태 기록 찾기
    const recordIndex = updatedAttendance.findIndex(
      record => record.employee_id === employeeId && record.date === date
    );
    
    if (recordIndex !== -1) {
      // 기존 기록 업데이트
      updatedAttendance[recordIndex] = {
        ...updatedAttendance[recordIndex],
        [field]: value
      };
    } else {
      // 새 기록 추가
      updatedAttendance.push({
        employee_id: employeeId,
        date: date,
        [field]: value,
        // 다른 필드 기본값 설정
        check_in: field === 'check_in' ? value : '',
        check_out: field === 'check_out' ? value : '',
        attendance_type: field === 'attendance_type' ? value : '정상'
      });
    }
    
    // 상태 업데이트
    setAttendanceData(updatedAttendance);
    
    // 변경된 데이터 추적
    const originalRecord = originalAttendanceData.find(
      record => record.employee_id === employeeId && record.date === date
    );
    
    const updatedRecord = updatedAttendance[recordIndex !== -1 ? recordIndex : updatedAttendance.length - 1];
    const isModified = !originalRecord || 
      originalRecord.check_in !== updatedRecord.check_in || 
      originalRecord.check_out !== updatedRecord.check_out || 
      originalRecord.attendance_type !== updatedRecord.attendance_type;
    
    if (isModified) {
      // 이미 변경된 기록 목록에 있는지 확인
      const modifiedIndex = modifiedAttendance.findIndex(
        record => record.employee_id === employeeId && record.date === date
      );
      
      if (modifiedIndex !== -1) {
        // 기존 변경사항 업데이트
        const updatedChanges = [...modifiedAttendance];
        updatedChanges[modifiedIndex] = updatedRecord;
        setModifiedAttendance(updatedChanges);
      } else {
        // 새 변경사항 추가
        setModifiedAttendance([...modifiedAttendance, updatedRecord]);
      }
      
      setHasAttendanceChanges(true);
    }
  };

  // 근태 데이터 변경사항 서버로 전송
  const saveAttendanceChanges = async () => {
    if (!modifiedAttendance.length) {
      return false; // 변경된 데이터가 없으면 무시
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/attendance/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance_data: modifiedAttendance })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '근태 데이터 업데이트 실패');
      }
      
      const result = await response.json();
      console.log('근태 데이터 업데이트 성공:', result);
      
      // 업데이트 후 상태 초기화
      setOriginalAttendanceData(JSON.parse(JSON.stringify(attendanceData)));
      setModifiedAttendance([]);
      setHasAttendanceChanges(false);
      
      return true;
    } catch (err) {
      console.error('근태 데이터 업데이트 오류:', err);
      setAlert({ 
        open: true, 
        message: `근태 데이터 업데이트 오류: ${err.message}`, 
        severity: 'error' 
      });
      return false;
    }
  };

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

    // 계산 전 근태 파일 변경 확인
    await checkAttendanceFileChanges();

    // 근태 변경 확인 및 처리
    let attendanceUpdateSuccess = true;
    let forceRecalculate = false;
    
    // 근태 파일이 변경되었으면 동기화 확인
    if (attendanceFileChanged) {
      const userConfirmed = window.confirm(
        '근태 파일이 변경되었습니다. 데이터베이스를 최신 상태로 동기화하시겠습니까?'
      );
      
      if (userConfirmed) {
        await syncAttendanceFile();
        forceRecalculate = true;
      }
    }
    
    // UI에서 근태 데이터 변경이 있으면 먼저 저장 시도
    if (hasAttendanceChanges) {
      attendanceUpdateSuccess = await saveAttendanceChanges();
      if (attendanceUpdateSuccess) {
        forceRecalculate = true;
      }
    }

    // 근태 데이터 저장에 실패했지만 계속 진행을 원하는지 확인
    if (!attendanceUpdateSuccess) {
      const continueAnyway = window.confirm(
        '근태 데이터 업데이트에 실패했습니다. 기존 데이터로 계속 진행하시겠습니까?'
      );
      if (!continueAnyway) {
        return;
      }
    }

    setCalculating(true);
    setCalculationProgress(0);
    setProgressMessage('급여 계산을 시작합니다...');
    setShowProgressBar(true);
    
    try {
      // 계산 요청 데이터 준비
      const requestData = {
        start_date: selectedPeriod.start.format('YYYY-MM-DD'),
        end_date: selectedPeriod.end.format('YYYY-MM-DD'),
        employee_ids: selectedEmployees,
        attendance_data: attendanceData,
        // 항상 재계산하도록 설정
        force_recalculate: true
      };
      
      console.log('급여 계산 요청 데이터:', requestData);
      
      // 스트리밍 응답을 처리하기 위한 fetch 요청
      const response = await fetch('http://localhost:5000/api/payroll/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '급여 계산 실패');
      }
      
      // 스트리밍 응답 처리를 위한 reader 설정
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let calculationResults = [];
      
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
            // 계산 로그 처리 (새로 추가)
            else if (data.status === 'calculation_logs') {
              console.group(`급여 계산 결과 - 직원 ID: ${data.employee_id}`);
              if (data.logs && Array.isArray(data.logs)) {
                data.logs.forEach(log => console.log(log));
              }
              console.groupEnd();
            }
            // 오류 메시지 처리
            else if (data.status === 'error') {
              console.error('급여 계산 중 오류:', data.message);
              setAlert({
                open: true,
                message: `계산 중 오류 발생: ${data.message}`,
                severity: 'warning'
              });
            } 
            // 최종 완료 처리
            else if (data.status === 'complete') {
              setCalculationProgress(100);
              setProgressMessage(data.message);
              
              // 계산 결과 저장
              if (data.data && Array.isArray(data.data)) {
                calculationResults = data.data;
                console.log('최종 계산 결과:', calculationResults);
              }
            }
          } catch (e) {
            console.error('응답 파싱 오류:', e, line);
          }
        }
      }
      
      // 계산 결과가 있으면 상태 업데이트
      if (calculationResults.length > 0) {
        // 각 결과 항목에 status 필드가 없는 경우 기본값 'unconfirmed' 설정
        const resultsWithStatus = calculationResults.map(result => {
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
      } else {
        throw new Error('계산된 급여 데이터가 없습니다.');
      }
    } catch (err) {
      setAlert({ open: true, message: `계산 오류: ${err.message}`, severity: 'error' });
    } finally {
      setCalculating(false);
      // 약간의 지연 후 진행 표시줄 숨김 (사용자에게 100% 완료를 보여주기 위해)
      setTimeout(() => {
        setShowProgressBar(false);
      }, 1000);
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
    
    message.success("근태 데이터가 수정되었습니다. 급여 계산 시 적용됩니다.");
  };

  // 근태 변경 다이얼로그 열기
  const handleOpenAttendanceChangesDialog = () => {
    setAttendanceChangesDialogOpen(true);
  };

  // 근태 변경 다이얼로그 닫기
  const handleCloseAttendanceChangesDialog = () => {
    setAttendanceChangesDialogOpen(false);
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
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
              급여 지급관리
            </Typography>
            
            {/* 근태 데이터 변경 뱃지 추가 */}
            {hasAttendanceChanges && (
              <AttendanceChangesBadge 
                count={modifiedAttendance.length} 
                onClick={handleOpenAttendanceChangesDialog} 
              />
            )}
          </Box>
          
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
                
                {/* 근태 변경 이력 및 동기화 버튼 추가 */}
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Button
                    variant="outlined"
                    color="info"
                    startIcon={<HistoryIcon />}
                    onClick={handleOpenAuditDialog}
                    sx={{ mr: 1 }}
                  >
                    근태 변경 이력
                  </Button>
                  
                  {attendanceFileChanged && (
                    <Button
                      variant="contained"
                      color="warning"
                      startIcon={<SyncIcon />}
                      onClick={syncAttendanceFile}
                    >
                      근태 파일 동기화
                    </Button>
                  )}
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
                <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">급여 계산 및 지급</Typography>
                  <Box>
                    {hasAttendanceChanges && (
                      <Badge 
                        badgeContent={modifiedAttendance.length} 
                        color="warning" 
                        sx={{ mr: 2 }}
                        onClick={handleOpenAttendanceChangesDialog}
                      >
                        <Button
                          startIcon={<WarningIcon />}
                          variant="outlined"
                          color="warning"
                          size="small"
                        >
                          근태 변경사항
                        </Button>
                      </Badge>
                    )}
                    {attendanceFileChanged && (
                      <Button
                        startIcon={<SyncIcon />}
                        variant="outlined"
                        color="primary"
                        size="small"
                        onClick={syncAttendanceFile}
                        sx={{ mr: 2 }}
                      >
                        근태 파일 동기화
                      </Button>
                    )}
                    <StyledButton
                      variant="contained"
                      onClick={handleCalculatePayroll}
                      disabled={calculating}
                    >
                      {calculating ? <CircularProgress size={24} /> : '급여 계산'}
                    </StyledButton>
                    <StyledButton
                      variant="outlined"
                      onClick={handleOpenConfirmModal}
                      disabled={calculating || calculationResults.length === 0}
                      sx={{
                        backgroundColor: 'white',
                        color: theme.palette.primary.main,
                        marginLeft: 2,
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.05)',
                        },
                      }}
                    >
                      {isConfirming ? <CircularProgress size={24} /> : '급여 확정'}
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
            급여 계산 진행 중
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
            <Button onClick={handleCloseAuditDialog} color="primary">
              닫기
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
};

export default PayrollPayment;