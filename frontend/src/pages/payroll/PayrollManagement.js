import React from 'react';
import { Box, Typography, Container, Grid, CardContent } from '@mui/material';
import { AccountBalance, QueryStats, Engineering, Settings, ArrowForward } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { StyledCard, StyledButton } from '../../components/StyledComponents';
import { ThemeProvider } from '@mui/material/styles';
import { CardActions } from '@mui/material';
import theme from '../../styles/theme';
import commonStyles from '../../styles/styles';

const PayrollManagement = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: "임금 지급관리",
      description: "• 근태기록 기반 임금 계산\n• 임금명세서 생성 및 발송\n• 임금 지급 이력 관리",
      icon: <AccountBalance sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      path: "/payroll/payment",
      available: true
    },
    {
      title: "임금 관리 및 분석",
      description: "• 기간별 임금 지급 내역 조회\n• AI 기반 분석 리포트 제공\n• 전체/부서/개인/직급별 데이터 분석",
      icon: <QueryStats sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      path: "/payroll/analysis",
      available: true
    },
    {
      title: "설계중",
      description: "• 새로운 기능 준비중\n• 상세 내용 업데이트 예정\n• 시스템 개발 진행중",
      icon: <Engineering sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      path: "/payroll/feature3",
      available: false
    },
    {
      title: "설계중",
      description: "• 새로운 기능 준비중\n• 상세 내용 업데이트 예정\n• 시스템 개발 진행중",
      icon: <Settings sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      path: "/payroll/feature4",
      available: false
    }
  ];

  return (
    <ThemeProvider theme={theme}>
      <Box sx={commonStyles.pageContainer}>
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
          <Box sx={{ mb: 6 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
              임금 관리 시스템
            </Typography>
            <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
              임금 관리의 모든 프로세스를 효율적으로 관리하고 분석할 수 있는 통합 시스템입니다.
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={6} key={index}>
                <StyledCard
                  sx={{
                    height: '100%',
                    ...(feature.available ? {} : { pointerEvents: 'none' }),
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'center' }}>
                      {feature.icon}
                      <Typography variant="h6" sx={{ ml: 2, color: theme.palette.text.primary }}>
                        {feature.title}
                      </Typography>
                    </Box>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: theme.palette.text.secondary, 
                        mb: 2,
                        textAlign: 'center',
                        whiteSpace: 'pre-line',
                        lineHeight: '1.8'
                      }}
                    >
                      {feature.description}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'center', p: 2 }}>
                    <StyledButton
                      variant="contained"
                      endIcon={<ArrowForward />}
                      onClick={() => feature.available && navigate(feature.path)}
                      disabled={!feature.available}
                    >
                      {feature.available ? '바로가기' : '준비중'}
                    </StyledButton>
                  </CardActions>
                </StyledCard>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default PayrollManagement;

