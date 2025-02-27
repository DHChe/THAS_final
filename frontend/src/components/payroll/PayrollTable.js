import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, IconButton, Tooltip } from '@mui/material';
import { Mail as MailIcon } from '@mui/icons-material';
import Chip from '@mui/material/Chip';

const PayrollTable = ({ calculationResults, employees }) => {
  if (!calculationResults || calculationResults.length === 0) return null;

  return (
    <TableContainer component={Paper} sx={{ background: 'rgba(183, 213, 242, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell align="center" sx={{ color: '#1C1B1BB2', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.1)', padding: '16px' }}>직원명</TableCell>
            <TableCell align="center" sx={{ color: '#1C1B1BB2', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.1)', padding: '16px' }}>부서</TableCell>
            <TableCell align="center" colSpan={4} sx={{ color: '#1C1B1BB2', fontWeight: 600, borderBottom: '2px solid #4d7cfe', background: 'rgba(77, 124, 254, 0.1)', padding: '16px' }}>지급항목(지급액 계:)</TableCell>
            <TableCell align="center" colSpan={5} sx={{ color: '#1C1B1BB2', fontWeight: 600, borderBottom: '2px solid #ff4d4d', background: 'rgba(255, 77, 77, 0.1)', padding: '16px' }}>공제항목(공제액 계:)</TableCell>
            <TableCell align="center" sx={{ color: '#1C1B1BB2', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.1)', padding: '16px' }}>차인지급액</TableCell>
            <TableCell align="center" sx={{ color: '#1C1B1BB2', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.1)', padding: '16px' }}>명세서</TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ color: '#fff' }}></TableCell>
            <TableCell sx={{ color: '#fff' }}></TableCell>
            <TableCell align="right" sx={{ color: 'rgba(77, 124, 254, 1.0)', fontWeight: 500, fontSize: '0.9rem', padding: '12px 16px', borderBottom: '1px solid rgba(77, 124, 254, 0.3)' }}>기본급</TableCell>
            <TableCell align="right" sx={{ color: 'rgba(77, 124, 254, 1.0)', fontWeight: 500, fontSize: '0.9rem', padding: '12px 16px', borderBottom: '1px solid rgba(77, 124, 254, 0.3)' }}>연장근로</TableCell>
            <TableCell align="right" sx={{ color: 'rgba(77, 124, 254, 1.0)', fontWeight: 500, fontSize: '0.9rem', padding: '12px 16px', borderBottom: '1px solid rgba(77, 124, 254, 0.3)' }}>야간근로</TableCell>
            <TableCell align="right" sx={{ color: 'rgba(77, 124, 254, 1.0)', fontWeight: 500, fontSize: '0.9rem', padding: '12px 16px', borderBottom: '1px solid rgba(77, 124, 254, 0.3)' }}>휴일근로</TableCell>
            <TableCell align="right" sx={{ color: 'rgba(255, 77, 77, 1)', fontWeight: 500, fontSize: '0.9rem', padding: '12px 16px', borderBottom: '1px solid rgba(255, 77, 77, 0.3)' }}>국민연금</TableCell>
            <TableCell align="right" sx={{ color: 'rgba(255, 77, 77, 1)', fontWeight: 500, fontSize: '0.9rem', padding: '12px 16px', borderBottom: '1px solid rgba(255, 77, 77, 0.3)' }}>건강보험</TableCell>
            <TableCell align="right" sx={{ color: 'rgba(255, 77, 77, 1)', fontWeight: 500, fontSize: '0.9rem', padding: '12px 16px', borderBottom: '1px solid rgba(255, 77, 77, 0.3)' }}>장기요양</TableCell>
            <TableCell align="right" sx={{ color: 'rgba(255, 77, 77, 1)', fontWeight: 500, fontSize: '0.9rem', padding: '12px 16px', borderBottom: '1px solid rgba(255, 77, 77, 0.3)' }}>고용보험</TableCell>
            <TableCell align="right" sx={{ color: 'rgba(255, 77, 77, 1)', fontWeight: 500, fontSize: '0.9rem', padding: '12px 16px', borderBottom: '1px solid rgba(255, 77, 77, 0.3)' }}>소득세</TableCell>
            <TableCell align="right" sx={{ color: '#fff' }}></TableCell>
            <TableCell align="center" sx={{ color: '#fff' }}></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {calculationResults.map((row) => (
            <TableRow key={row.employee_id} sx={{ '&:hover': { background: 'rgba(77, 124, 254, 0.1)' }, borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <TableCell sx={{ color: '#4d7cfe', padding: '16px', fontSize: '0.95rem' }}>
                {employees.find(emp => emp.employee_id === row.employee_id)?.name || '-'}
              </TableCell>
              <TableCell>
                <Chip
                  label={employees.find(emp => emp.employee_id === row.employee_id)?.department || '-'}
                  size="small"
                  sx={{ color: '#4d7cfe', background: 'rgba(77, 124, 254, 0.2)', borderRadius: '4px', fontSize: '0.85rem' }}
                />
              </TableCell>
              <TableCell align="right" sx={{ color: '#4d7cfe', padding: '16px', fontSize: '0.95rem' }}>{row.basePay?.toLocaleString() || '-'}원</TableCell>
              <TableCell align="right" sx={{ color: '#4d7cfe', padding: '16px', fontSize: '0.95rem' }}>{row.overtimePay?.toLocaleString() || '-'}원</TableCell>
              <TableCell align="right" sx={{ color: '#4d7cfe', padding: '16px', fontSize: '0.95rem' }}>{row.nightPay?.toLocaleString() || '-'}원</TableCell>
              <TableCell align="right" sx={{ color: '#4d7cfe', padding: '16px', fontSize: '0.95rem' }}>{row.holidayPay?.toLocaleString() || '-'}원</TableCell>
              <TableCell align="right" sx={{ color: '#ff4d4d' }}>{row.deductions?.nationalPension?.toLocaleString() || '-'}원</TableCell>
              <TableCell align="right" sx={{ color: '#ff4d4d' }}>{row.deductions?.healthInsurance?.toLocaleString() || '-'}원</TableCell>
              <TableCell align="right" sx={{ color: '#ff4d4d' }}>{row.deductions?.longTermCare?.toLocaleString() || '-'}원</TableCell>
              <TableCell align="right" sx={{ color: '#ff4d4d' }}>{row.deductions?.employmentInsurance?.toLocaleString() || '-'}원</TableCell>
              <TableCell align="right" sx={{ color: '#ff4d4d' }}>{row.taxes?.incomeTax?.toLocaleString() || '-'}원</TableCell>
              <TableCell align="right" sx={{ color: '#4d7cfe', fontWeight: 600, padding: '16px', fontSize: '0.95rem' }}>{row.netPay?.toLocaleString() || '-'}원</TableCell>
              <TableCell align="center">
                <Tooltip title="급여명세서 발송">
                  <IconButton size="small" sx={{ color: 'rgba(77, 124, 254, 1.0)', '&:hover': { color: '#4d7cfe', background: 'rgba(77, 124, 254, 0.1)' } }}>
                    <MailIcon />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default PayrollTable;