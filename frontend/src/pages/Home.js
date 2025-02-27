import React from 'react';
import { Box, Typography, Container, Grid, CardContent } from '@mui/material';
import { Psychology, Speed } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import GlobalTabs from '../components/GlobalTabs'; // SimpleNavigation 대신 GlobalTabs 사용
import { StyledCard, StyledButton } from '../components/StyledComponents';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../styles/theme';
import commonStyles from '../styles/styles';

function Home() {
  const navigate = useNavigate();
  console.log('Home component loaded successfully'); // 디버깅용 로그 유지

  return (
    <ThemeProvider theme={theme}>
      <Box sx={commonStyles.pageContainer}>
        <GlobalTabs /> {/* SimpleNavigation 대신 GlobalTabs 사용 */}
        <Container maxWidth="lg">
          <Box sx={{ mt: 8, mb: 6, textAlign: 'center', position: 'relative' }}>
            <Box
              sx={{
                position: 'absolute',
                top: '-100px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(0, 0, 0, 0.1) 0%, rgba(0,0,0,0) 70%)',
                zIndex: 0,
              }}
            />
            <Typography variant="h1" sx={{ fontSize: { xs: '3rem', md: '4rem' }, color: '#333333', ...commonStyles.headerText }}>
              THAS
            </Typography>
            <Typography variant="h4" sx={{ color: '#333333', ...commonStyles.headerText }}>
              Total Human-centered Assistant System
            </Typography>
            <Typography variant="h6" sx={{ maxWidth: 800, mx: 'auto', mb: 6, color: '#666666', ...commonStyles.headerText }}>
              AI 기반의 통합 비즈니스 솔루션으로 기업 경영의 새로운 패러다임을 제시합니다
            </Typography>
          </Box>

          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <StyledCard>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Psychology sx={{ fontSize: 40, mr: 2, color: '#333333' }} />
                    <Typography variant="h5" sx={{ color: '#333333' }}>AI 기반 의사결정 지원</Typography>
                  </Box>
                  <Typography sx={{ color: '#666666' }}>
                    실시간 데이터 분석과 AI 알고리즘을 통해 경영진의 의사결정에 필요한 인사이트를 제공하며, 비즈니스 성과를 최적화합니다.
                  </Typography>
                </CardContent>
              </StyledCard>
            </Grid>

            <Grid item xs={12} md={6}>
              <StyledCard>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Speed sx={{ fontSize: 40, mr: 2, color: '#333333' }} />
                    <Typography variant="h5" sx={{ color: '#333333' }}>업무 효율성 극대화</Typography>
                  </Box>
                  <Typography sx={{ color: '#666666' }}>
                    인사, 재무, 생산, 영업 등 전사적 업무 프로세스의 유기적 통합으로 업무 생산성과 효율성을 극대화합니다.
                  </Typography>
                </CardContent>
              </StyledCard>
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6, mb: 4 }}>
            <StyledButton onClick={() => navigate('/dashboard')} size="large">
              대시보드 바로가기
            </StyledButton>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default Home;