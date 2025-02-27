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
  }, [employees, searchTerm, selectedDepartment]);

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
      
      {/* 선택 요약 정보 - 부서별 세부내용 제거됨 */}
      <Box sx={{ mt: 0.5, p: 1, bgcolor: 'rgba(0, 0, 0, 0.05)', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          선택된 직원: {selectionStats.total}명
        </Typography>
      </Box>
      
      {/* 빠른 선택 옵션
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>부서별 빠른 선택</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {Array.from(new Set(employees.map(emp => emp.department))).map(dept => (
            <Chip
              key={dept}
              label={dept}
              onClick={() => handleDepartmentSelect(dept)}
              variant="outlined"
              size="small"
              sx={{ 
                fontSize: '0.75rem',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.08)' }
              }}
            />
          ))}
        </Box>
      </Box> */}
    </StyledPaper>
  );
};

export default EnhancedEmployeeSelector;