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
import { parseCSV } from '../../utils/csvParser';
import { filterPayrollData } from '../../utils/payrollFilters';
import dayjs from 'dayjs';
import { summarizeSearchResults, generateInitialAIMessage } from '../../utils/aiService';
import AIMessageInput from '../../components/chat/AIMessageInput';
import { debounce } from '../../utils/debounce';
import SearchInput from '../../components/search/SearchInput';
import { analyzeData } from '../../services/aiService';
import { VIEW_MODES, TABLE_COLUMNS, getActiveColumns, SALARY_TABS, BASE_COLUMNS } from '../../utils/tableConstants';
import { transformPayrollData } from '../../utils/payrollDataTransformer';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { PayrollEmbeddingProcessor } from '../../utils/embeddingProcessor';
import { VectorStoreManager } from '../../utils/vectorStoreManager';
import { performanceMonitor } from '../../utils/performanceMonitor';
import ProcessingProgress from '../../components/progress/ProcessingProgress';
import { PayrollRAGSystem } from '../../utils/ragSystem';
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

  // RAG 시스템 추가
  const [ragSystem, setRagSystem] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // 로딩 상태 관리를 위한 state 추가
  const [isLoading, setIsLoading] = useState(false);
  const [vectorStore, setVectorStore] = useState(null);
  const [processingState, setProcessingState] = useState({
    status: 'idle',
    progress: 0,
    message: ''
  });

  // 벡터 스토어 관련 상태 추가
  const [vectorStoreManager] = useState(new VectorStoreManager());
  const [embeddingProcessor, setEmbeddingProcessor] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);

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
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('데이터 로딩 시작');
        
        const employeesResponse = await fetch('/data/employees.csv');
        if (!employeesResponse.ok) {
          throw new Error(`직원 데이터 로딩 실패: ${employeesResponse.status}`);
        }
        const employeesText = await employeesResponse.text();
        console.log('직원 데이터 샘플:', employeesText.slice(0, 200));
        
        const payrollResponse = await fetch('/data/payroll.csv');
        if (!payrollResponse.ok) {
          throw new Error(`급여 데이터 로딩 실패: ${payrollResponse.status}`);
        }
        const payrollText = await payrollResponse.text();
        console.log('급여 데이터 샘플:', payrollText.slice(0, 200));

        const employees = await parseCSV('/data/employees.csv');
        const payroll = await parseCSV('/data/payroll.csv');
        
        console.log('파싱된 직원 데이터 샘플:', employees[0]);
        console.log('파싱된 급여 데이터 샘플:', payroll[0]);
        console.log('로드된 직원 수:', employees.length);
        console.log('로드된 급여 데이터 수:', payroll.length);
        
        setEmployeesData(employees);
        setPayrollData(payroll);

        if (payroll.length > 0) {
          const latestPayment = payroll.reduce((latest, current) => latest.payment_date > current.payment_date ? latest : current);
          const earliestPayment = payroll.reduce((earliest, current) => earliest.payment_date < current.payment_date ? earliest : current);

          const latestDate = dayjs(latestPayment.payment_date);
          const earliestDate = dayjs(earliestPayment.payment_date);
          
          setMaxDate(latestDate);
          setMinDate(earliestDate);
          
          setStartDate(latestDate);
          setEndDate(latestDate);
        }
      } catch (error) {
        console.error('데이터 로딩 상세 에러:', error);
      }
    };

    loadData();
  }, []);

  // 빠른 기간 선택 핸들러
  const handleQuickDateRange = (range, baseDate = endDate) => {
    if (!baseDate) return;
    
    setQuickDateRange(range);
    const end = baseDate;
    let start;

    switch (range) {
      case '3m':
        start = baseDate.subtract(3, 'month');
        break;
      case '6m':
        start = baseDate.subtract(6, 'month');
        break;
      case '1y':
        start = baseDate.subtract(1, 'year');
        break;
      default:
        return;
    }

    setStartDate(start);
    setEndDate(end);
  };

  // 검색 처리 함수
  const handleSearch = () => {
    if (!startDate || !endDate) {
      setAlert({
        open: true,
        message: '검색할 기간을 설정해주세요.',
        severity: 'warning'
      });
      return;
    }

    const searchTerm = searchQuery.trim();
    if (searchTerm.length === 1 && !searchTerm.match(/^\d+$/)) {
      setAlert({
        open: true,
        message: '이름 검색 시 2글자 이상 입력해주세요.',
        severity: 'warning'
      });
      return;
    }

    const hasNameOrId = searchTerm.length > 0;
    const hasDepartment = Object.values(departments).some(v => v);
    const hasPosition = Object.values(positions).some(v => v);

    if (!hasNameOrId && !hasDepartment && !hasPosition) {
      setAlert({
        open: true,
        message: '이름/사번, 부서, 직급 중 하나 이상을 선택해주세요.',
        severity: 'warning'
      });
      return;
    }

    if (hasNameOrId) {
      let matchedEmployees = employeesData.filter(emp => 
        emp.name.includes(searchTerm) || emp.employee_id.includes(searchTerm)
      );

      if (hasDepartment && !departments['전체']) {
        matchedEmployees = matchedEmployees.filter(emp => 
          departments[departmentMap[emp.department] || emp.department]
        );
      }

      if (hasPosition && !positions['전체']) {
        matchedEmployees = matchedEmployees.filter(emp => 
          positions[emp.position]
        );
      }

      if (matchedEmployees.length === 0) {
        setAlert({
          open: true,
          message: '검색 조건에 맞는 직원이 없습니다.',
          severity: 'warning'
        });
        return;
      }

      if (matchedEmployees.length > 1 && !searchTerm.match(/^\d+$/)) {
        setDuplicateEmployees(matchedEmployees);
        setOpenDialog(true);
        return;
      }

      if (matchedEmployees.length === 1) {
        performSearch(matchedEmployees[0]);
        return;
      }
    }

    performSearch();
  };

  const performSearch = (selectedEmployee = null) => {
    let filtered = payrollData.filter(payroll => {
      const employee = employeesData.find(emp => emp.employee_id === payroll.employee_id);
      if (!employee) return false;

      const paymentDate = payroll.payment_date.substring(0, 7);
      const start = startDate.format('YYYY-MM');
      const end = endDate.format('YYYY-MM');
      
      if (paymentDate < start || paymentDate > end) {
        return false;
      }

      if (selectedEmployee) {
        return employee.employee_id === selectedEmployee.employee_id;
      }

      const departmentMatch = !departments['전체'] ? 
        departments[departmentMap[employee.department] || employee.department] : true;
      const positionMatch = !positions['전체'] ? 
        positions[employee.position] : true;

      return departmentMatch && positionMatch;
    });

    filtered.sort((a, b) => b.payment_date.localeCompare(a.payment_date));
    
    setFilteredData(filtered);
    setPage(0);
  };

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    setOpenDialog(false);
    performSearch(employee);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setDuplicateEmployees([]);
  };

  const handleAllSearch = () => {
    const newAllSearchState = !allSearch;
    setAllSearch(newAllSearchState);
    
    const newDepartments = { ...departments };
    Object.keys(newDepartments).forEach(dept => {
      newDepartments[dept] = newAllSearchState;
    });
    setDepartments(newDepartments);
    
    const newPositions = { ...positions };
    Object.keys(newPositions).forEach(pos => {
      newPositions[pos] = newAllSearchState;
    });
    setPositions(newPositions);
  };

  useEffect(() => {
    const allDepartmentsSelected = Object.values(departments).every(v => v);
    const allPositionsSelected = Object.values(positions).every(v => v);
    setAllSearch(allDepartmentsSelected && allPositionsSelected);
  }, [departments, positions]);

  const handleAllDepartments = () => {
    const newDepartments = { ...departments };
    const allSelected = !departments['전체'];
    
    Object.keys(newDepartments).forEach(dept => {
      newDepartments[dept] = allSelected;
    });
    
    setDepartments(newDepartments);
  };

  const handleDepartmentChange = (dept) => {
    if (dept === '전체') {
      handleAllDepartments();
    } else {
      setDepartments(prev => {
        const newDepartments = {
          ...prev,
          [dept]: !prev[dept]
        };
        const allSelected = Object.entries(newDepartments)
          .filter(([key]) => key !== '전체')
          .every(([, value]) => value);
        
        return {
          ...newDepartments,
          '전체': allSelected
        };
      });
    }
  };

  const handleAllPositions = () => {
    const newPositions = { ...positions };
    const allSelected = !positions['전체'];
    
    Object.keys(newPositions).forEach(pos => {
      newPositions[pos] = allSelected;
    });
    
    setPositions(newPositions);
  };

  const handlePositionChange = (position) => {
    if (position === '전체') {
      handleAllPositions();
    } else {
      setPositions(prev => {
        const newPositions = {
          ...prev,
          [position]: !prev[position]
        };
        const allSelected = Object.entries(newPositions)
          .filter(([key]) => key !== '전체')
          .every(([, value]) => value);
        
        return {
          ...newPositions,
          '전체': allSelected
        };
      });
    }
  };

  const handleStartDateChange = (newValue) => {
    if (minDate && newValue.isBefore(minDate)) {
      setStartDate(minDate);
      setAlert({
        open: true,
        message: `${minDate.format('YYYY년 M월')} 이전의 데이터는 없습니다.`,
        severity: 'warning'
      });
      return;
    }

    setStartDate(newValue);
    if (endDate && newValue && newValue.isAfter(endDate)) {
      setEndDate(newValue);
    }
  };

  const handleEndDateChange = (newValue) => {
    if (maxDate && newValue.isAfter(maxDate)) {
      setEndDate(maxDate);
      setAlert({
        open: true,
        message: `${maxDate.format('YYYY년 M월')} 이후의 데이터는 없습니다.`,
        severity: 'warning'
      });
      return;
    }

    setEndDate(newValue);
    if (startDate && newValue && newValue.isBefore(startDate)) {
      setStartDate(newValue);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const handleAlertClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setAlert(prev => ({ ...prev, open: false }));
  };

  const handleReset = () => {
    setSearchQuery('');
    setDepartments({
      '전체': false,
      '개발': false,
      '영업': false,
      '총무': false,
      '재무': false,
      '생산': false
    });
    setPositions({
      '전체': false,
      '사원': false,
      '대리': false,
      '과장': false,
      '차장': false,
      '부장': false
    });
    setAdvancedFilters({
      joinDateRange: {
        start: null,
        end: null
      },
      tenureRange: [0, 10],
      showAdvanced: false
    });

    const currentDate = dayjs();
    setEndDate(currentDate);
    setStartDate(currentDate.subtract(3, 'month'));
    setQuickDateRange('3m');
    setExpandedAdvanced(false);
    setPage(0);
    setFilteredData([]);
  };

  const handleMessageInput = (value) => {
    setInputMessage(value);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    console.log('메시지 전송 시작:', inputMessage);
    
    const newUserMessage = {
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };
    
    setChatMessages(prev => [...prev, newUserMessage]);
    setInputMessage('');
    setIsAiThinking(true);

    try {
      console.log('AI 분석 요청:', {
        filteredDataLength: filteredData.length,
        employeesDataLength: employeesData.length,
        query: inputMessage
      });

      const response = await analyzeData(filteredData, employeesData, inputMessage);
      console.log('AI 응답 받음:', response);
      
      const aiMessage = {
        type: 'ai',
        content: response.analysis,
        timestamp: new Date().toISOString()
      };
      
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('메시지 처리 중 상세 오류:', error);
      setAlert({
        open: true,
        message: '분석 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'),
        severity: 'error'
      });
    } finally {
      setIsAiThinking(false);
    }
  };

  const getPaymentPeriodText = useCallback(() => {
    if (!startDate || !endDate) return '';
    if (startDate.format('YYYY-MM') === endDate.format('YYYY-MM')) {
      return startDate.format('YYYY-MM');
    }
    return `${startDate.format('YYYY-MM')} ~ ${endDate.format('YYYY-MM')}`;
  }, [startDate, endDate]);

  const getMonthlyColumns = useCallback(() => {
    if (!startDate || !endDate) return [];
    
    const months = [];
    let current = dayjs(startDate);
    const end = dayjs(endDate);
    
    while (current.isSameOrBefore(end, 'month')) {
      months.push({
        id: `${current.format('YYYY-MM')}`,
        label: `${current.format('YY년 M월')}`,
        numeric: true
      });
      current = current.add(1, 'month');
    }
    
    return months;
  }, [startDate, endDate]);

  const transformedData = useMemo(() => {
    if (!filteredData.length) return [];
    
    return filteredData.reduce((acc, row) => {
      const employee = employeesData.find(emp => emp.employee_id === row.employee_id);
      
      const existingRow = acc.find(item => item.employee_id === row.employee_id);
      const monthKey = row.payment_date.substring(0, 7);
      const amount = activeTab === 'total_salary'
        ? Number(row.base_salary) + Number(row.overtime_pay) + 
          Number(row.night_shift_pay) + Number(row.holiday_pay)
        : Number(row[activeTab]);

      if (existingRow) {
        existingRow[monthKey] = amount;
      } else {
        const newRow = {
          employee_id: row.employee_id,
          name: employee?.name || '',
          department: employee?.department || '',
          position: employee?.position || '',
          [monthKey]: amount
        };
        acc.push(newRow);
      }
      
      return acc;
    }, []);
  }, [filteredData, activeTab, employeesData]);

  const renderSalaryTabs = () => (
    <ButtonGroup 
      size="small" 
      sx={{ 
        mb: 2,
        '& .MuiButton-root': {
          color: theme.palette.text.primary,
          borderColor: 'rgba(0, 0, 0, 0.3)',
          fontSize: '0.75rem',
          py: 0.5,
          '&.Mui-selected': {
            backgroundColor: 'rgba(0, 123, 255, 0.2)',
          },
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
          }
        }
      }}
    >
      {Object.values(SALARY_TABS).map(tab => (
        <Button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          variant={activeTab === tab.id ? 'contained' : 'outlined'}
        >
          {tab.label}
        </Button>
      ))}
    </ButtonGroup>
  );

  const renderTableContent = () => {
    const monthlyColumns = getMonthlyColumns();
    const columns = [...BASE_COLUMNS, ...monthlyColumns];

    return (
      <>
        <TableHead>
          <TableRow>
            {columns.map(column => (
              <TableCell 
                key={column.id}
                align={column.numeric ? 'right' : 'center'}
                sx={{ 
                  color: theme.palette.text.primary,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
                }}
              >
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {transformedData
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map((row, index) => (
              <TableRow key={index}>
                {columns.map(column => (
                  <TableCell 
                    key={column.id}
                    align={column.numeric ? 'right' : 'center'}
                    sx={{ 
                      color: theme.palette.text.primary,
                      fontSize: '0.75rem',
                      borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    {column.numeric 
                      ? formatCurrency(row[column.id] || 0)
                      : row[column.id]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
        </TableBody>
      </>
    );
  };

  const renderMessage = (message) => (
    <Box
      sx={{
        p: 1,
        my: 1,
        backgroundColor: message.type === 'ai' ? 'rgba(0, 123, 255, 0.1)' : 'transparent',
        borderRadius: 1,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: theme.palette.text.primary,
          fontSize: '0.75rem',
          lineHeight: 1.5
        }}
      >
        {message.content}
      </Typography>
    </Box>
  );

  const initializeVectorStore = async (payrollData, employeesData, processor) => {
    try {
      setProcessingState({
        status: 'processing',
        progress: 0,
        message: '벡터 스토어 초기화 중...'
      });

      const manager = new VectorStoreManager();
      
      const { isValid, reason, metadata } = await manager.checkCacheValidity();
      
      if (isValid) {
        console.log('캐시된 벡터 스토어 사용', metadata);
        setProcessingState({
          status: 'processing',
          progress: 50,
          message: '캐시된 데이터 로드 중...'
        });
        
        const cachedStore = await manager.loadVectorStore(processor.embeddings);
        
        setProcessingState({
          status: 'completed',
          progress: 100,
          message: '캐시된 데이터 로드 완료'
        });
        
        return cachedStore;
      }

      console.log('새로운 벡터 스토어 생성 시작. 사유:', reason);
      setProcessingState({
        status: 'processing',
        progress: 0,
        message: '새로운 벡터 스토어 생성 중...'
      });

      const vectorStore = await processor.processPayrollData(payrollData, employeesData);
      
      await manager.saveVectorStore(vectorStore, {
        payrollData,
        employeesData
      });

      setProcessingState({
        status: 'completed',
        progress: 100,
        message: '벡터 스토어 생성 완료'
      });

      return vectorStore;

    } catch (error) {
      console.error('벡터 스토어 초기화 실패:', error);
      setProcessingState({
        status: 'error',
        progress: 0,
        message: '초기화 중 오류 발생'
      });
      throw error;
    }
  };

  const initialize = async () => {
    if (isInitializing) return;
    
    try {
      setIsInitializing(true);
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error('OpenAI API 키가 설정되지 않았습니다.');
      }

      const processor = new PayrollEmbeddingProcessor(apiKey);
      setEmbeddingProcessor(processor);

      if (payrollData.length > 0 && employeesData.length > 0) {
        console.log('벡터 스토어 초기화 시작');
        const vectorStore = await initializeVectorStore(
          payrollData, 
          employeesData, 
          processor
        );
        setVectorStore(vectorStore);
      }

      const rag = new PayrollRAGSystem(apiKey);
      setRagSystem(rag);

    } catch (error) {
      console.error('초기화 실패:', error);
      setAlert({
        open: true,
        message: '시스템 초기화 중 오류가 발생했습니다: ' + error.message,
        severity: 'error'
      });
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (payrollData.length > 0 && employeesData.length > 0 && !isInitializing) {
      initialize();
    }
  }, [payrollData, employeesData]);

  const handleAIQuery = async (query) => {
    console.group('AI 쿼리 처리 로그');
    console.log('사용자 쿼리:', query);
    
    try {
      const contextualPrompt = contextManager.generateContextualPrompt(query);
      console.log('생성된 프롬프트:', contextualPrompt);
      
      const result = await ragSystem.processQuery(query, vectorStore, contextualPrompt);
      console.log('AI 응답:', result);
      
      contextManager.addConversation({
        type: 'user',
        content: query
      });
      
      contextManager.addConversation({
        type: 'ai',
        content: result.response
      });
      
      console.log('현재 대화 기록:', contextManager.conversationHistory);
    } catch (error) {
      console.error('AI 쿼리 처리 오류:', error);
    }
    
    console.groupEnd();
  };

  const AnalysisResult = ({ result }) => {
    if (!result) return null;

    return (
      <Box sx={{ mt: 2, p: 2, bgcolor: theme.palette.background.paper, borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom sx={{ color: theme.palette.text.primary }}>
          분석 결과
        </Typography>
        <Typography variant="body1" sx={{ whiteSpace: 'pre-line', color: theme.palette.text.primary }}>
          {result.response}
        </Typography>
        {result.sources && result.sources.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color={theme.palette.text.secondary}>
              참조 데이터:
            </Typography>
            <List dense>
              {result.sources.map((source, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={`${source.department} - ${source.position}`}
                    secondary={`데이터 기준일: ${source.payment_date}`}
                    sx={{
                      '& .MuiListItemText-primary': { color: theme.palette.text.primary },
                      '& .MuiListItemText-secondary': { color: theme.palette.text.secondary },
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Box>
    );
  };

  useEffect(() => {
    checkLangSmithSetup();
  }, []);

  const [contextManager] = useState(new ContextManager());

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && employeesData && payrollData) {
      import('../../utils/testRAG').then(module => {
        const testResult = module.testRAGPreprocessing(payrollData, employeesData);
        console.log('RAG 시스템 테스트 결과:', testResult ? '성공' : '실패');
      });
    }
  }, [employeesData, payrollData]);

  return (
    <ThemeProvider theme={theme}>
      <Box sx={commonStyles.pageContainer}>
        <GlobalTabs /> {/* GlobalNavigation을 GlobalTabs로 변경 */}
        <Container maxWidth={false} sx={{ mt: 4, mb: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 3,
                gap: 1
              }}>
                <Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                  검색
                </Typography>
                <Box sx={{ 
                  height: '24px', 
                  width: '1px', 
                  bgcolor: 'rgba(0,0,0,0.2)', 
                  mx: 2 
                }} />
                <Typography variant="body2" sx={{ 
                  color: theme.palette.text.secondary,
                  fontWeight: 500
                }}>
                  급여 데이터 검색 및 필터링
                </Typography>
              </Box>

              <StyledPaper sx={{ 
                p: 2,
                mb: 3,
              }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <Typography variant="subtitle2" sx={{ color: theme.palette.text.primary, mb: 0.5, fontWeight: 500 }}>
                      시작월
                    </Typography>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DatePicker
                        value={startDate}
                        onChange={handleStartDateChange}
                        minDate={minDate}
                        maxDate={endDate}
                        views={['year', 'month']}
                        sx={datePickerStyle}
                      />
                    </LocalizationProvider>
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <Typography variant="subtitle2" sx={{ color: theme.palette.text.primary, mb: 0.5, fontWeight: 500 }}>
                      종료월
                    </Typography>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DatePicker
                        value={endDate}
                        onChange={handleEndDateChange}
                        minDate={startDate}
                        maxDate={maxDate}
                        views={['year', 'month']}
                        sx={datePickerStyle}
                      />
                    </LocalizationProvider>
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <Typography variant="subtitle2" sx={{ color: theme.palette.text.primary, mb: 0.5, fontWeight: 500 }}>
                      이름 또는 사번
                    </Typography>
                    <SearchInput onSearchChange={handleSearchQueryChange} />
                  </Grid>

                  <Grid item xs={12} md={3} sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                    <StyledButton
                      variant="contained"
                      onClick={handleSearch}
                      sx={{
                        flex: 1,
                        height: '40px',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                      }}
                    >
                      검색
                    </StyledButton>
                    <StyledButton
                      variant="contained"
                      onClick={handleReset}
                      sx={{
                        flex: 1,
                        height: '40px',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                      }}
                    >
                      초기화
                    </StyledButton>
                  </Grid>

                  <Grid item xs={12}>
                    <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                        <FormControlLabel
                          control={
                            <Checkbox 
                              checked={allSearch}
                              onChange={handleAllSearch}
                              size="small"
                              sx={{
                                color: theme.palette.text.secondary,
                                '&.Mui-checked': { color: theme.palette.primary.main },
                              }}
                            />
                          }
                          label={<Typography sx={{ color: theme.palette.text.primary, fontWeight: 500, fontSize: '0.75rem' }}>전체 검색</Typography>}
                        />
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ color: theme.palette.text.primary, mb: 0.5, fontWeight: 500, fontSize: '0.75rem' }}>
                          부서
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 0.5 }}>
                          {Object.keys(departments).map((dept) => (
                            <Chip
                              key={dept}
                              label={dept}
                              onClick={() => handleDepartmentChange(dept)}
                              size="small"
                              sx={{
                                height: '24px',
                                fontSize: '0.75rem',
                                backgroundColor: departments[dept] ? theme.palette.primary.main : 'rgba(0, 0, 0, 0.15)',
                                color: theme.palette.text.primary,
                                '&:hover': {
                                  backgroundColor: departments[dept] ? theme.palette.primary.main : 'rgba(0, 0, 0, 0.25)',
                                },
                                '& .MuiChip-label': {
                                  padding: '0 8px',
                                },
                              }}
                            />
                          ))}
                        </Box>
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ color: theme.palette.text.primary, mb: 0.5, fontWeight: 500, fontSize: '0.75rem' }}>
                          직급
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 0.5 }}>
                          {Object.keys(positions).map((position) => (
                            <Chip
                              key={position}
                              label={position}
                              onClick={() => handlePositionChange(position)}
                              size="small"
                              sx={{
                                height: '24px',
                                fontSize: '0.75rem',
                                backgroundColor: positions[position] ? theme.palette.primary.main : 'rgba(0, 0, 0, 0.15)',
                                color: theme.palette.text.primary,
                                '&:hover': {
                                  backgroundColor: positions[position] ? theme.palette.primary.main : 'rgba(0, 0, 0, 0.25)',
                                },
                                '& .MuiChip-label': {
                                  padding: '0 8px',
                                },
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    </Stack>
                  </Grid>

                  <Grid item xs={12}>
                    <Accordion 
                      expanded={expandedAdvanced}
                      onChange={(e, isExpanded) => setExpandedAdvanced(isExpanded)}
                      sx={{ 
                        background: 'rgba(0, 0, 0, 0.1)',
                        color: theme.palette.text.primary,
                        '&.Mui-expanded': {
                          background: 'rgba(0, 0, 0, 0.15)',
                        },
                      }}
                    >
                      <AccordionSummary 
                        expandIcon={<ExpandMoreIcon sx={{ color: theme.palette.text.primary }} />}
                        sx={{
                          minHeight: '40px',
                          '& .MuiAccordionSummary-content': {
                            margin: '8px 0',
                          },
                          '&:hover': {
                            background: 'rgba(0, 0, 0, 0.05)',
                          },
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 500, fontSize: '0.875rem', color: theme.palette.text.primary }}>
                          고급 검색 필터
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="subtitle2" gutterBottom sx={{ color: theme.palette.text.primary, fontWeight: 500, fontSize: '0.875rem' }}>
                          인력 특성
                        </Typography>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                          <DatePicker
                            label="입사일자 시작"
                            value={advancedFilters.joinDateRange.start}
                            onChange={(newValue) => setAdvancedFilters(prev => ({
                              ...prev,
                              joinDateRange: { ...prev.joinDateRange, start: newValue }
                            }))}
                            views={['year', 'month']}
                            sx={{
                              mb: 1,
                              width: '100%',
                              '& .MuiInputBase-root': {
                                height: '40px',
                                fontSize: '0.875rem',
                                color: theme.palette.text.primary,
                              },
                              '& .MuiInputLabel-root': { 
                                fontSize: '0.875rem',
                                color: theme.palette.text.secondary,
                              },
                            }}
                          />
                          <DatePicker
                            label="입사일자 종료"
                            value={advancedFilters.joinDateRange.end}
                            onChange={(newValue) => setAdvancedFilters(prev => ({
                              ...prev,
                              joinDateRange: { ...prev.joinDateRange, end: newValue }
                            }))}
                            views={['year', 'month']}
                            sx={{
                              mb: 2,
                              width: '100%',
                              '& .MuiInputBase-root': {
                                height: '40px',
                                fontSize: '0.875rem',
                                color: theme.palette.text.primary,
                              },
                              '& .MuiInputLabel-root': { 
                                fontSize: '0.875rem',
                                color: theme.palette.text.secondary,
                              },
                            }}
                          />
                        </LocalizationProvider>

                        <Typography gutterBottom sx={{ color: theme.palette.text.primary, fontWeight: 500, fontSize: '0.875rem' }}>
                          근속연수 범위
                        </Typography>
                        <Slider
                          value={advancedFilters.tenureRange}
                          onChange={(e, newValue) => setAdvancedFilters(prev => ({
                            ...prev,
                            tenureRange: newValue
                          }))}
                          valueLabelDisplay="auto"
                          min={0}
                          max={30}
                          sx={{
                            color: theme.palette.primary.main,
                            mb: 2,
                            '& .MuiSlider-valueLabel': {
                              fontSize: '0.75rem',
                              color: theme.palette.text.primary,
                              backgroundColor: theme.palette.primary.main,
                            },
                          }}
                        />

                        <FormGroup>
                          <FormControlLabel
                            disabled
                            control={<Checkbox size="small" />}
                            label={<Typography sx={{ color: theme.palette.text.secondary, fontSize: '0.875rem' }}>평가등급</Typography>}
                          />
                          <FormControlLabel
                            disabled
                            control={<Checkbox size="small" />}
                            label={<Typography sx={{ color: theme.palette.text.secondary, fontSize: '0.875rem' }}>인센티브 지급 여부</Typography>}
                          />
                          <FormControlLabel
                            disabled
                            control={<Checkbox size="small" />}
                            label={<Typography sx={{ color: theme.palette.text.secondary, fontSize: '0.875rem' }}>승진 이력</Typography>}
                          />
                        </FormGroup>

                        <Typography variant="subtitle2" gutterBottom sx={{ color: theme.palette.text.primary, fontWeight: 500, fontSize: '0.875rem', mt: 2 }}>
                          비용 분석 (준비중)
                        </Typography>
                        <FormGroup>
                          <FormControlLabel
                            disabled
                            control={<Checkbox size="small" />}
                            label={<Typography sx={{ color: theme.palette.text.secondary, fontSize: '0.875rem' }}>프로젝트별 인건비</Typography>}
                          />
                          <FormControlLabel
                            disabled
                            control={<Checkbox size="small" />}
                            label={<Typography sx={{ color: theme.palette.text.secondary, fontSize: '0.875rem' }}>부서별 예산 대비 실적</Typography>}
                          />
                          <FormControlLabel
                            disabled
                            control={<Checkbox size="small" />}
                            label={<Typography sx={{ color: theme.palette.text.secondary, fontSize: '0.875rem' }}>전년 동기 대비 증감률</Typography>}
                          />
                        </FormGroup>
                      </AccordionDetails>
                    </Accordion>
                  </Grid>
                </Grid>
                </StyledPaper>

                <StyledPaper sx={{ 
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: 2,
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  overflow: 'hidden',
                  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
                  height: 'calc(100vh - 440px)',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  {renderSalaryTabs()}
                  <TableContainer sx={{ 
                    flex: 1, 
                    overflowY: 'auto',
                    '&::-webkit-scrollbar': {
                      width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: 'rgba(0, 0, 0, 0.1)',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: 'rgba(0, 0, 0, 0.1)',
                      borderRadius: '4px',
                      '&:hover': {
                        background: 'rgba(0, 0, 0, 0.2)',
                      }
                    }
                  }}>
                    <Table size="small" sx={{
                      '& .MuiTableCell-head': {
                        background: 'rgba(0, 0, 0, 0.03)',
                        borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                      },
                      '& .MuiTableCell-body': {
                        borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                      },
                      '& .MuiTableRow-root:hover': {
                        background: 'rgba(0, 0, 0, 0.03)',
                      }
                    }}>
                      {renderTableContent()}
                    </Table>
                  </TableContainer>
                  <TablePagination
                    component="div"
                    count={transformedData.length}
                    page={page}
                    onPageChange={(event, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[20]}
                    sx={{
                      color: theme.palette.text.secondary,
                      borderTop: '1px solid rgba(0, 0, 0, 0.1)',
                      '.MuiTablePagination-select': {
                        background: 'rgba(0, 0, 0, 0.2)',
                      },
                      '.MuiTablePagination-actions button': {
                        color: theme.palette.text.secondary,
                      }
                    }}
                  />
                </StyledPaper>
              </Grid>

              <Grid item xs={12} md={5}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 3,
                  gap: 1
                }}>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                    AI 분석
                  </Typography>
                  <Box sx={{ 
                    height: '24px', 
                    width: '1px', 
                    bgcolor: 'rgba(0,0,0,0.2)', 
                    mx: 2 
                  }} />
                  <Typography variant="body2" sx={{ 
                    color: theme.palette.text.secondary,
                    fontWeight: 500
                  }}>
                    실시간 급여 데이터 분석 및 인사이트
                  </Typography>
                </Box>

                <StyledPaper sx={{ 
                  height: 'calc(100vh - 190px)',
                  p: 2.5,
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: 2,
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  <Box sx={{ 
                    flex: 1, 
                    overflowY: 'auto',
                    mb: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    p: 2
                  }}>
                    {chatMessages.map((message, index) => (
                      <Box
                        key={index}
                        sx={{
                          alignSelf: message.type === 'user' ? 'flex-end' : 'flex-start',
                          maxWidth: '80%',
                          backgroundColor: message.type === 'user' 
                            ? 'rgba(0, 123, 255, 0.1)' 
                            : 'rgba(0, 0, 0, 0.05)',
                          borderRadius: 2,
                          p: 2,
                        }}
                      >
                        {renderMessage(message)}
                      </Box>
                    ))}
                    {isAiThinking && (
                      <Box sx={{ alignSelf: 'flex-start', color: theme.palette.text.secondary }}>
                        <Typography variant="body2">AI가 분석중입니다...</Typography>
                      </Box>
                    )}
                  </Box>

                  <AIMessageInput
                    inputMessage={inputMessage}
                    onInputChange={handleMessageInput}
                    onSendMessage={handleSendMessage}
                    isAiThinking={isAiThinking}
                  />
                </StyledPaper>
              </Grid>
            </Grid>
          </Container>

          <Snackbar 
            open={alert.open} 
            autoHideDuration={3000} 
            onClose={handleAlertClose}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <Alert 
              onClose={handleAlertClose} 
              severity={alert.severity}
              sx={{ 
                width: '100%',
                backgroundColor: alert.severity === 'warning' ? 'rgba(237, 108, 2, 0.9)' : undefined,
                color: theme.palette.text.primary,
                '& .MuiAlert-icon': {
                  color: theme.palette.text.primary
                }
              }}
            >
              {alert.message}
            </Alert>
          </Snackbar>
          {processingState.status === 'processing' && (
            <ProcessingProgress {...processingState} />
          )}

          {isAnalyzing && (
            <Box sx={{ 
              position: 'fixed', 
              bottom: 20, 
              right: 20, 
              zIndex: 1000 
            }}>
              <CircularProgress size={24} sx={{ color: theme.palette.text.primary }} />
              <Typography variant="caption" sx={{ ml: 1, color: theme.palette.text.primary }}>
                데이터 분석 중...
              </Typography>
            </Box>
          )}

          <AnalysisResult result={analysisResult} />

          <Dialog 
            open={openDialog} 
            onClose={handleCloseDialog}
            PaperProps={{
              sx: {
                background: theme.palette.background.paper,
                color: theme.palette.text.primary,
                minWidth: '300px',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '8px'
              }
            }}
          >
            <DialogTitle sx={{ 
              borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
              fontSize: '1rem',
              fontWeight: 600,
              color: theme.palette.text.primary
            }}>
              검색된 직원 선택
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
              <List sx={{ pt: 0 }}>
                {duplicateEmployees.map((employee) => (
                  <ListItem 
                    button 
                    onClick={() => handleEmployeeSelect(employee)}
                    key={employee.employee_id}
                    sx={{
                      borderRadius: '4px',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.1)'
                      }
                    }}
                  >
                    <ListItemText
                      primary={employee.name}
                      secondary={`${employee.department} / ${employee.position}`}
                      sx={{
                        '& .MuiListItemText-primary': {
                          color: theme.palette.text.primary
                        },
                        '& .MuiListItemText-secondary': {
                          color: theme.palette.text.secondary
                        }
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </DialogContent>
            <DialogActions sx={{ borderTop: '1px solid rgba(0, 0, 0, 0.1)' }}>
              <StyledButton
                onClick={handleCloseDialog}
                sx={{ 
                  color: theme.palette.text.primary,
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.1)'
                  }
                }}
              >
                취소
              </StyledButton>
            </DialogActions>
          </Dialog>
        </Box>
      </ThemeProvider>
    );
};

export default PayrollAnalysis;