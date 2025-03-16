import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import theme from './styles/theme';
import GlobalTabs from './components/GlobalTabs';
import Home from './pages/Home';
import HRManagement from './pages/hr/HRManagement';
import PayrollManagement from './pages/payroll/PayrollManagement';
import PayrollPayment from './pages/payroll/PayrollPayment';
import PayrollAnalysis from './pages/payroll/PayrollAnalysis';
import Login from './pages/login/Login';
import './styles/fonts.css';
import { GlobalStyles } from '@mui/material';
import PerformanceMonitor from './components/monitoring/PerformanceMonitor';
import { EmployeeProvider } from './context/EmployeeContext';
import { globalStyles } from './styles/styles';

// 보호된 라우트 컴포넌트
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// 레이아웃 컴포넌트
const Layout = ({ children }) => {
  return (
    <>
      <GlobalTabs />
      {children}
    </>
  );
};

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
          {/* 로그인 페이지를 기본 경로로 설정 */}
          <Route path="/" element={<Login />} />
          
          {/* 보호된 라우트들 */}
          <Route path="/home" element={
            <ProtectedRoute>
              <Layout>
                <Home />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/hr" element={
            <ProtectedRoute>
              <Layout>
                <HRManagement />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/payroll/management" element={
            <ProtectedRoute>
              <Layout>
                <PayrollManagement />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/payroll/payment" element={
            <ProtectedRoute>
              <Layout>
                <PayrollPayment />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/payroll/analysis" element={
            <ProtectedRoute>
              <Layout>
                <PayrollAnalysis />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/admin/monitoring" element={
            <ProtectedRoute>
              <PerformanceMonitor />
            </ProtectedRoute>
          } />
        </Routes>
      </EmployeeProvider>
    </ThemeProvider>
  );
}

export default App;