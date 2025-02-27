import React, { useState, useMemo } from 'react';
import {
  Typography,
  FormControl,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Box,
  Chip,
  CircularProgress,
  FormGroup,
  FormControlLabel,
} from '@mui/material';
import { useEmployees } from '../../context/EmployeeContext';
import { StyledPaper } from '../../components/StyledComponents'; // StyledPaper 임포트 추가

const EmployeeSelector = ({ selectedEmployees, onSelectionChange }) => {
  const { employees, loading, error } = useEmployees();
  const [selectedDepartments, setSelectedDepartments] = useState([]);

  // 부서 목록 추출
  const departments = useMemo(() => {
    const depts = [...new Set(employees.map(emp => emp.department))].sort();
    return depts;
  }, [employees]);

  // 선택된 부서에 속한 직원만 필터링
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp =>
      selectedDepartments.length === 0 || selectedDepartments.includes(emp.department)
    );
  }, [employees, selectedDepartments]);

  const handleDepartmentChange = (dept) => {
    setSelectedDepartments(prev => {
      if (prev.includes(dept)) {
        return prev.filter(d => d !== dept);
      }
      return [...prev, dept];
    });
  };

  const handleSelectAll = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredEmployees.map(emp => emp.employee_id));
    }
  };

  const handleChange = (event) => {
    const { value } = event.target;
    onSelectionChange(typeof value === 'string' ? value.split(',') : value);
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
      <CircularProgress />
    </Box>
  );

  if (error) return (
    <Typography color="error" sx={{ p: 3 }}>
      {error}
    </Typography>
  );

  if (!employees || employees.length === 0) return (
    <Typography sx={{ p: 3 }}>
      직원 데이터가 없습니다. 백엔드를 확인하세요.
    </Typography>
  );

  return (
    <StyledPaper> {/* Paper를 StyledPaper로 교체 */}
      <Typography variant="h6" gutterBottom>
        직원 선택 ({filteredEmployees.length}명)
      </Typography>

      <FormGroup row sx={{ mb: 2, gap: 3 }}>
        {departments.map((dept) => (
          <FormControlLabel
            key={dept}
            control={
              <Checkbox
                checked={selectedDepartments.includes(dept)}
                onChange={() => handleDepartmentChange(dept)}
              />
            }
            label={dept}
          />
        ))}
      </FormGroup>

      <FormControl fullWidth>
        <Select
          multiple
          value={selectedEmployees}
          onChange={handleChange}
          input={<OutlinedInput />}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((employeeId) => {
                const employee = filteredEmployees.find(emp => emp.employee_id === employeeId);
                return (
                  <Chip
                    key={employeeId}
                    label={`${employee?.name} (${employee?.department} ${employee?.position})`}
                  />
                );
              })}
            </Box>
          )}
          MenuProps={{
            PaperProps: {
              sx: {
                maxHeight: 300,
              },
            },
          }}
        >
          <MenuItem
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 1,
            }}
          >
            <Box sx={{
              width: '100%',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              py: 1,
            }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                    indeterminate={selectedEmployees.length > 0 && selectedEmployees.length < filteredEmployees.length}
                    onChange={handleSelectAll}
                  />
                }
                label="전체 선택"
              />
            </Box>
          </MenuItem>

          {filteredEmployees.map((employee) => (
            <MenuItem
              key={employee.employee_id}
              value={employee.employee_id}
            >
              <Checkbox
                checked={selectedEmployees.indexOf(employee.employee_id) > -1}
              />
              <ListItemText
                primary={`${employee.name} (${employee.employee_id})`}
                secondary={`${employee.department} ${employee.position}`}
              />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </StyledPaper>
  );
};

export default EmployeeSelector;