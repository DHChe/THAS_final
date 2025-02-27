import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  People as PeopleIcon,
  Business as BusinessIcon,
  WorkOutline as WorkIcon,
  Timer as TimerIcon
} from '@mui/icons-material';
import { fetchHRSummary } from '../../services/api';

const HRSummary = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        setLoading(true);
        const data = await fetchHRSummary();
        setSummary(data);
      } catch (err) {
        setError('인사 현황 데이터 로드 중 오류가 발생했습니다.');
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
    <Box>
      <Typography variant="h6" gutterBottom>
        인사 현황
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PeopleIcon sx={{ mr: 1 }} />
                <Typography color="textSecondary">총 직원수</Typography>
              </Box>
              <Typography variant="h4" component="div" sx={{ mt: 2 }}>
                {summary?.total_employees}명
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <BusinessIcon sx={{ mr: 1 }} />
                <Typography color="textSecondary">부서 수</Typography>
              </Box>
              <Typography variant="h4" component="div" sx={{ mt: 2 }}>
                {summary?.departments}개
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <WorkIcon sx={{ mr: 1 }} />
                <Typography color="textSecondary">직급 수</Typography>
              </Box>
              <Typography variant="h4" component="div" sx={{ mt: 2 }}>
                {summary?.positions}개
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TimerIcon sx={{ mr: 1 }} />
                <Typography color="textSecondary">평균 근속연수</Typography>
              </Box>
              <Typography variant="h4" component="div" sx={{ mt: 2 }}>
                {summary?.avg_years.toFixed(1)}년
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HRSummary;