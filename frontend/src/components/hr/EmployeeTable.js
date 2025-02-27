import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Typography
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { searchEmployees } from '../../services/api';
import { format } from 'date-fns';

const EmployeeTable = ({ searchParams }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setLoading(true);
        const data = await searchEmployees(searchParams);
        setEmployees(data);
        setError(null);
      } catch (err) {
        setError('직원 데이터 로드 중 오류가 발생했습니다.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, [searchParams]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <Typography variant="h6" sx={{ p: 2 }}>
        직원 목록
      </Typography>
      <TableContainer>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>사번</TableCell>
              <TableCell>이름</TableCell>
              <TableCell>부서</TableCell>
              <TableCell>직급</TableCell>
              <TableCell>입사일</TableCell>
              <TableCell>상태</TableCell>
              <TableCell align="center">액션</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((employee) => (
                <TableRow hover key={employee.employee_id}>
                  <TableCell>{employee.employee_id}</TableCell>
                  <TableCell>{employee.name}</TableCell>
                  <TableCell>{employee.department}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>
                    {format(new Date(employee.join_date), 'yyyy-MM-dd')}
                  </TableCell>
                  <TableCell>
                    <span style={{
                      color: employee.status === '재직중' ? 'green' : 'red'
                    }}>
                      {employee.status}
                    </span>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="상세보기">
                      <IconButton size="small" color="primary">
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="수정">
                      <IconButton size="small" color="primary">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={employees.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="페이지당 행 수"
        labelDisplayedRows={({ from, to, count }) => 
          `${from}-${to} / 전체 ${count}`}
      />
    </Paper>
  );
};

export default EmployeeTable;