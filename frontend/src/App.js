import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Home from './pages/Home';
import HRManagement from './pages/hr/HRManagement';
import PayrollManagement from './pages/payroll/PayrollManagement';
import PayrollAnalysis from './pages/payroll/PayrollAnalysis';
import PayrollPayment from './pages/payroll/PayrollPayment';
import './styles/fonts.css';
import { GlobalStyles } from '@mui/material';
import PerformanceMonitor from './components/monitoring/PerformanceMonitor';
import { EmployeeProvider } from './context/EmployeeContext';

// MUI 테마 설정
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: 'Pretendard, Arial, sans-serif',
    h4: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 500,
    },
    subtitle1: {
      fontWeight: 500,
    },
    body1: {
      fontWeight: 400,
    },
  },
  components: {
    MuiTab: {
      styleOverrides: {
        root: {
          fontFamily: 'Pretendard, Arial, sans-serif',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles
        styles={{
          '*': {
            fontFamily: 'Pretendard, -apple-system, sans-serif',
          },
        }}
      />
      <CssBaseline />
      <EmployeeProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/hr" element={<HRManagement />} />
          <Route path="/payroll" element={<PayrollManagement />} />
          <Route path="/payroll/payment" element={<PayrollPayment />} />
          <Route path="/payroll/analysis" element={<PayrollAnalysis />} />
          <Route path="/admin/monitoring" element={<PerformanceMonitor />} />
          {/* 추가 라우트는 여기에 */}
        </Routes>
      </EmployeeProvider>
    </ThemeProvider>
  );
}

export default App;