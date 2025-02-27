import { createTheme } from '@mui/material/styles';
import commonStyles from './styles';

const theme = createTheme({
  palette: {
    mode: 'light', // 밝은 테마 명시
    primary: {
      main: '#333333', // 블랙 톤
      dark: '#1a1a1a', // 더 어두운 블랙
    },
    secondary: {
      main: '#666666', // 연한 회색 (보조 텍스트)
    },
    background: {
      default: '#FFFFFF', // 흰색 배경 유지
      paper: '#FFFFFF', // 흰색 카드/페이퍼 배경 유지
    },
    text: {
      primary: '#333333', // 어두운 텍스트
      secondary: '#666666', // 연한 회색 텍스트
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          backgroundColor: '#333333',
          borderRadius: '4px',
          textTransform: 'none',
          fontSize: '0.875rem',
          fontWeight: 600,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          '&:hover': {
            backgroundColor: '#1a1a1a',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
          color: '#FFFFFF !important', // 버튼 텍스트 색상 명시 (강조)
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: '#FFFFFF !important',
          boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
          color: '#333333 !important', // AppBar 내 텍스트 색상 명시 (강조)
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: '64px',
          padding: '0 16px',
          justifyContent: 'space-between',
        },
      },
    },
  },
  typography: {
    h1: {
      fontWeight: 800,
      color: '#333333',
      fontSize: '48px',
    },
    h4: {
      fontWeight: 300,
      color: '#333333',
      fontSize: '24px',
    },
    h5: {
      fontWeight: 600,
      color: '#333333',
      fontSize: '20px',
    },
    h6: {
      color: '#666666',
      fontSize: '16px',
    },
    body1: {
      color: '#666666',
      fontSize: '16px',
    },
    subtitle2: {
      color: '#333333',
      fontWeight: 500,
      fontSize: '14px',
    },
  },
  commonStyles: commonStyles,
});

export default theme;