import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Checkbox,
  FormGroup,
  FormControlLabel,
  TextField,
  Button,
  Divider,
  Chip,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Snackbar,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ButtonGroup,
  Slider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Stack,
  TablePagination,
  CircularProgress,
  Card,
  CardHeader,
  CardContent,
  MenuItem,
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GlobalTabs from '../../components/GlobalTabs';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import minMax from 'dayjs/plugin/minMax';
import AIMessageInput from '../../components/chat/AIMessageInput';
import { debounce } from '../../utils/debounce';
import SearchInput from '../../components/search/SearchInput';
import { analyzeData } from '../../services/aiService';
import { VIEW_MODES, TABLE_COLUMNS, getActiveColumns, SALARY_TABS, BASE_COLUMNS } from '../../utils/tableConstants';
import ProcessingProgress from '../../components/progress/ProcessingProgress';
import { DataChangeDetector } from '../../utils/dataChangeDetector';
import { message } from 'antd';
import { StyledPaper, StyledButton } from '../../components/StyledComponents';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../styles/theme';
import commonStyles from '../../styles/styles';

dayjs.extend(isSameOrBefore);
dayjs.extend(minMax);

const PayrollAnalysis = () => {
  // 데이터 상태
  const [employeesData, setEmployeesData] = useState([]);
  const [payrollData, setPayrollData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  
  // 부서 코드 매핑 수정
  const departmentMap = {
    '전체': '전체',
    '개발팀': '개발',
    '영업팀': '영업',
    '총무팀': '총무',
    '재무팀': '재무',
    '생산팀': '생산'
  };

  // 부서 필터 상태 초기화 수정
  const [departments, setDepartments] = useState({
    '전체': false,
    '개발': false,
    '영업': false,
    '총무': false,
    '재무': false,
    '생산': false
  });
  const [nameQuery, setNameQuery] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // 알림 상태 추가
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'warning'
  });

  // 새로운 상태 추가
  const [quickDateRange, setQuickDateRange] = useState('3m');
  const [positions, setPositions] = useState({
    '전체': false,
    '사원': false,
    '대리': false,
    '과장': false,
    '차장': false,
    '부장': false,
    '이사': false
  });
  const [minDate, setMinDate] = useState(null);
  const [maxDate, setMaxDate] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState(VIEW_MODES.CARDS);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [aiResponse, setAiResponse] = useState(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  
  // 개선 1: 급여 기록 중심 설계를 위한 상태 추가
  const [payrollPeriods, setPayrollPeriods] = useState([]); // 급여 기간 목록
  const [selectedPayrollPeriods, setSelectedPayrollPeriods] = useState([]); // 선택된 급여 기간
  
  // 개선 2: 지급일 기준 필터링을 위한 상태
  const [paymentDateFilter, setPaymentDateFilter] = useState({
    year: null,
    month: new Date().getMonth() + 1
  });
  
  // 개선 3: 태그 시스템 도입을 위한 상태
  const [payrollTags, setPayrollTags] = useState({
    '정기급여': true,
    '입사급여': true,
    '퇴사급여': true,
    '기타': true
  });
  
  // 데이터 로딩 워크플로우 상태
  const [dataState, setDataState] = useState({
    isLoading: false,
    isError: false,
    errorMessage: ''
  });

  // 검색어 관련
  const [searchQuery, setSearchQuery] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [duplicateEmployees, setDuplicateEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // 고급 검색 펼침 상태 관리를 위한 상태 추가
  const [expandedAdvanced, setExpandedAdvanced] = useState(false);

  // AI 채팅 관련 상태 추가
  const [inputMessage, setInputMessage] = useState('');

  // 전체 검색 상태 추가
  const [allSearch, setAllSearch] = useState(false);

  // 불필요한 벡터 스토어 관련 상태 제거
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // 필요한 진행 상태는 유지
  const [processingState, setProcessingState] = useState({
    status: 'idle',
    progress: 0,
    message: ''
  });

  // DatePicker 공통 스타일 수정
  const datePickerStyle = {
    width: '100%',
    '& .MuiInputBase-root': {
      height: '40px',
      fontSize: '0.875rem',
      color: '#333333', // 라이트 테마 텍스트 색상
      '& fieldset': { borderColor: 'rgba(0, 0, 0, 0.3)' },
      '&:hover fieldset': { borderColor: 'rgba(0, 0, 0, 0.5)' },
    },
    '& .MuiSvgIcon-root': {
      color: 'rgba(0, 0, 0, 0.7)',
    },
    '& .MuiInputLabel-root': {
      display: 'none',
    },
    '& .MuiPaper-root': {
      backgroundColor: '#FFFFFF',
      color: '#333333',
    },
  };

  // 데이터 로딩
  const loadData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }

      // 직원 목록 로드
      const employeesResponse = await fetch('http://localhost:5000/api/employees', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!employeesResponse.ok) {
        throw new Error('직원 목록을 불러오는데 실패했습니다.');
      }
      const employeesData = await employeesResponse.json();
      console.log('직원 데이터 로드:', employeesData.length, '명'); // 디버깅용 로그
      setEmployeesData(employeesData);

      // 급여 데이터 로드
      const payrollResponse = await fetch('http://localhost:5000/api/payroll/records', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!payrollResponse.ok) {
        throw new Error('급여 데이터를 불러오는데 실패했습니다.');
      }
      
      const payrollData = await payrollResponse.json();
      console.log('급여 데이터 로드:', payrollData.length, '건'); // 디버깅용 로그
      
      // 확정된 급여 데이터만 필터링
      const confirmedPayrolls = payrollData.filter(record => 
        record.status === 'confirmed' || record.status === 'paid'
      );
      console.log('확정된 급여 데이터:', confirmedPayrolls.length, '건'); // 디버깅용 로그
      
      setPayrollData(confirmedPayrolls);
      
      // 필터 적용
      applyFilters(confirmedPayrolls);
    } catch (error) {
      console.error('데이터 로딩 오류:', error);
      setDataState({
        isLoading: false,
        isError: true,
        errorMessage: error.message
      });
      setAlert({
        open: true,
        message: error.message || '데이터 로딩 중 오류가 발생했습니다.',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (data) => {
    let filteredData = [...data];

    // 기간 필터
    if (startDate && endDate) {
      filteredData = filteredData.filter(record => {
        const recordStart = new Date(record.payment_period_start);
        const recordEnd = new Date(record.payment_period_end);
        return recordStart >= startDate && recordEnd <= endDate;
      });
    }

    // 직원 필터
    if (nameQuery) {
      filteredData = filteredData.filter(record =>
        employeesData.find(emp => emp.employee_id === record.employee_id)?.name?.toLowerCase().includes(nameQuery.toLowerCase())
      );
    }

    // 부서 필터
    if (Object.values(departments).some(val => val === true) && !departments['전체']) {
      filteredData = filteredData.filter(record =>
        employeesData.find(emp => emp.employee_id === record.employee_id)?.department?.trim() === Object.keys(departments).find(dept => departments[dept])
      );
    }

    // 직급 필터
    if (Object.values(positions).some(val => val === true) && !positions['전체']) {
      filteredData = filteredData.filter(record =>
        employeesData.find(emp => emp.employee_id === record.employee_id)?.position?.trim() === Object.keys(positions).find(pos => positions[pos])
      );
    }

    // 태그 필터
    filteredData = filteredData.filter(record => payrollTags[record.payroll_tag] === true);

    // 지급일 필터
    if (paymentDateFilter.year && paymentDateFilter.month) {
      filteredData = filteredData.filter(record => {
        if (!record.payment_date) return false;
        const paymentDate = dayjs(record.payment_date);
        return paymentDate.isValid() && 
               paymentDate.year() === paymentDateFilter.year && 
               paymentDate.month() + 1 === paymentDateFilter.month;
      });
    }

    setFilteredData(filteredData);
    setPage(0); // 페이지 리셋
  };

  // 급여 기간 제목 생성 함수
  const generatePayrollPeriodTitle = (startDate, endDate, tag, employee) => {
    console.log('제목 생성 입력값:', startDate, endDate, tag, employee);
    
    // 날짜 포맷팅 함수
    const formatDate = (dateStr) => {
      if (!dateStr) return '날짜 없음';
      try {
        const date = dayjs(dateStr);
        return date.isValid() ? date.format('YYYY-MM-DD') : '유효하지 않은 날짜';
      } catch (error) {
        console.error('날짜 변환 오류:', error);
        return '날짜 변환 오류';
      }
    };
    
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    
    // 태그에 따른 제목 생성
    let periodTitle = '';
    
    switch(tag) {
      case '정기급여':
        periodTitle = `${start} ~ ${end} 정기급여`;
        break;
      case '입사급여':
        periodTitle = `${employee.name} 입사급여 (${start} ~ ${end})`;
        break;
      case '퇴사급여':
        periodTitle = `${employee.name} 퇴사급여 (${start} ~ ${end})`;
        break;
      case '기타':
        periodTitle = `${start} ~ ${end} 특별급여`;
        break;
      default:
        periodTitle = `${start} ~ ${end} 급여`;
    }
    
    return periodTitle;
  };

  // 엔드포인트에서 가져온 데이터에 필터 적용
  useEffect(() => {
    applyFilters(payrollData);
  }, [payrollData, startDate, endDate, nameQuery, departments, positions, paymentDateFilter, employeesData]);

  // 데이터 로드
  useEffect(() => {
    loadData();
  }, []);

  // 부서 필터 상태 업데이트
  const handleDepartmentChange = (dept) => {
    if (dept === '전체') {
      // 전체 선택 시 모든 부서 선택/해제 토글
      const allSelected = !departments['전체'];
      const newDepartments = Object.keys(departments).reduce((acc, curr) => {
        acc[curr] = allSelected;
        return acc;
      }, {});
      setDepartments(newDepartments);
    } else {
      // 개별 부서 선택 토글
      setDepartments({
        ...departments,
        [dept]: !departments[dept],
        '전체': false
      });
    }
  };

  // 빠른 날짜 범위 설정
  const setQuickDateFilter = (range) => {
    const endDate = dayjs();
    let startDate;

    switch (range) {
      case '1m':
        startDate = endDate.subtract(1, 'month');
        break;
      case '3m':
        startDate = endDate.subtract(3, 'month');
        break;
      case '6m':
        startDate = endDate.subtract(6, 'month');
        break;
      case '1y':
        startDate = endDate.subtract(1, 'year');
        break;
      default:
        startDate = endDate.subtract(3, 'month');
    }

    setStartDate(startDate);
    setEndDate(endDate);
    setQuickDateRange(range);
  };

  // AI 쿼리 처리 핸들러
  const handleAIQuery = async (query) => {
    if (!query || !query.trim()) return;
    
    try {
      // 입력 필드 초기화
      setInputMessage('');
      
      // 사용자 메시지 추가
      const userMessage = { role: 'user', content: query };
      setChatMessages(prev => [...prev, userMessage]);
      setIsAiThinking(true);
      
      // 필터링 데이터 없는 경우 처리
      if (filteredData.length === 0) {
        throw new Error('분석할 데이터가 없습니다. 필터를 조정하거나 데이터를 확인해주세요.');
      }

      // 백엔드 API 호출로 변경
      const result = await analyzeData(filteredData, employeesData, query);
      
      // AI 응답 메시지 추가
      const aiMessage = { role: 'assistant', content: result.analysis };
      setChatMessages(prev => [...prev, aiMessage]);
      
    } catch (error) {
      console.error('AI 쿼리 처리 중 오류:', error);
      
      // 오류 메시지 추가
      const errorMessage = { 
        role: 'assistant', 
        content: `분석 중 오류가 발생했습니다: ${error.message}` 
      };
      setChatMessages(prev => [...prev, errorMessage]);
      
      setAlert({
        open: true,
        message: '데이터 분석 중 오류가 발생했습니다.',
        severity: 'error'
      });
    } finally {
      setIsAiThinking(false);
    }
  };

  // 랜더링을 위한 통합 데이터 (직원 정보 + 급여 정보)
  const integratedData = useMemo(() => {
    return filteredData.map(payroll => {
      const employee = employeesData.find(emp => emp.employee_id === payroll.employee_id) || {};
      return {
        ...payroll,
        name: employee.name || '정보 없음',
        department: employee.department || '정보 없음',
        position: employee.position || '정보 없음',
        hireDate: employee.hire_date || '정보 없음'
      };
    });
  }, [filteredData, employeesData]);

  // 직원별 급여 내역 그룹화
  const employeePayrollGroups = useMemo(() => {
    const groups = {};
    filteredData.forEach(record => {
      if (!groups[record.employee_id]) {
        groups[record.employee_id] = [];
      }
      groups[record.employee_id].push(record);
    });
    return groups;
  }, [filteredData]);

  // 직원별 총 급여 통계
  const employeeStats = useMemo(() => {
    return Object.keys(employeePayrollGroups).map(empId => {
      const records = employeePayrollGroups[empId];
      const emp = employeesData.find(e => e.employee_id === empId) || {};
      
      return {
        employee_id: empId,
        name: emp.name || '정보 없음',
        department: emp.department || '정보 없음',
        position: emp.position || '정보 없음',
        recordCount: records.length,
        totalGrossPay: records.reduce((sum, r) => sum + Number(r.gross_pay || 0), 0),
        avgGrossPay: records.reduce((sum, r) => sum + Number(r.gross_pay || 0), 0) / records.length,
        lastPayDate: records.length > 0 ? new Date(Math.max(...records.map(r => new Date(r.payment_date)))) : null
      };
    });
  }, [employeePayrollGroups, employeesData]);

  // 알림 닫기 핸들러
  const handleAlertClose = () => {
    setAlert(prev => ({ ...prev, open: false }));
  };

  // 페이지네이션 핸들러
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // 테이블에 보여줄 데이터 (페이지네이션 적용)
  const currentPageData = integratedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // 직급 필터 상태 업데이트
  const handlePositionChange = (pos) => {
    if (pos === '전체') {
      // 전체 선택 시 모든 직급 선택/해제 토글
      const allSelected = !positions['전체'];
      const newPositions = Object.keys(positions).reduce((acc, curr) => {
        acc[curr] = allSelected;
        return acc;
      }, {});
      setPositions(newPositions);
    } else {
      // 개별 직급 선택 토글
      setPositions({
        ...positions,
        [pos]: !positions[pos],
        '전체': false
      });
    }
  };

  // 급여 기간 선택 변경 핸들러
  const handlePayrollPeriodChange = (periodId) => {
    // 이미 선택된 경우 제거, 아니면 추가 (다중 선택 지원)
    setSelectedPayrollPeriods(prev => {
      if (prev.includes(periodId)) {
        return prev.filter(id => id !== periodId);
      } else {
        return [...prev, periodId];
      }
    });
  };
  
  // 급여 태그 필터 변경 핸들러
  const handleTagFilterChange = (tag) => {
    setPayrollTags(prev => ({
      ...prev,
      [tag]: !prev[tag]
    }));
  };
  
  // 지급일 필터 변경 핸들러
  const handlePaymentDateFilterChange = (year, month) => {
    setPaymentDateFilter({
      year,
      month
    });
  };

  useEffect(() => {
    // 급여 데이터가 로드되면 사용 가능한 연도 목록 설정
    if (payrollData.length > 0) {
      const availableYears = Array.from(
        new Set(payrollData
          .filter(p => p.payment_date)
          .map(p => dayjs(p.payment_date).year())
        )
      );
      
      if (availableYears.length > 0) {
        // 가장 최근 연도를 기본값으로 설정
        const latestYear = Math.max(...availableYears);
        setPaymentDateFilter(prev => ({
          ...prev,
          year: latestYear
        }));
      } else {
        // 급여 데이터가 있지만 유효한 날짜가 없는 경우 현재 연도 사용
        setPaymentDateFilter(prev => ({
          ...prev,
          year: new Date().getFullYear()
        }));
      }
    }
  }, [payrollData]);

  return (
    <ThemeProvider theme={theme}>
      <Box sx={commonStyles.pageContainer}>
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
            임금 분석
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, color: theme.palette.text.secondary }}>
            확정된 임금 데이터를 분석하고, AI 기반 인사이트를 제공합니다.
          </Typography>

          {dataState.isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {dataState.isError && (
            <Alert severity="error" sx={{ my: 2 }}>
              데이터 로딩 중 오류가 발생했습니다: {dataState.errorMessage}
            </Alert>
          )}

          {!dataState.isLoading && !dataState.isError && payrollData.length === 0 && (
            <Alert severity="info" sx={{ my: 2 }}>
              아직 확정된 급여 데이터가 없습니다. 먼저 급여 계산 및 확정을 진행해주세요.
            </Alert>
          )}

          {!dataState.isLoading && !dataState.isError && payrollData.length > 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <StyledPaper elevation={1} sx={{ p: 2 }}>
                  <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                    급여 데이터 필터
                  </Typography>
                  
                  <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
                    급여 기록 선택
                  </Typography>
                  
                  <List sx={{ maxHeight: '250px', overflow: 'auto', bgcolor: 'background.paper', border: '1px solid #eee', borderRadius: 1 }}>
                    {payrollPeriods.map((period) => (
                      <ListItem 
                        key={period.id}
                        dense
                        secondaryAction={
                          <Checkbox
                            edge="end"
                            checked={selectedPayrollPeriods.includes(period.id)}
                            onChange={() => handlePayrollPeriodChange(period.id)}
                          />
                        }
                      >
                        <ListItemText 
                          primary={period.title}
                          primaryTypographyProps={{ variant: 'body2' }}
                          secondary={
                            <React.Fragment>
                              <Typography variant="caption" component="div" display="block">
                                지급일: {dayjs(period.payment_date).format('YYYY-MM-DD')}
                              </Typography>
                              <Typography variant="caption" component="div" display="block">
                                계산기간: {dayjs(period.start_date).format('YYYY-MM-DD')} ~ {dayjs(period.end_date).format('YYYY-MM-DD')}
                              </Typography>
                              <Box component="div">
                                <Chip 
                                  size="small" 
                                  label={period.tag} 
                                  sx={{ 
                                    mt: 0.5, 
                                    fontSize: '0.6rem', 
                                    height: 20,
                                    bgcolor: period.tag === '정기급여' ? '#e3f2fd' :
                                             period.tag === '입사급여' ? '#e8f5e9' :
                                             period.tag === '퇴사급여' ? '#fff3e0' : '#f5f5f5' 
                                  }} 
                                />
                              </Box>
                            </React.Fragment>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                  
                  <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>
                    급여 태그 필터
                  </Typography>
                  <FormGroup row>
                    {Object.keys(payrollTags).map((tag) => (
                      <FormControlLabel
                        key={tag}
                        control={
                          <Checkbox 
                            checked={payrollTags[tag]}
                            onChange={() => handleTagFilterChange(tag)}
                            size="small"
                          />
                        }
                        label={tag}
                        sx={{ width: '50%', mr: 0 }}
                      />
                    ))}
                  </FormGroup>
                  
                  <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>
                    지급월 선택
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="년도"
                        value={paymentDateFilter.year || ''}
                        onChange={(e) => handlePaymentDateFilterChange(parseInt(e.target.value), paymentDateFilter.month)}
                      >
                        {payrollData.length > 0 ? 
                          Array.from(new Set(payrollData
                            .filter(p => p.payment_date)
                            .map(p => dayjs(p.payment_date).year())
                          )).sort().reverse().map((year) => (
                            <MenuItem key={year} value={year}>{year}년</MenuItem>
                          ))
                          :
                          <MenuItem value={new Date().getFullYear()}>{new Date().getFullYear()}년</MenuItem>
                        }
                      </TextField>
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="월"
                        value={paymentDateFilter.month}
                        onChange={(e) => handlePaymentDateFilterChange(paymentDateFilter.year, parseInt(e.target.value))}
                      >
                        {[...Array(12)].map((_, i) => (
                          <MenuItem key={i+1} value={i+1}>{i+1}월</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  </Grid>
                  
                  <Divider sx={{ my: 3 }} />
                  
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    직원 기준 필터
                  </Typography>
                  
                  <TextField
                    fullWidth
                    label="직원명"
                    variant="outlined"
                    size="small"
                    value={nameQuery}
                    onChange={(e) => setNameQuery(e.target.value)}
                    margin="normal"
                    placeholder="직원 이름 검색..."
                  />
                  
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
                    부서별 필터
                  </Typography>
                  <FormGroup row>
                    {Object.keys(departmentMap).map((dept) => (
                      <FormControlLabel
                        key={dept}
                        control={
                          <Checkbox 
                            checked={departments[departmentMap[dept]]}
                            onChange={() => handleDepartmentChange(departmentMap[dept])}
                            size="small"
                          />
                        }
                        label={dept}
                        sx={{ width: '50%', mr: 0 }}
                      />
                    ))}
                  </FormGroup>
                  
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
                    직급별 필터
                  </Typography>
                  <FormGroup row>
                    {Object.keys(positions).map((pos) => (
                      <FormControlLabel
                        key={pos}
                        control={
                          <Checkbox 
                            checked={positions[pos]}
                            onChange={() => handlePositionChange(pos)}
                            size="small"
                          />
                        }
                        label={pos}
                        sx={{ width: '50%', mr: 0 }}
                      />
                    ))}
                  </FormGroup>
                  
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    sx={{ mt: 3 }}
                    onClick={() => applyFilters(payrollData)}
                  >
                    필터 적용 & 검색
                  </Button>
                </StyledPaper>
              </Grid>
              
              <Grid item xs={12} md={9}>
                <StyledPaper elevation={1}>
                  <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">
                      검색 결과 ({filteredData.length}건)
                    </Typography>
                    <Box>
                      <ButtonGroup variant="outlined" size="small">
                        <Button 
                          variant={viewMode === VIEW_MODES.CARDS ? 'contained' : 'outlined'}
                          onClick={() => setViewMode(VIEW_MODES.CARDS)}
                        >
                          카드뷰
                        </Button>
                        <Button 
                          variant={viewMode === VIEW_MODES.TABLE ? 'contained' : 'outlined'}
                          onClick={() => setViewMode(VIEW_MODES.TABLE)}
                        >
                          테이블뷰
                        </Button>
                      </ButtonGroup>
                    </Box>
                  </Box>

                  <Divider />
                  
                  {viewMode === VIEW_MODES.CARDS && (
                    <Box sx={{ p: 2 }}>
                      <Grid container spacing={2}>
                        {filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((record, index) => (
                          <Grid item xs={12} sm={6} md={4} key={`${record.payroll_code}-${index}`}>
                            <Card elevation={1}>
                              <CardHeader
                                title={record.employee_name}
                                subheader={`${record.department} / ${record.position}`}
                                titleTypographyProps={{ variant: 'subtitle1', fontWeight: 'bold' }}
                                subheaderTypographyProps={{ variant: 'body2' }}
                                action={
                                  <Chip 
                                    size="small" 
                                    label={record.payroll_tag} 
                                    sx={{ 
                                      fontSize: '0.7rem',
                                      bgcolor: record.payroll_tag === '정기급여' ? '#e3f2fd' :
                                               record.payroll_tag === '입사급여' ? '#e8f5e9' :
                                               record.payroll_tag === '퇴사급여' ? '#fff3e0' : '#f5f5f5' 
                                    }} 
                                  />
                                }
                              />
                              <CardContent>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  <Box component="span" fontWeight="bold">지급일:</Box> {dayjs(record.payment_date).format('YYYY-MM-DD')}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  <Box component="span" fontWeight="bold">계산기간:</Box> {dayjs(record.calculation_period_start).format('YYYY-MM-DD')} ~ {dayjs(record.calculation_period_end).format('YYYY-MM-DD')} ({record.calculation_period_days}일간)
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 1, color: 'primary.main', fontWeight: 'bold' }}>
                                  총지급액: {Number(record.gross_pay).toLocaleString()}원
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  공제액: {Number(record.deduction).toLocaleString()}원
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  실지급액: {Number(record.net_pay).toLocaleString()}원
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}
                  
                  <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                    <TablePagination
                      component="div"
                      count={filteredData.length}
                      page={page}
                      onPageChange={handleChangePage}
                      rowsPerPage={rowsPerPage}
                      onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                      }}
                      rowsPerPageOptions={[5, 10, 25]}
                      labelRowsPerPage="페이지당 항목수"
                    />
                  </Box>
                  
                  {/* AI 분석 대화창 */}
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      AI 급여 분석 도우미
                    </Typography>
                    
                    <Paper 
                      elevation={0}
                      sx={{ 
                        p: 2, 
                        mb: 2, 
                        maxHeight: '300px', 
                        overflowY: 'auto',
                        bgcolor: 'grey.50' 
                      }}
                    >
                      {chatMessages.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" align="center">
                          AI 분석 도우미에게 급여 데이터에 대해 질문해보세요.
                          <br />예시: "이번 달 부서별 평균 급여는 얼마인가요?", "야근 수당이 가장 많은 직원은 누구인가요?"
                        </Typography>
                      ) : (
                        chatMessages.map((msg, index) => (
                          <Box 
                            key={index} 
                            sx={{ 
                              mb: 2, 
                              display: 'flex', 
                              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' 
                            }}
                          >
                            <Paper 
                              elevation={1} 
                              sx={{ 
                                p: 1.5, 
                                maxWidth: '80%', 
                                borderRadius: '8px',
                                bgcolor: msg.role === 'user' ? 'primary.light' : 'background.paper',
                                color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary'
                              }}
                            >
                              <Typography variant="body2">{msg.content}</Typography>
                            </Paper>
                          </Box>
                        ))
                      )}
                      
                      {isAiThinking && (
                        <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                          <CircularProgress size={16} sx={{ mr: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            분석 중...
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                    
                    <AIMessageInput 
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onSubmit={handleAIQuery}
                      disabled={isAiThinking}
                      placeholder="급여 데이터에 대해 질문하세요..."
                    />
                  </Box>
                </StyledPaper>
              </Grid>
            </Grid>
          )}
          
          <Snackbar
            open={alert.open}
            autoHideDuration={6000}
            onClose={handleAlertClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Alert onClose={handleAlertClose} severity={alert.severity}>
              {alert.message}
            </Alert>
          </Snackbar>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default PayrollAnalysis;