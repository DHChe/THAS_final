import React from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, Button, IconButton, Tooltip, Box, Skeleton, Alert
} from '@mui/material';
import { 
  Mail as MailIcon, 
  CheckCircle as CheckCircleIcon, 
  LocalAtm as PaidIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import Chip from '@mui/material/Chip';
import { useTheme } from '@mui/material/styles';

const PayrollTable = ({ calculationResults, employees, confirmedPayrolls = [] }) => {
  const theme = useTheme();
  
  if (!calculationResults || calculationResults.length === 0) return null;

  // 확정된 급여인지 확인하는 함수
  const isConfirmed = (employeeId) => {
    return confirmedPayrolls.some(payroll => payroll.employee_id === employeeId);
  };

  // 상태 표시 컴포넌트
  const StatusChip = ({ status, employee_id, isLoading, hasError }) => {
    // 로딩 중인 경우
    if (isLoading) {
      return (
        <Skeleton variant="rounded" width={80} height={24} animation="wave" />
      );
    }
    
    // 오류가 발생한 경우
    if (hasError) {
      return (
        <Chip
          icon={<ErrorIcon style={{ fontSize: 16 }} />}
          label="오류"
          size="small"
          sx={{ 
            padding: '4px', 
            fontSize: '0.8rem',
            fontWeight: 700,
            backgroundColor: 'rgba(211, 47, 47, 0.1)',
            color: theme.palette.error.dark,
            border: `1px solid ${theme.palette.error.main}`
          }}
        />
      );
    }
    
    // status 값 디버깅
    console.log(`상태 표시: ${employee_id}, status=${status}`);
    
    // 백엔드에서 받은 status 정보를 우선 사용
    if (status === 'confirmed') {
      return (
        <Tooltip title="이미 확정된 급여입니다">
          <Chip
            icon={<CheckCircleIcon style={{ fontSize: 16 }} />}
            label="확정됨"
            size="small"
            sx={{ 
              padding: '4px', 
              fontSize: '0.8rem',
              fontWeight: 700,
              backgroundColor: 'rgba(15, 123, 67, 0.1)',
              color: theme.palette.success.dark,
              border: `1px solid ${theme.palette.success.main}`
            }}
          />
        </Tooltip>
      );
    } else if (status === 'paid') {
      return (
        <Chip
          icon={<PaidIcon style={{ fontSize: 16 }} />}
          label="지급완료"
          size="small"
          sx={{ 
            padding: '4px', 
            fontSize: '0.8rem',
            fontWeight: 700,
            backgroundColor: 'rgba(78, 174, 122, 0.1)',
            color: theme.palette.secondary.dark,
            border: `1px solid ${theme.palette.secondary.main}`
          }}
        />
      );
    }
    
    // 그 외의 상태 (기본값: 미확정)
    return (
      <Chip
        label="미확정"
        size="small"
        sx={{ 
          padding: '4px', 
          fontSize: '0.8rem',
          fontWeight: 500,
          backgroundColor: 'rgba(158, 158, 158, 0.1)',
          color: theme.palette.text.secondary,
          border: `1px solid ${theme.palette.grey[400]}`
        }}
      />
    );
  };

  return (
    <TableContainer 
      component={Paper} 
      sx={{ 
        background: 'rgba(240, 255, 245, 0.8)', 
        border: '1px solid rgba(15, 123, 67, 0.1)', 
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(15, 123, 67, 0.08)',
        overflow: 'hidden'
      }}
    >
      <Table>
        <TableHead>
          <TableRow>
            <TableCell align="center" sx={{ color: theme.palette.text.primary, fontWeight: 700, borderBottom: '1px solid rgba(15, 123, 67, 0.1)', padding: '16px' }}>직원명</TableCell>
            <TableCell align="center" sx={{ color: theme.palette.text.primary, fontWeight: 700, borderBottom: '1px solid rgba(15, 123, 67, 0.1)', padding: '16px' }}>부서</TableCell>
            <TableCell align="center" colSpan={4} sx={{ color: theme.palette.text.primary, fontWeight: 700, borderBottom: `2px solid ${theme.palette.primary.main}`, background: 'rgba(15, 123, 67, 0.05)', padding: '16px' }}>지급항목(지급액 계:)</TableCell>
            <TableCell align="center" colSpan={5} sx={{ color: theme.palette.text.primary, fontWeight: 700, borderBottom: '2px solid rgba(255, 77, 77, 0.8)', background: 'rgba(255, 77, 77, 0.05)', padding: '16px' }}>공제항목(공제액 계:)</TableCell>
            <TableCell align="center" sx={{ color: theme.palette.text.primary, fontWeight: 700, borderBottom: '1px solid rgba(15, 123, 67, 0.1)', padding: '16px' }}>차인지급액</TableCell>
            <TableCell align="center" sx={{ color: theme.palette.text.primary, fontWeight: 700, borderBottom: '1px solid rgba(15, 123, 67, 0.1)', padding: '16px' }}>상태</TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ color: '#fff' }}></TableCell>
            <TableCell sx={{ color: '#fff' }}></TableCell>
            <TableCell align="right" sx={{ color: theme.palette.primary.main, fontWeight: 600, fontSize: '0.9rem', padding: '12px 16px', borderBottom: `1px solid ${theme.palette.primary.light}` }}>기본급</TableCell>
            <TableCell align="right" sx={{ color: theme.palette.primary.main, fontWeight: 600, fontSize: '0.9rem', padding: '12px 16px', borderBottom: `1px solid ${theme.palette.primary.light}` }}>연장근로</TableCell>
            <TableCell align="right" sx={{ color: theme.palette.primary.main, fontWeight: 600, fontSize: '0.9rem', padding: '12px 16px', borderBottom: `1px solid ${theme.palette.primary.light}` }}>야간근로</TableCell>
            <TableCell align="right" sx={{ color: theme.palette.primary.main, fontWeight: 600, fontSize: '0.9rem', padding: '12px 16px', borderBottom: `1px solid ${theme.palette.primary.light}` }}>휴일근로</TableCell>
            <TableCell align="right" sx={{ color: 'rgba(255, 77, 77, 0.9)', fontWeight: 600, fontSize: '0.9rem', padding: '12px 16px', borderBottom: '1px solid rgba(255, 77, 77, 0.3)' }}>국민연금</TableCell>
            <TableCell align="right" sx={{ color: 'rgba(255, 77, 77, 0.9)', fontWeight: 600, fontSize: '0.9rem', padding: '12px 16px', borderBottom: '1px solid rgba(255, 77, 77, 0.3)' }}>건강보험</TableCell>
            <TableCell align="right" sx={{ color: 'rgba(255, 77, 77, 0.9)', fontWeight: 600, fontSize: '0.9rem', padding: '12px 16px', borderBottom: '1px solid rgba(255, 77, 77, 0.3)' }}>장기요양</TableCell>
            <TableCell align="right" sx={{ color: 'rgba(255, 77, 77, 0.9)', fontWeight: 600, fontSize: '0.9rem', padding: '12px 16px', borderBottom: '1px solid rgba(255, 77, 77, 0.3)' }}>고용보험</TableCell>
            <TableCell align="right" sx={{ color: 'rgba(255, 77, 77, 0.9)', fontWeight: 600, fontSize: '0.9rem', padding: '12px 16px', borderBottom: '1px solid rgba(255, 77, 77, 0.3)' }}>소득세</TableCell>
            <TableCell align="right" sx={{ color: '#fff' }}></TableCell>
            <TableCell align="center" sx={{ color: '#fff' }}></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {calculationResults.map((row) => {
            // 행의 배경색 결정
            let bgColor = 'inherit';
            if (row.status === 'confirmed') {
              bgColor = 'rgba(15, 123, 67, 0.05)';
            } else if (row.status === 'paid') {
              bgColor = 'rgba(78, 174, 122, 0.05)';
            } else if (isConfirmed(row.employee_id)) {
              bgColor = 'rgba(15, 123, 67, 0.05)';
            } else if (row.hasError) {
              bgColor = 'rgba(211, 47, 47, 0.05)';
            }
            
            // 로딩 상태이거나 오류 발생 시 스켈레톤 또는 오류 메시지 표시
            if (row.isLoading || row.hasError) {
              return (
                <TableRow 
                  key={row.employee_id} 
                  sx={{ 
                    '&:hover': { background: row.hasError ? 'rgba(211, 47, 47, 0.08)' : 'rgba(15, 123, 67, 0.08)' },
                    borderBottom: '1px solid rgba(15, 123, 67, 0.05)',
                    backgroundColor: bgColor
                  }}
                >
                  <TableCell sx={{ color: theme.palette.primary.main, padding: '16px', fontSize: '0.95rem', fontWeight: 600 }}>
                    {row.isLoading ? (
                      <Skeleton animation="wave" width={100} height={24} />
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {employees.find(emp => emp.employee_id === row.employee_id)?.name || row.employee_name || '-'}
                        {row.status === 'confirmed' && (
                          <Tooltip title="이미 확정된 급여가 있습니다">
                            <CheckCircleIcon fontSize="small" color="success" />
                          </Tooltip>
                        )}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.isLoading ? (
                      <Skeleton animation="wave" variant="rounded" width={80} height={24} />
                    ) : (
                      <Chip
                        label={employees.find(emp => emp.employee_id === row.employee_id)?.department || row.department || '-'}
                        size="small"
                        sx={{ 
                          color: theme.palette.primary.main, 
                          background: 'rgba(15, 123, 67, 0.1)', 
                          borderRadius: '4px', 
                          fontSize: '0.85rem',
                          fontWeight: 600
                        }}
                      />
                    )}
                  </TableCell>
                  
                  {/* 지급 항목 */}
                  {[1, 2, 3, 4].map((_, index) => (
                    <TableCell key={`payment-${index}`} align="right" sx={{ color: theme.palette.primary.main, padding: '16px', fontSize: '0.95rem', fontWeight: 600 }}>
                      {row.isLoading ? (
                        <Skeleton animation="wave" width={60} height={24} />
                      ) : row.hasError ? (
                        '-'
                      ) : (
                        '-원'
                      )}
                    </TableCell>
                  ))}
                  
                  {/* 공제 항목 */}
                  {[1, 2, 3, 4, 5].map((_, index) => (
                    <TableCell key={`deduction-${index}`} align="right" sx={{ color: 'rgba(255, 77, 77, 0.9)', fontWeight: 600 }}>
                      {row.isLoading ? (
                        <Skeleton animation="wave" width={60} height={24} />
                      ) : row.hasError ? (
                        '-'
                      ) : (
                        '-원'
                      )}
                    </TableCell>
                  ))}
                  
                  {/* 차인지급액 */}
                  <TableCell align="right" sx={{ color: theme.palette.primary.dark, fontWeight: 700, padding: '16px', fontSize: '0.95rem' }}>
                    {row.isLoading ? (
                      <Skeleton animation="wave" width={80} height={24} />
                    ) : row.hasError ? (
                      row.errorMessage || '오류 발생'
                    ) : (
                      '-원'
                    )}
                  </TableCell>
                  
                  {/* 상태 칩 */}
                  <TableCell align="center">
                    <StatusChip
                      status={row.status}
                      employee_id={row.employee_id}
                      isLoading={row.isLoading}
                      hasError={row.hasError}
                    />
                  </TableCell>
                </TableRow>
              );
            }
            
            // 일반 데이터 행 표시 (기존 코드)
            return (
              <TableRow 
                key={row.employee_id} 
                sx={{ 
                  '&:hover': { background: 'rgba(15, 123, 67, 0.08)' },
                  borderBottom: '1px solid rgba(15, 123, 67, 0.05)',
                  backgroundColor: bgColor
                }}
              >
                <TableCell sx={{ color: theme.palette.primary.main, padding: '16px', fontSize: '0.95rem', fontWeight: 600 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {employees.find(emp => emp.employee_id === row.employee_id)?.name || row.employee_name || '-'}
                    {row.status === 'confirmed' && (
                      <Tooltip title="이미 확정된 급여가 있습니다">
                        <CheckCircleIcon fontSize="small" color="success" />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={employees.find(emp => emp.employee_id === row.employee_id)?.department || row.department || '-'}
                    size="small"
                    sx={{ 
                      color: theme.palette.primary.main, 
                      background: 'rgba(15, 123, 67, 0.1)', 
                      borderRadius: '4px', 
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}
                  />
                </TableCell>
                <TableCell align="right" sx={{ color: theme.palette.primary.main, padding: '16px', fontSize: '0.95rem', fontWeight: 600 }}>{row.base_pay?.toLocaleString() || row.basePay?.toLocaleString() || '-'}원</TableCell>
                <TableCell align="right" sx={{ color: theme.palette.primary.main, padding: '16px', fontSize: '0.95rem', fontWeight: 600 }}>{row.overtime_pay?.toLocaleString() || row.overtimePay?.toLocaleString() || '-'}원</TableCell>
                <TableCell align="right" sx={{ color: theme.palette.primary.main, padding: '16px', fontSize: '0.95rem', fontWeight: 600 }}>{row.night_shift_pay?.toLocaleString() || row.nightPay?.toLocaleString() || '-'}원</TableCell>
                <TableCell align="right" sx={{ color: theme.palette.primary.main, padding: '16px', fontSize: '0.95rem', fontWeight: 600 }}>{row.holiday_pay?.toLocaleString() || row.holidayPay?.toLocaleString() || '-'}원</TableCell>
                <TableCell align="right" sx={{ color: 'rgba(255, 77, 77, 0.9)', fontWeight: 600 }}>{row.national_pension?.toLocaleString() || (row.deductions?.nationalPension?.toLocaleString()) || '-'}원</TableCell>
                <TableCell align="right" sx={{ color: 'rgba(255, 77, 77, 0.9)', fontWeight: 600 }}>{row.health_insurance?.toLocaleString() || (row.deductions?.healthInsurance?.toLocaleString()) || '-'}원</TableCell>
                <TableCell align="right" sx={{ color: 'rgba(255, 77, 77, 0.9)', fontWeight: 600 }}>{row.long_term_care?.toLocaleString() || (row.deductions?.longTermCare?.toLocaleString()) || '-'}원</TableCell>
                <TableCell align="right" sx={{ color: 'rgba(255, 77, 77, 0.9)', fontWeight: 600 }}>{row.employment_insurance?.toLocaleString() || (row.deductions?.employmentInsurance?.toLocaleString()) || '-'}원</TableCell>
                <TableCell align="right" sx={{ color: 'rgba(255, 77, 77, 0.9)', fontWeight: 600 }}>{row.income_tax?.toLocaleString() || (row.taxes?.incomeTax?.toLocaleString()) || '-'}원</TableCell>
                <TableCell align="right" sx={{ color: theme.palette.primary.dark, fontWeight: 700, padding: '16px', fontSize: '0.95rem' }}>{row.net_pay?.toLocaleString() || row.netPay?.toLocaleString() || '-'}원</TableCell>
                <TableCell align="center">
                  <StatusChip
                    status={row.status}
                    employee_id={row.employee_id}
                    isLoading={row.isLoading}
                    hasError={row.hasError}
                  />
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