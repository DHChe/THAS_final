import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, IconButton, Tooltip, Box } from '@mui/material';
import { Mail as MailIcon, CheckCircle as CheckCircleIcon, LocalAtm as PaidIcon } from '@mui/icons-material';
import Chip from '@mui/material/Chip';

const PayrollTable = ({ calculationResults, employees, confirmedPayrolls = [] }) => {
  if (!calculationResults || calculationResults.length === 0) return null;

  // 확정된 급여인지 확인하는 함수
  const isConfirmed = (employeeId) => {
    return confirmedPayrolls.some(payroll => payroll.employee_id === employeeId);
  };

  // 상태 표시 컴포넌트
  const StatusChip = ({ status }) => {
    // 백엔드에서 받은 status 정보를 우선 사용
    if (status === 'confirmed') {
      return (
        <Chip
          icon={<CheckCircleIcon style={{ fontSize: 16 }} />}
          label="확정됨"
          size="small"
          color="success"
          variant="outlined"
          sx={{ padding: '4px', fontSize: '0.8rem' }}
        />
      );
    } else if (status === 'paid') {
      return (
        <Chip
          icon={<PaidIcon style={{ fontSize: 16 }} />}
          label="지급완료"
          size="small"
          color="primary"
          variant="outlined"
          sx={{ padding: '4px', fontSize: '0.8rem' }}
        />
      );
    } else {
      // confirmedPayrolls 배열에서도 확인 (두 번째 확인 방법)
      const confirmed = isConfirmed(row.employee_id);
      if (confirmed) {
        return (
          <Chip
            icon={<CheckCircleIcon style={{ fontSize: 16 }} />}
            label="확정됨"
            size="small"
            color="success"
            variant="outlined"
            sx={{ padding: '4px', fontSize: '0.8rem' }}
          />
        );
      } else {
        return (
          <Chip
            label="미확정"
            size="small"
            color="default"
            variant="outlined"
            sx={{ padding: '4px', fontSize: '0.8rem' }}
          />
        );
      }
    }
  };

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
            <TableCell align="center" sx={{ color: '#1C1B1BB2', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.1)', padding: '16px' }}>상태</TableCell>
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
          {calculationResults.map((row) => {
            // 행의 배경색 결정
            let bgColor = 'inherit';
            if (row.status === 'confirmed') {
              bgColor = 'rgba(76, 175, 80, 0.05)';
            } else if (row.status === 'paid') {
              bgColor = 'rgba(33, 150, 243, 0.05)';
            } else if (isConfirmed(row.employee_id)) {
              bgColor = 'rgba(76, 175, 80, 0.05)';
            }
            
            return (
              <TableRow 
                key={row.employee_id} 
                sx={{ 
                  '&:hover': { background: 'rgba(77, 124, 254, 0.1)' },
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  backgroundColor: bgColor
                }}
              >
                <TableCell sx={{ color: '#4d7cfe', padding: '16px', fontSize: '0.95rem' }}>
                  {employees.find(emp => emp.employee_id === row.employee_id)?.name || row.employee_name || '-'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={employees.find(emp => emp.employee_id === row.employee_id)?.department || row.department || '-'}
                    size="small"
                    sx={{ color: '#4d7cfe', background: 'rgba(77, 124, 254, 0.2)', borderRadius: '4px', fontSize: '0.85rem' }}
                  />
                </TableCell>
                <TableCell align="right" sx={{ color: '#4d7cfe', padding: '16px', fontSize: '0.95rem' }}>{row.base_pay?.toLocaleString() || row.basePay?.toLocaleString() || '-'}원</TableCell>
                <TableCell align="right" sx={{ color: '#4d7cfe', padding: '16px', fontSize: '0.95rem' }}>{row.overtime_pay?.toLocaleString() || row.overtimePay?.toLocaleString() || '-'}원</TableCell>
                <TableCell align="right" sx={{ color: '#4d7cfe', padding: '16px', fontSize: '0.95rem' }}>{row.night_shift_pay?.toLocaleString() || row.nightPay?.toLocaleString() || '-'}원</TableCell>
                <TableCell align="right" sx={{ color: '#4d7cfe', padding: '16px', fontSize: '0.95rem' }}>{row.holiday_pay?.toLocaleString() || row.holidayPay?.toLocaleString() || '-'}원</TableCell>
                <TableCell align="right" sx={{ color: '#ff4d4d' }}>{row.national_pension?.toLocaleString() || (row.deductions?.nationalPension?.toLocaleString()) || '-'}원</TableCell>
                <TableCell align="right" sx={{ color: '#ff4d4d' }}>{row.health_insurance?.toLocaleString() || (row.deductions?.healthInsurance?.toLocaleString()) || '-'}원</TableCell>
                <TableCell align="right" sx={{ color: '#ff4d4d' }}>{row.long_term_care?.toLocaleString() || (row.deductions?.longTermCare?.toLocaleString()) || '-'}원</TableCell>
                <TableCell align="right" sx={{ color: '#ff4d4d' }}>{row.employment_insurance?.toLocaleString() || (row.deductions?.employmentInsurance?.toLocaleString()) || '-'}원</TableCell>
                <TableCell align="right" sx={{ color: '#ff4d4d' }}>{row.income_tax?.toLocaleString() || (row.taxes?.incomeTax?.toLocaleString()) || '-'}원</TableCell>
                <TableCell align="right" sx={{ color: '#4d7cfe', fontWeight: 600, padding: '16px', fontSize: '0.95rem' }}>{row.net_pay?.toLocaleString() || row.netPay?.toLocaleString() || '-'}원</TableCell>
                <TableCell align="center">
                  {row.status === 'confirmed' ? (
                    <Chip
                      icon={<CheckCircleIcon style={{ fontSize: 16 }} />}
                      label="확정됨"
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ padding: '4px', fontSize: '0.8rem' }}
                    />
                  ) : row.status === 'paid' ? (
                    <Chip
                      icon={<PaidIcon style={{ fontSize: 16 }} />}
                      label="지급완료"
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ padding: '4px', fontSize: '0.8rem' }}
                    />
                  ) : isConfirmed(row.employee_id) ? (
                    <Chip
                      icon={<CheckCircleIcon style={{ fontSize: 16 }} />}
                      label="확정됨"
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ padding: '4px', fontSize: '0.8rem' }}
                    />
                  ) : (
                    <Chip
                      label="미확정"
                      size="small"
                      color="default"
                      variant="outlined"
                      sx={{ padding: '4px', fontSize: '0.8rem' }}
                    />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default PayrollTable;