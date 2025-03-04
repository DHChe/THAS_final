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
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GlobalTabs from '../../components/GlobalTabs'; // GlobalNavigation을 GlobalTabs로 변경
import dayjs from 'dayjs';
import { summarizeSearchResults, generateInitialAIMessage } from '../../utils/aiService';
import AIMessageInput from '../../components/chat/AIMessageInput';
import { debounce } from '../../utils/debounce';
import SearchInput from '../../components/search/SearchInput';
import { analyzeData } from '../../services/aiService';
import { VIEW_MODES, TABLE_COLUMNS, getActiveColumns, SALARY_TABS, BASE_COLUMNS } from '../../utils/tableConstants';
import { transformPayrollData } from '../../utils/payrollDataTransformer';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import ProcessingProgress from '../../components/progress/ProcessingProgress';
import { checkLangSmithSetup } from '../../utils/debugLangSmith';
import { DataChangeDetector } from '../../utils/dataChangeDetector';
import { message } from 'antd';
import ContextManager from '../../utils/contextManager';
import { StyledPaper, StyledButton } from '../../components/StyledComponents';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../styles/theme';
import commonStyles from '../../styles/styles';

dayjs.extend(isSameOrBefore);

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
    '부장': false
  });
  const [advancedFilters, setAdvancedFilters] = useState({
    joinDateRange: {
      start: null,
      end: null
    },
    tenureRange: [0, 10],
    showAdvanced: false
  });

  // 상태 추가
  const [searchQuery, setSearchQuery] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [duplicateEmployees, setDuplicateEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // 고급 검색 펼침 상태 관리를 위한 상태 추가
  const [expandedAdvanced, setExpandedAdvanced] = useState(false);

  // 페이지네이션을 위한 상태 추가
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(20);

  // AI 채팅 관련 상태 추가
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

  // 새로운 상태 추가
  const [activeTab, setActiveTab] = useState(SALARY_TABS.TOTAL.id);

  // 전체 검색 상태 추가
  const [allSearch, setAllSearch] = useState(false);

  // 불필요한 벡터 스토어 및 RAG 시스템 관련 상태 제거
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // 로딩 상태 관리를 위한 state 추가
  const [isLoading, setIsLoading] = useState(false);
  // 벡터 스토어 관련 상태 제거
  const [processingState, setProcessingState] = useState({
    status: 'idle',
    progress: 0,
    message: ''
  });

  // 최대/최소 날짜 상태 추가
  const [maxDate, setMaxDate] = useState(null);
  const [minDate, setMinDate] = useState(null);

  // 검색어 변경 핸들러
  const handleSearchQueryChange = useCallback((value) => {
    setSearchQuery(value);
  }, []);

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
    try {
      console.log('데이터 로딩 시작');
      
      // CSV 파일 로드 대신 백엔드 API 호출
      // 직원 데이터 로드
      const employeesResponse = await fetch('/api/employees');
      if (!employeesResponse.ok) {
        throw new Error(`직원 데이터 로딩 실패: ${employeesResponse.status}`);
      }
      const employees = await employeesResponse.json();
      
      // 확정된 급여 데이터만 로드 (confirmed 또는 paid 상태)
      const payrollResponse = await fetch('/api/payroll/records?status=confirmed,paid');
      if (!payrollResponse.ok) {
        throw new Error(`급여 데이터 로딩 실패: ${payrollResponse.status}`);
      }
      const payrollData = await payrollResponse.json();
      
      console.log('로드된 직원 수:', employees.length);
      console.log('로드된 급여 데이터 수:', payrollData.length);
      
      setEmployeesData(employees);
      setPayrollData(payrollData);

      if (payrollData.length > 0) {
        // 날짜 형식 변환 (백엔드 API 응답에 맞게 조정)
        const paymentDates = payrollData.map(p => dayjs(p.payment_date));
        const latestDate = dayjs.max(paymentDates);
        const earliestDate = dayjs.min(paymentDates);
        
        setMaxDate(latestDate);
        setMinDate(earliestDate);
        
        setStartDate(latestDate);
        setEndDate(latestDate);
      }
    } catch (error) {
      console.error('데이터 로딩 상세 에러:', error);
      setAlert({
        open: true,
        message: '급여 데이터 로드 중 오류가 발생했습니다.',
        severity: 'error'
      });
    }
  };

  // 지원금 계산 함수 (단순 임시 로직)
  function calculateSubsidy(employee, baseSalary) {
    // 실제로는 더 복잡한 로직이 필요
    return Math.floor(baseSalary * 0.05); 
  }

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

  // 급여 필터링 로직
  const applyFilters = useCallback(() => {
    if (!payrollData.length) return;
    
    console.log('필터링 시작', {
      nameQuery,
      departments,
      startDate: startDate?.format('YYYY-MM-DD'),
      endDate: endDate?.format('YYYY-MM-DD'),
      positions
    });

    let result = [...payrollData];

    // 이름 검색 필터
    if (nameQuery) {
      const employeeIds = employeesData
        .filter(emp => emp.name.includes(nameQuery))
        .map(emp => emp.employee_id);
      
      result = result.filter(record => employeeIds.includes(record.employee_id));
    }

    // 부서 필터
    const selectedDepartments = Object.entries(departments)
      .filter(([_, isSelected]) => isSelected)
      .map(([dept, _]) => dept);

    if (selectedDepartments.length > 0 && !selectedDepartments.includes('전체')) {
      const employeeIds = employeesData
        .filter(emp => selectedDepartments.includes(emp.department))
        .map(emp => emp.employee_id);
      
      result = result.filter(record => employeeIds.includes(record.employee_id));
    }

    // 직급 필터
    const selectedPositions = Object.entries(positions)
      .filter(([_, isSelected]) => isSelected)
      .map(([pos, _]) => pos);

    if (selectedPositions.length > 0 && !selectedPositions.includes('전체')) {
      const employeeIds = employeesData
        .filter(emp => selectedPositions.includes(emp.position))
        .map(emp => emp.employee_id);
      
      result = result.filter(record => employeeIds.includes(record.employee_id));
    }

    // 날짜 필터
    if (startDate && endDate) {
      result = result.filter(record => {
        const recordDate = dayjs(record.payment_date);
        return (
          recordDate.isAfter(startDate, 'day') || recordDate.isSame(startDate, 'day')
        ) && (
          recordDate.isBefore(endDate, 'day') || recordDate.isSame(endDate, 'day')
        );
      });
    }

    console.log(`필터링 결과: ${result.length}건`);
    setFilteredData(result);
    setPage(0); // 페이지 리셋
  }, [payrollData, nameQuery, departments, positions, startDate, endDate, employeesData]);

  // 엔드포인트에서 가져온 데이터에 필터 적용
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // 데이터 로드
  useEffect(() => {
    loadData();
  }, []);

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
    if (!query) return;
    
    try {
      // 사용자 메시지 추가
      const userMessage = { role: 'user', content: query };
      setChatMessages(prev => [...prev, userMessage]);
      setIsAiThinking(true);
      
      console.log('AI 분석 요청 준비:', {
        filteredDataLength: filteredData.length,
        employeesDataLength: employeesData.length,
        query
      });

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
      setInputMessage('');
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

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="xl" sx={{ mt: 3, mb: 8 }}>
        <GlobalTabs activeTab="payrollAnalysis" />
        
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: '#333' }}>
          급여 분석
        </Typography>
        
        <Grid container spacing={3}>
          {/* 왼쪽 영역: 검색 필터 */}
          <Grid item xs={12} md={3}>
            <StyledPaper elevation={1} sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                검색 필터
              </Typography>
              
              {/* 이름 검색 */}
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
              
              {/* 부서 필터 */}
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
              
              {/* 직급 필터 */}
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
                        onChange={() => setPositions({...positions, [pos]: !positions[pos]})}
                        size="small"
                      />
                    }
                    label={pos}
                    sx={{ width: '50%', mr: 0 }}
                  />
                ))}
              </FormGroup>
              
              {/* 급여 지급 기간 필터 */}
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
                급여 지급 기간
              </Typography>
              
              {/* 빠른 기간 선택 */}
              <ButtonGroup size="small" sx={{ mb: 2, display: 'flex' }}>
                <Button 
                  variant={quickDateRange === '1m' ? 'contained' : 'outlined'}
                  onClick={() => setQuickDateFilter('1m')}
                  sx={{ flex: 1 }}
                >
                  1개월
                </Button>
                <Button 
                  variant={quickDateRange === '3m' ? 'contained' : 'outlined'}
                  onClick={() => setQuickDateFilter('3m')}
                  sx={{ flex: 1 }}
                >
                  3개월
                </Button>
                <Button 
                  variant={quickDateRange === '6m' ? 'contained' : 'outlined'}
                  onClick={() => setQuickDateFilter('6m')}
                  sx={{ flex: 1 }}
                >
                  6개월
                </Button>
                <Button 
                  variant={quickDateRange === '1y' ? 'contained' : 'outlined'}
                  onClick={() => setQuickDateFilter('1y')}
                  sx={{ flex: 1 }}
                >
                  1년
                </Button>
              </ButtonGroup>
              
              {/* 시작일 선택 */}
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="시작일"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth size="small" margin="normal" />}
                  sx={datePickerStyle}
                  format="YYYY-MM-DD"
                  maxDate={endDate || undefined}
                />
                
                {/* 종료일 선택 */}
                <DatePicker
                  label="종료일"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth size="small" margin="normal" />}
                  sx={datePickerStyle}
                  format="YYYY-MM-DD"
                  minDate={startDate || undefined}
                />
              </LocalizationProvider>
              
              {/* 필터 적용 버튼 */}
              <StyledButton
                variant="contained"
                fullWidth
                sx={{ mt: 2 }}
                onClick={applyFilters}
              >
                검색
              </StyledButton>
            </StyledPaper>
          </Grid>
          
          {/* 오른쪽 영역: 검색 결과 및 AI 분석 */}
          <Grid item xs={12} md={9}>
            {/* 검색 결과 영역 */}
            <StyledPaper elevation={1} sx={{ p: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  급여 데이터 검색 결과
                </Typography>
                <Typography variant="body2">
                  검색 결과: <strong>{integratedData.length}</strong>건
                </Typography>
              </Box>
              
              {/* 테이블 */}
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>직원명</TableCell>
                      <TableCell>부서</TableCell>
                      <TableCell>직급</TableCell>
                      <TableCell>지급일</TableCell>
                      <TableCell align="right">기본급</TableCell>
                      <TableCell align="right">총급여</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentPageData.length > 0 ? (
                      currentPageData.map((row, index) => (
                        <TableRow key={`${row.employee_id}-${row.payment_date}-${index}`}>
                          <TableCell>{row.name}</TableCell>
                          <TableCell>{row.department}</TableCell>
                          <TableCell>{row.position}</TableCell>
                          <TableCell>
                            {dayjs(row.payment_date).format('YYYY-MM-DD')}
                          </TableCell>
                          <TableCell align="right">
                            {Number(row.base_salary).toLocaleString()}원
                          </TableCell>
                          <TableCell align="right">
                            {Number(row.gross_salary).toLocaleString()}원
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          {isLoading ? (
                            <CircularProgress size={24} />
                          ) : (
                            '검색 결과가 없습니다.'
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* 페이지네이션 */}
              <TablePagination
                component="div"
                count={integratedData.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={[20]}
              />
            </StyledPaper>
            
            {/* AI 분석 영역 */}
            <StyledPaper elevation={1} sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                AI 분석
              </Typography>
              
              {/* 질문 예시 칩 */}
              <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="body2" sx={{ mr: 1, alignSelf: 'center' }}>
                  질문 예시:
                </Typography>
                {[
                  '부서별 평균 급여는?',
                  '최고/최저 급여 직원은?',
                  '지난 3개월간 급여 트렌드',
                  '직급별 급여 분포는?'
                ].map((question, i) => (
                  <Chip
                    key={i}
                    label={question}
                    variant="outlined"
                    size="small"
                    onClick={() => setInputMessage(question)}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
              
              {/* 채팅 메시지 표시 영역 */}
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mb: 2,
                  height: '300px',
                  overflow: 'auto',
                  bgcolor: '#fafafa',
                  borderRadius: 1
                }}
              >
                {chatMessages.length === 0 ? (
                  <Box sx={{ textAlign: 'center', color: 'text.secondary', mt: 10 }}>
                    <Typography variant="body2">
                      질문을 입력하여 급여 데이터에 대한 AI 분석을 받아보세요.
                    </Typography>
                  </Box>
                ) : (
                  chatMessages.map((msg, index) => (
                    <Box
                      key={index}
                      sx={{
                        mb: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.5,
                          maxWidth: '80%',
                          bgcolor: msg.role === 'user' ? '#e3f2fd' : '#fff',
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: msg.role === 'user' ? '#bbdefb' : '#e0e0e0'
                        }}
                      >
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {msg.content}
                        </Typography>
                      </Paper>
                    </Box>
                  ))
                )}
                {isAiThinking && (
                  <Box sx={{ display: 'flex', ml: 1 }}>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      AI가 분석 중입니다...
                    </Typography>
                  </Box>
                )}
              </Paper>
              
              {/* 입력 컴포넌트 */}
              <AIMessageInput
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onSend={() => handleAIQuery(inputMessage)}
                placeholder="급여 데이터에 대해 질문하세요..."
                disabled={isAiThinking}
              />
            </StyledPaper>
          </Grid>
        </Grid>
        
        {/* 알림 스낵바 */}
        <Snackbar
          open={alert.open}
          autoHideDuration={6000}
          onClose={handleAlertClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleAlertClose} severity={alert.severity}>
            {alert.message}
          </Alert>
        </Snackbar>
      </Container>
    </ThemeProvider>
  );
};

export default PayrollAnalysis;