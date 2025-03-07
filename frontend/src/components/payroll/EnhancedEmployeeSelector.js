// components/payroll/EnhancedEmployeeSelector.js
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Divider, Chip, FormGroup, FormControlLabel, 
  Checkbox, InputAdornment, TextField, List, ListItem, ListItemText,
  Button, ButtonGroup, Accordion, AccordionSummary, AccordionDetails,
  Grid, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import PeopleIcon from '@mui/icons-material/People';
import CategoryIcon from '@mui/icons-material/Category';
import { StyledPaper } from '../../components/StyledComponents';

// 스타일 설정 - 항상 스크롤바 표시
const globalStyles = {
  '@global': {
    body: {
      overflowY: 'scroll', // 항상 스크롤바 표시
    }
  }
};

const EnhancedEmployeeSelector = ({ selectedEmployees, onSelectionChange, employees }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilters, setDepartmentFilters] = useState({});
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [expanded, setExpanded] = useState(false); // 기본적으로 직원 목록 접기
  const [selectionStats, setSelectionStats] = useState({
    total: 0,
    byDepartment: {}
  });
  const [selectAllFilteredEmployees, setSelectAllFilteredEmployees] = useState(false);

  // 부서 필터 초기화
  useEffect(() => {
    if (employees && employees.length) {
      const departments = {};
      employees.forEach(emp => {
        if (emp.department) {
          departments[emp.department] = false;
        }
      });
      setDepartmentFilters(departments);
    }
  }, [employees]);

  // 직원 필터링 - 수정됨
  useEffect(() => {
    if (!employees) return;
    
    let filtered = [...employees];
    
    // 검색어 필터링
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(emp => 
        emp.name.toLowerCase().includes(term) || 
        emp.employee_id.toLowerCase().includes(term)
      );
    }
    
    // 부서 필터링 - 단일 선택으로 변경
    if (selectedDepartment) {
      filtered = filtered.filter(emp => emp.department === selectedDepartment);
    }
    
    setFilteredEmployees(filtered);
    
    // 전체 선택 상태 업데이트
    updateSelectAllState(filtered, selectedEmployees);
  }, [employees, searchTerm, selectedDepartment, selectedEmployees]);

  // 전체 선택 상태 업데이트
  const updateSelectAllState = (filtered, selected) => {
    if (filtered.length === 0) {
      setSelectAllFilteredEmployees(false);
      return;
    }
    
    const allFilteredIds = filtered.map(emp => emp.employee_id);
    const allSelected = allFilteredIds.every(id => selected.includes(id));
    setSelectAllFilteredEmployees(allSelected);
  };

  // 선택된 직원 통계 계산
  useEffect(() => {
    if (!employees || !selectedEmployees) return;
    
    const byDepartment = {};
    const selectedEmployeeObjects = employees.filter(emp => 
      selectedEmployees.includes(emp.employee_id)
    );
    
    selectedEmployeeObjects.forEach(emp => {
      if (!byDepartment[emp.department]) {
        byDepartment[emp.department] = 0;
      }
      byDepartment[emp.department]++;
    });
    
    setSelectionStats({
      total: selectedEmployees.length,
      byDepartment
    });
  }, [employees, selectedEmployees]);

  // 체크박스 변경 핸들러
  const handleCheckboxChange = (employeeId) => {
    const newSelection = selectedEmployees.includes(employeeId)
      ? selectedEmployees.filter(id => id !== employeeId)
      : [...selectedEmployees, employeeId];
    
    onSelectionChange(newSelection);
  };

  // 부서 필터 변경 핸들러
  const handleDepartmentFilterChange = (department) => {
    setDepartmentFilters(prev => ({
      ...prev,
      [department]: !prev[department]
    }));
  };

  // 부서별 빠른 선택
  const handleDepartmentSelect = (department) => {
    const departmentEmployeeIds = employees
      .filter(emp => emp.department === department)
      .map(emp => emp.employee_id);
    
    const newSelection = [...new Set([...selectedEmployees, ...departmentEmployeeIds])];
    onSelectionChange(newSelection);
  };

  // 전체 선택/해제
  const handleSelectAll = (select) => {
    if (select) {
      const allIds = filteredEmployees.map(emp => emp.employee_id);
      onSelectionChange(allIds);
    } else {
      onSelectionChange([]);
    }
  };

  // 필터링된 직원 전체 선택/해제 핸들러
  const handleSelectAllFiltered = (event) => {
    const { checked } = event.target;
    setSelectAllFilteredEmployees(checked);
    
    if (checked) {
      // 현재 필터링된 직원 전체 선택
      const filteredIds = filteredEmployees.map(emp => emp.employee_id);
      const newSelection = [...new Set([...selectedEmployees, ...filteredIds])];
      onSelectionChange(newSelection);
    } else {
      // 현재 필터링된 직원 전체 해제
      const filteredIds = filteredEmployees.map(emp => emp.employee_id);
      const newSelection = selectedEmployees.filter(id => !filteredIds.includes(id));
      onSelectionChange(newSelection);
    }
  };

  // 아코디언 변경 핸들러
  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  // 부서 선택 핸들러
  const handleDepartmentChange = (event) => {
    setSelectedDepartment(event.target.value);
  };

  // 부서 목록 구하기
  const departments = employees ? 
    Array.from(new Set(employees.map(emp => emp.department))).filter(Boolean) : 
    [];

  return (
    <StyledPaper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>직원 선택</Typography>
      
      {/* 전체 선택/해제 버튼 */}
      <ButtonGroup variant="outlined" size="small" sx={{ mb: 2 }}>
        <Button onClick={() => handleSelectAll(true)}>전체 선택</Button>
        <Button onClick={() => handleSelectAll(false)}>전체 해제</Button>
      </ButtonGroup>
      
      {/* 검색 필드와 부서 필터를 나란히 배치 */}
      <Grid container spacing={2} sx={{ mb: 0.5 }}>
        {/* 검색 필드 */}
        <Grid item xs={6}>
          <TextField
            placeholder="이름 또는 사번으로 검색"
            fullWidth
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        
        {/* 부서 필터 - 드롭다운으로 변경 */}
        <Grid item xs={6}>
          <FormControl fullWidth size="small">
            <InputLabel id="department-select-label" shrink={true}>부서 선택</InputLabel>
            <Select
              labelId="department-select-label"
              value={selectedDepartment}
              onChange={handleDepartmentChange}
              label="부서 선택"
              displayEmpty
              renderValue={(selected) => {
                return selected ? selected : "전체 부서";
              }}
            >
              <MenuItem value="">전체 부서</MenuItem>
              {departments.map(dept => (
                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      
      {/* 직원 목록 아코디언 */}
      <Accordion 
        expanded={expanded === 'employeePanel'} 
        onChange={handleAccordionChange('employeePanel')}
        sx={{ mt: 0.5 }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{ 
            minHeight: '48px', 
            '& .MuiAccordionSummary-content': { margin: '12px 0' }
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 500, display: 'flex', alignItems: 'center' }}>
            <PeopleIcon fontSize="small" sx={{ mr: 1 }} />
            직원 목록 ({filteredEmployees.length}명)
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          {/* 전체 선택 체크박스 */}
          <Box sx={{ 
            p: 1, 
            borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
            backgroundColor: 'rgba(0, 0, 0, 0.03)'
          }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectAllFilteredEmployees}
                  onChange={handleSelectAllFiltered}
                  size="small"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  전체 선택
                </Typography>
              }
              sx={{ m: 0 }}
            />
          </Box>
          
          <Box sx={{ 
            height: '250px', 
            overflowY: 'auto',
            border: '1px solid rgba(0, 0, 0, 0.12)', 
            borderRadius: 1 
          }}>
            <List dense sx={{ p: 0 }}>
              {filteredEmployees.map(employee => (
                <ListItem 
                  key={employee.employee_id}
                  sx={{ 
                    borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' } 
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedEmployees.includes(employee.employee_id)}
                        onChange={() => handleCheckboxChange(employee.employee_id)}
                        size="small"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {employee.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {employee.employee_id} | {employee.department} | {employee.position}
                        </Typography>
                      </Box>
                    }
                    sx={{ width: '100%', m: 0 }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* 선택 정보 표시 */}
      <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(0, 0, 0, 0.03)', borderRadius: 1 }}>
        <Typography variant="subtitle2">
          {selectionStats.total}명 선택됨
        </Typography>
        
        {/* 부서별 선택 현황 */}
        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {Object.entries(selectionStats.byDepartment).map(([dept, count]) => (
            count > 0 && (
              <Chip 
                key={dept} 
                size="small" 
                label={`${dept}: ${count}명`} 
                variant="outlined"
              />
            )
          ))}
        </Box>
      </Box>
    </StyledPaper>
  );
};

export default EnhancedEmployeeSelector;