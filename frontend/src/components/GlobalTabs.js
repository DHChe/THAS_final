import React from 'react';
import { AppBar, Toolbar, Tabs, Tab, Button, Box } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../styles/theme';

const GlobalTabs = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const mainTabs = [
    { label: '홈', path: '/' },
    { label: '급여 관리', path: '/payroll' },
  ];

  // '/payroll'로 시작하는 경로는 '/payroll'로 설정
  const tabValue = location.pathname.startsWith('/payroll') ? '/payroll' : location.pathname;

  const handleTabClick = (path) => {
    navigate(path);
  };

  return (
    <ThemeProvider theme={theme}>
      <AppBar position="static" sx={{ background: '#FFFFFF', boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)', color: '#333333' }}>
        <Toolbar>
          <Box sx={{ flexGrow: 1 }}>
            <Tabs
              value={tabValue}
              onChange={(event, newValue) => handleTabClick(newValue)}
              textColor="inherit"
              indicatorColor="primary"
              sx={{
                '& .MuiTabs-indicator': {
                  height: '2px',
                  backgroundColor: '#333333',
                },
              }}
            >
              {mainTabs.map((tab) => (
                <Tab
                  key={tab.path}
                  value={tab.path}
                  label={tab.label}
                  onClick={() => handleTabClick(tab.path)}
                  sx={{
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#333333',
                    '&:hover': {
                      color: '#666666',
                      background: 'transparent',
                    },
                    '&.Mui-selected': {
                      color: '#333333',
                      fontWeight: 600,
                    },
                  }}
                />
              ))}
            </Tabs>
          </Box>
          <Button
            variant="contained"
            onClick={() => navigate('/dashboard')}
            sx={{
              marginLeft: 2,
              backgroundColor: '#333333',
              '&:hover': {
                backgroundColor: '#1a1a1a',
              },
              color: '#FFFFFF',
            }}
          >
            대시보드 바로가기
          </Button>
        </Toolbar>
      </AppBar>
    </ThemeProvider>
  );
};

export default GlobalTabs;