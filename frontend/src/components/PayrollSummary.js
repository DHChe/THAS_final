import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert
} from '@mui/material';
import { formatNumber } from '../utils/format';
import { fetchPayrollSummary } from '../services/api';

/**
 * 급여 현황 요약 컴포넌트
 * 주요 급여 지표들을 카드 형태로 표시합니다.
 */
const PayrollSummary = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryData, setSummaryData] = useState(null);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        setLoading(true);
        const data = await fetchPayrollSummary();
        setSummaryData(data);
      } catch (err) {
        setError('급여 데이터 로드 중 오류가 발생했습니다.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, []);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              총 지급액
            </Typography>
            <Typography variant="h5">
              {formatNumber(summaryData?.총지급액)} 원
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              평균 급여
            </Typography>
            <Typography variant="h5">
              {formatNumber(summaryData?.평균급여)} 원
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              총 인원
            </Typography>
            <Typography variant="h5">
              {summaryData?.총인원} 명
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              4대보험 총액
            </Typography>
            <Typography variant="h5">
              {formatNumber(summaryData?.['4대보험총액'])} 원
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default PayrollSummary;