import React from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Groups, // 인력 현황
  Warning, // 인재 리스크
  TrendingUp, // 생산성 지표
  School // 인재 개발
} from '@mui/icons-material';
import GlobalTabs from '../../components/GlobalTabs';

/**
 * 인사 관리 메인 페이지
 * 인사 현황 요약, 직원 검색, 직원 목록, 부서별 통계를 표시합니다.
 */
const HRManagement = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        background: 'radial-gradient(circle at center, #1a2035 0%, #0d1117 100%)',
        minHeight: '100vh',
        color: '#fff'
      }}
    >
      <GlobalTabs />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Quick Stats 대시보드 */}
        <Grid container spacing={3}>
          {/* 1. 인력 현황 */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'rgba(30, 41, 59, 0.8)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                height: '100%',
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-5px)'
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                    인력 현황
                  </Typography>
                  <IconButton sx={{ color: '#4d7cfe' }}>
                    <Groups />
                  </IconButton>
                </Box>
                <Typography variant="h4" sx={{ color: '#fff', mb: 1 }}>
                  257명
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
                  총 직원 수
                </Typography>
                <Box sx={{ 
                  height: 150, 
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    도넛 차트 영역
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 2. 인재 리스크 모니터링 */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'rgba(30, 41, 59, 0.8)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                height: '100%',
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-5px)'
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                    인재 리스크
                  </Typography>
                  <Tooltip title="고위험 인재">
                    <IconButton sx={{ color: '#ff4d4d' }}>
                      <Warning />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Typography variant="h4" sx={{ color: '#ff4d4d', mb: 1 }}>
                  5명
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
                  이직 위험 인재
                </Typography>
                <Box sx={{ 
                  height: 150,
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    게이지 차트 영역
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 3. 생산성 지표 */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'rgba(30, 41, 59, 0.8)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                height: '100%',
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-5px)'
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                    생산성 지표
                  </Typography>
                  <IconButton sx={{ color: '#4d7cfe' }}>
                    <TrendingUp />
                  </IconButton>
                </Box>
                <Typography variant="h4" sx={{ color: '#fff', mb: 1 }}>
                  85%
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
                  목표 달성률
                </Typography>
                <Box sx={{ 
                  height: 150,
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    스파크라인 차트 영역
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 4. 인재 개발 현황 */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'rgba(30, 41, 59, 0.8)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                height: '100%',
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-5px)'
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                    인재 개발
                  </Typography>
                  <IconButton sx={{ color: '#4d7cfe' }}>
                    <School />
                  </IconButton>
                </Box>
                <Typography variant="h4" sx={{ color: '#fff', mb: 1 }}>
                  75%
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
                  교육 이수율
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={75} 
                  sx={{
                    mb: 2,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: '#4d7cfe',
                      borderRadius: 4
                    }
                  }}
                />
                <Box sx={{ 
                  height: 120,
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    추가 지표 영역
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default HRManagement;