import React, { useEffect, useState } from 'react';
import { Box, Typography, Container, Grid, CardContent, Divider, Paper, Avatar, Stack, Button } from '@mui/material';
import { 
  Psychology, 
  Speed, 
  TrendingUp, 
  SettingsApplications, 
  Security, 
  BarChart, 
  Notifications, 
  LightbulbOutlined,
  ArrowForward,
  KeyboardArrowDown
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { StyledCard, StyledButton, StyledPaper } from '../components/StyledComponents';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../styles/theme';
import commonStyles from '../styles/styles';
import dashboardPreview from '../assets/images/dashboard-preview.jpg';

// 애니메이션 효과를 위한 스타일
const animatedSection = {
  opacity: 1,
  transform: 'translateY(0)',
  transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
  '&.fade-in': {
    opacity: 0,
    transform: 'translateY(20px)',
  }
};

// 세련된 색상 팔레트
const palette = {
  primary: {
    main: '#1A365D', // 다크 네이비
    light: '#2C5282', // 미드 네이비
    dark: '#0F2942', // 더 어두운 네이비
  },
  secondary: {
    main: '#2D3748', // 차콜 그레이
    light: '#4A5568', // 미드 그레이
    dark: '#1A202C', // 다크 그레이
  },
  text: {
    primary: '#1A202C', // 거의 블랙
    secondary: '#4A5568', // 다크 그레이
    light: '#718096', // 미드 그레이
  },
  background: {
    default: '#F7FAFC', // 라이트 그레이
    paper: '#FFFFFF', // 화이트
    accent: '#EBF4FF', // 아주 연한 블루
  },
  accent: {
    blue: '#3182CE', // 블루 액센트
    indigo: '#5A67D8', // 인디고 액센트
  }
};

function Home() {
  const navigate = useNavigate();
  console.log('Home component loaded successfully');
  
  // 스크롤 상태 추적
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);

  // 스크롤 이벤트 처리
  useEffect(() => {
    const handleScroll = () => {
      // 스크롤 위치가 200px 이상이면 스크롤 표시기 숨김
      if (window.scrollY > 200) {
        setShowScrollIndicator(false);
      } else {
        setShowScrollIndicator(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 스크롤 기능 - 특정 섹션으로 스크롤
  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 주요 서비스 기능 배열
  const serviceFeatures = [
    {
      icon: <Psychology />,
      title: "AI 기반 의사결정 지원",
      description: "실시간 데이터 분석과 AI 알고리즘을 통해 경영진의 의사결정에 필요한 인사이트를 제공합니다."
    },
    {
      icon: <Speed />,
      title: "업무 효율성 극대화",
      description: "인사, 재무, 생산, 영업 등 전사적 업무 프로세스의 유기적 통합으로 생산성을 향상시킵니다."
    },
    {
      icon: <TrendingUp />,
      title: "데이터 기반 경영 분석",
      description: "핵심 경영 지표를 실시간으로 모니터링하고 미래 트렌드를 예측하여 전략적 판단을 돕습니다."
    },
    {
      icon: <Security />,
      title: "안전한 데이터 보안",
      description: "엔터프라이즈급 보안 시스템으로 중요한 기업 데이터를 안전하게 보호합니다."
    }
  ];

  // 주요 솔루션 영역 배열
  const solutionAreas = [
    {
      title: "급여 관리",
      description: "자동화된 급여 계산 및 지급 관리로 인사팀의 업무 부담을 줄이고 정확성을 높입니다.",
      route: "/payroll"
    },
    {
      title: "인사 관리",
      description: "직원 정보, 근태, 성과 관리를 통합적으로 관리하여 인적 자원을 효율적으로 운영합니다.",
      route: "/hr"
    },
    {
      title: "재고 관리",
      description: "실시간 재고 현황 파악 및 예측으로 재고 비용을 최적화하고 운영 효율성을 증대합니다.",
      route: "/inventory"
    },
    {
      title: "원가 분석",
      description: "제품 및 서비스 원가를 정확히 분석하여 수익성 향상을 위한 전략적 의사결정을 지원합니다.",
      route: "/cost-analysis"
    }
  ];

  // 도입 혜택 배열
  const benefits = [
    {
      icon: <BarChart sx={{ fontSize: 40, color: palette.primary.light }} />,
      title: "20% 업무 효율 증가",
      description: "자동화된 프로세스로 반복 업무를 줄이고 핵심 업무에 집중할 수 있습니다."
    },
    {
      icon: <Notifications sx={{ fontSize: 40, color: palette.primary.light }} />,
      title: "오류 발생률 90% 감소",
      description: "AI 기반 검증 시스템으로 데이터 오류를 사전에 감지하고 예방합니다."
    },
    {
      icon: <LightbulbOutlined sx={{ fontSize: 40, color: palette.primary.light }} />,
      title: "의사결정 시간 30% 단축",
      description: "실시간 데이터 분석과 인사이트 제공으로 신속한 의사결정이 가능합니다."
    }
  ];

  return (
    <ThemeProvider theme={theme}>
      <Box sx={commonStyles.pageContainer}>
        {/* 히어로 섹션 */}
        <Box 
          id="hero-section"
          sx={{
            position: 'relative',
            overflow: 'hidden',
            pt: { xs: 8, md: 12 },
            pb: { xs: 6, md: 8 },
            background: 'linear-gradient(130deg, #EBF4FF 0%, #FFFFFF 100%)',
            minHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {/* 배경 요소 */}
          <Box
            sx={{
              position: 'absolute',
              top: '-10%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              height: '100%',
              background: 'radial-gradient(circle at center, rgba(49, 130, 206, 0.08) 0%, rgba(26, 54, 93, 0.04) 30%, rgba(0,0,0,0) 70%)',
              zIndex: 0,
            }}
          />
          
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.03,
              backgroundImage: 'linear-gradient(#3182CE 1px, transparent 1px), linear-gradient(to right, #3182CE 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              zIndex: 0,
            }}
          />
          
          <Container maxWidth="lg" sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Grid container spacing={4} alignItems="center" sx={{ flex: 1 }}>
              <Grid item xs={12} md={7} sx={{ position: 'relative', zIndex: 1 }}>
                <Typography 
                  variant="h1" 
                  sx={{ 
                    fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem' }, 
                    color: palette.primary.main, 
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    textShadow: '0 2px 10px rgba(26, 54, 93, 0.15)',
                    mb: 2,
                    lineHeight: 1.1
                  }}
                >
                  THAS
                </Typography>
                
                <Typography 
                  variant="h4" 
                  sx={{ 
                    color: palette.primary.light, 
                    fontWeight: 500,
                    letterSpacing: '-0.01em',
                    mb: 3,
                  }}
                >
                  Total Human-centered Assistant System
                </Typography>
                
                <Typography 
                  variant="h6" 
                  sx={{ 
                    maxWidth: 650, 
                    mb: 5, 
                    color: palette.text.secondary, 
                    fontWeight: 400,
                    lineHeight: 1.5,
                    fontSize: '1.2rem'
                  }}
                >
                  AI 기반의 통합 비즈니스 솔루션으로 인사노무/재고/원가/급여 관리를 자동화하고 
                  실시간 데이터 분석을 통한 경영 인사이트를 제공합니다.
                </Typography>
                
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button 
                    variant="contained"
                    size="large"
                    onClick={() => navigate('/dashboard')}
                    sx={{
                      fontSize: '1.125rem',
                      padding: '14px 32px',
                      backgroundColor: palette.primary.main,
                      color: 'white',
                      fontWeight: 600,
                      boxShadow: '0 4px 12px rgba(26, 54, 93, 0.25)',
                      '&:hover': {
                        backgroundColor: palette.primary.dark,
                      }
                    }}
                  >
                    대시보드 바로가기
                  </Button>
                  
                  <Button 
                    variant="outlined"
                    onClick={() => navigate('/demo')}
                    sx={{
                      fontSize: '1.125rem',
                      padding: '14px 32px',
                      borderColor: palette.primary.main,
                      color: palette.primary.main,
                      '&:hover': {
                        borderColor: palette.primary.dark,
                        backgroundColor: 'rgba(26, 54, 93, 0.05)',
                      }
                    }}
                  >
                    데모 체험하기
                  </Button>
                </Stack>
              </Grid>
              
              <Grid item xs={12} md={5} sx={{ display: { xs: 'none', md: 'block' }, position: 'relative', zIndex: 1 }}>
                <Box
                  sx={{
                    position: 'relative',
                    height: 450,
                    width: '100%',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(26, 54, 93, 0.25)',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(45deg, rgba(26, 54, 93, 0.7), rgba(49, 130, 206, 0.4))',
                      zIndex: 1,
                    }
                  }}
                >
                  <Box
                    component="img"
                    src={dashboardPreview}
                    alt="THAS 대시보드 미리보기"
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    onError={(e) => {
                      console.error('이미지 로드 실패:', e);
                      e.target.src = 'https://source.unsplash.com/random/800x600/?dashboard';
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 30,
                      left: 30,
                      zIndex: 2,
                      color: 'white',
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      padding: '20px',
                      borderRadius: '10px',
                      backdropFilter: 'blur(5px)',
                      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    <Typography variant="h5" sx={{ 
                      fontWeight: 600, 
                      mb: 1,
                      color: '#ffffff',
                      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)'
                    }}>
                      직관적인 대시보드
                    </Typography>
                    <Typography variant="body1" sx={{
                      color: '#ffffff',
                      textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)',
                      fontWeight: 500
                    }}>
                      모든 데이터를 한눈에 확인하세요
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
            
            {/* 스크롤 다운 표시 */}
            <Box 
              sx={{ 
                textAlign: 'center', 
                mt: 4, 
                mb: 2,
                cursor: 'pointer',
                position: 'relative',
                opacity: showScrollIndicator ? 1 : 0,
                transition: 'opacity 0.5s ease',
                visibility: showScrollIndicator ? 'visible' : 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: '-20px',
                  left: 0,
                  right: 0,
                  height: '40px',
                  background: 'linear-gradient(to bottom, rgba(235, 244, 255, 0), rgba(235, 244, 255, 0.8))',
                  zIndex: 1,
                  pointerEvents: 'none',
                }
              }}
              onClick={() => scrollToSection('features-section')}
            >
              <Typography 
                variant="body1" 
                sx={{ 
                  color: palette.primary.main, 
                  fontWeight: 600,
                  mb: 1,
                  zIndex: 2,
                  position: 'relative',
                }}
              >
                더 알아보기
              </Typography>
              <Box
                sx={{
                  animation: `bounce 2s infinite`,
                  '@keyframes bounce': {
                    '0%, 20%, 50%, 80%, 100%': {
                      transform: 'translateY(0)',
                    },
                    '40%': {
                      transform: 'translateY(-10px)',
                    },
                    '60%': {
                      transform: 'translateY(-5px)',
                    },
                  },
                }}
              >
                <KeyboardArrowDown 
                  sx={{ 
                    color: palette.primary.main, 
                    fontSize: 36,
                    filter: 'drop-shadow(0 2px 4px rgba(26, 54, 93, 0.2))'
                  }} 
                />
              </Box>
            </Box>
          </Container>
        </Box>
        
        {/* THAS 대시보드 미리보기 섹션 */}
        <Box
          sx={{
            position: 'relative',
            mt: 8,
            p: 4,
            borderRadius: '20px',
            overflow: 'hidden',
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `url(${dashboardPreview})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              opacity: 0.1,
              filter: 'blur(3px)',
              zIndex: 0
            }
          }}
        >
          <Box
            sx={{
              position: 'relative',
              zIndex: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              p: 5,
              borderRadius: '15px',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(26, 54, 93, 0.25)',
              maxWidth: '800px',
              width: '100%'
            }}
          >
            <Typography 
              variant="h2" 
              gutterBottom 
              sx={{ 
                fontWeight: 700, 
                color: theme.palette.primary.main,
                fontSize: { xs: '2rem', md: '3rem' },
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                mb: 3
              }}
            >
              직관적인 대시보드
            </Typography>
            <Typography 
              variant="h4" 
              sx={{ 
                mb: 3, 
                color: theme.palette.primary.light,
                fontWeight: 600,
                fontSize: { xs: '1.5rem', md: '2rem' }
              }}
            >
              THAS 대시보드 미리보기
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                color: theme.palette.text.primary,
                fontSize: { xs: '1.1rem', md: '1.25rem' },
                fontWeight: 700,
                maxWidth: '600px',
                mx: 'auto',
                lineHeight: 1.6,
                letterSpacing: '0.5px',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
              }}
            >
              모든 데이터를 한눈에 확인하세요
            </Typography>
          </Box>
        </Box>
        
        {/* 주요 기능 섹션 */}
        <Container id="features-section" maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
          <Box sx={{ mb: 8, textAlign: 'center' }}>
            <Typography 
              variant="h2" 
              sx={{ 
                fontSize: { xs: '2rem', md: '3rem' },
                fontWeight: 700,
                color: palette.text.primary,
                mb: 2,
              }}
            >
              기업 경영을 위한 완벽한 솔루션
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                fontSize: '1.2rem',
                color: palette.text.secondary,
                maxWidth: 750,
                mx: 'auto',
                lineHeight: 1.6,
              }}
            >
              THAS는 기업 경영의 핵심 영역에서 데이터 기반 의사결정을 지원하고
              업무 프로세스를 효율화하는 통합 관리 시스템입니다.
            </Typography>
          </Box>
          
          <Grid container spacing={4}>
            {serviceFeatures.map((feature, index) => (
              <Grid item xs={12} sm={6} key={index}>
                <StyledCard>
                  <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <Box 
                        sx={{ 
                          mr: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 60,
                          height: 60,
                          borderRadius: '12px',
                          background: 'linear-gradient(130deg, #EBF4FF 0%, #E6E9F0 100%)',
                          boxShadow: '0 2px 8px rgba(26, 54, 93, 0.1)',
                        }}
                      >
                        {React.cloneElement(feature.icon, { sx: { fontSize: 32, color: palette.primary.main } })}
                      </Box>
                      <Typography variant="h5" sx={{ color: palette.text.primary, fontWeight: 600 }}>
                        {feature.title}
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ color: palette.text.secondary }}>
                      {feature.description}
                    </Typography>
                  </CardContent>
                </StyledCard>
              </Grid>
            ))}
          </Grid>
        </Container>
        
        {/* 주요 솔루션 영역 섹션 */}
        <Box sx={{ background: 'linear-gradient(160deg, #EBF4FF 0%, #FFFFFF 100%)', py: { xs: 6, md: 10 } }}>
          <Container maxWidth="lg">
            <Box sx={{ mb: 8, textAlign: 'center' }}>
              <Typography 
                variant="h2" 
                sx={{ 
                  fontSize: { xs: '2rem', md: '3rem' },
                  fontWeight: 700,
                  color: palette.text.primary,
                  mb: 2,
                }}
              >
                통합 관리 솔루션
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontSize: '1.2rem',
                  color: palette.text.secondary,
                  maxWidth: 750,
                  mx: 'auto',
                  lineHeight: 1.6,
                }}
              >
                기업 운영의 핵심적인 영역을 한 플랫폼에서 효율적으로 관리하세요
              </Typography>
            </Box>
            
            <Grid container spacing={4}>
              {solutionAreas.map((solution, index) => (
                <Grid item xs={12} sm={6} key={index}>
                  <StyledCard
                    onClick={() => navigate(solution.route)}
                    sx={{ 
                      cursor: 'pointer',
                      height: '100%',
                    }}
                  >
                    <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="h5" sx={{ color: palette.text.primary, fontWeight: 600, mb: 2 }}>
                        {solution.title}
                      </Typography>
                      <Typography variant="body1" sx={{ color: palette.text.secondary, flex: 1 }}>
                        {solution.description}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 2 }}>
                        <Typography sx={{ color: palette.primary.main, fontWeight: 500, mr: 1 }}>자세히 보기</Typography>
                        <ArrowForward sx={{ fontSize: 18, color: palette.primary.main }} />
                      </Box>
                    </CardContent>
                  </StyledCard>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
        
        {/* 도입 혜택 섹션 */}
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
          <Box sx={{ mb: 8, textAlign: 'center' }}>
            <Typography 
              variant="h2" 
              sx={{ 
                fontSize: { xs: '2rem', md: '3rem' },
                fontWeight: 700,
                color: palette.text.primary,
                mb: 2,
              }}
            >
              THAS 도입 효과
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                fontSize: '1.2rem',
                color: palette.text.secondary,
                maxWidth: 750,
                mx: 'auto',
                lineHeight: 1.6,
              }}
            >
              실제 기업들이 THAS를 통해 경험한 비즈니스 성과 향상
            </Typography>
          </Box>
          
          <Grid container spacing={4} justifyContent="center">
            {benefits.map((benefit, index) => (
              <Grid item xs={12} sm={4} key={index}>
                <Paper
                  sx={{
                    p: 4,
                    height: '100%',
                    textAlign: 'center',
                    borderRadius: '16px',
                    background: 'white',
                    boxShadow: '0 4px 20px rgba(26, 54, 93, 0.08)',
                    border: '1px solid rgba(26, 54, 93, 0.05)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 30px rgba(26, 54, 93, 0.12)',
                    }
                  }}
                >
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      bgcolor: 'rgba(26, 54, 93, 0.1)',
                      mx: 'auto',
                      mb: 3,
                    }}
                  >
                    {benefit.icon}
                  </Avatar>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: palette.text.primary }}>
                    {benefit.title}
                  </Typography>
                  <Typography variant="body1" sx={{ color: palette.text.secondary }}>
                    {benefit.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
        
        {/* CTA 섹션 */}
        <Box 
          sx={{ 
            background: 'linear-gradient(130deg, #0F2942 0%, #1A365D 50%, #2C5282 100%)',
            py: { xs: 6, md: 10 },
            color: 'white',
            textAlign: 'center',
          }}
        >
          <Container maxWidth="md">
            <Typography 
              variant="h2" 
              sx={{ 
                fontSize: { xs: '2rem', md: '3rem' },
                fontWeight: 700,
                mb: 3,
                color: 'white',
              }}
            >
              비즈니스 성과 향상을 경험하세요
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                fontSize: '1.2rem',
                maxWidth: 750,
                mx: 'auto',
                mb: 5,
                lineHeight: 1.6,
                color: 'rgba(255, 255, 255, 0.9)',
              }}
            >
              THAS는 기업의 핵심 업무를 효율화하고 데이터 기반의 의사결정을 지원하여
              비즈니스 성과와 경쟁력을 높이는 최적의 솔루션입니다.
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/dashboard')}
                sx={{
                  fontSize: '1.125rem',
                  padding: '14px 32px',
                  backgroundColor: 'white',
                  color: palette.primary.main,
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  }
                }}
              >
                지금 시작하기
              </Button>
              
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/contact')}
                sx={{
                  fontSize: '1.125rem',
                  padding: '14px 32px',
                  borderColor: 'white',
                  color: 'white',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  }
                }}
              >
                문의하기
              </Button>
            </Box>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default Home;