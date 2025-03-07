import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
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
import { globalStyles } from './styles/styles';
import theme from './styles/theme';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles
        styles={(theme) => ({
          '*': {
            fontFamily: 'Pretendard, -apple-system, sans-serif',
          },
          // 전역 스타일 적용
          ...globalStyles(theme),
        })}
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