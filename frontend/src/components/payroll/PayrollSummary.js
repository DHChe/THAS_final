import React from 'react';
import { Grid, Paper, Typography } from '@mui/material';

const PayrollSummary = ({ calculationResults, employees }) => {
  if (!calculationResults || calculationResults.length === 0) return null;

  const totalPayroll = calculationResults.reduce((acc, curr) => {
    const grossPay = curr?.gross_pay || curr?.totalPay || 0;
    return acc + grossPay;
  }, 0);
  
  const totalDeductions = calculationResults.reduce((acc, curr) => {
    const nationalPension = curr?.national_pension || 0;
    const healthInsurance = curr?.health_insurance || 0;
    const longTermCare = curr?.long_term_care || 0;
    const employmentInsurance = curr?.employment_insurance || 0;
    const incomeTax = curr?.income_tax || 0;
    const residenceTax = curr?.residence_tax || 0;

    const deductions = curr?.deductions || {};
    const taxes = curr?.taxes || {};
    
    return acc + 
      (nationalPension || deductions?.nationalPension || 0) + 
      (healthInsurance || deductions?.healthInsurance || 0) + 
      (longTermCare || deductions?.longTermCare || 0) + 
      (employmentInsurance || deductions?.employmentInsurance || 0) + 
      (incomeTax || taxes?.incomeTax || 0) + 
      (residenceTax || taxes?.localIncomeTax || 0);
  }, 0);
  
  const totalNetPay = calculationResults.reduce((acc, curr) => {
    const netPay = curr?.net_pay || curr?.netPay || 0;
    return acc + netPay;
  }, 0);

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 3, background: 'rgba(183, 213, 242, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Typography variant="subtitle2" sx={{ color: 'rgba(28, 27, 27, 0.7)' }}>총 지급 금액</Typography>
          <Typography variant="h4" sx={{ color: '#4d7cfe', mt: 1 }}>{totalPayroll.toLocaleString()}원</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(28, 27, 27, 0.7)', mt: 1 }}>{calculationResults.length}명 기준</Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 3, background: 'rgba(183, 213, 242, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Typography variant="subtitle2" sx={{ color: 'rgba(28, 27, 27, 0.7)' }}>총 공제 금액</Typography>
          <Typography variant="h4" sx={{ color: '#ff4d4d', mt: 1 }}>{totalDeductions.toLocaleString()}원</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(28, 27, 27, 0.7)', mt: 1 }}>평균 {Math.round(totalDeductions / calculationResults.length).toLocaleString()}원/인</Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 3, background: 'rgba(183, 213, 242, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Typography variant="subtitle2" sx={{ color: 'rgba(28, 27, 27, 0.7)' }}>총 실수령액</Typography>
          <Typography variant="h4" sx={{ color: '#4d7cfe', mt: 1 }}>{totalNetPay.toLocaleString()}원</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(28, 27, 27, 0.7)', mt: 1 }}>평균 {Math.round(totalNetPay / calculationResults.length).toLocaleString()}원/인</Typography>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default PayrollSummary;