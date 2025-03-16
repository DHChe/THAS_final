import { createTheme } from '@mui/material/styles';
import commonStyles from './styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1A365D', // 다크 네이비
      dark: '#0F2942', // 더 어두운 네이비
      light: '#2C5282', // 미드 네이비
    },
    secondary: {
      main: '#3182CE', // 블루
      dark: '#2B6CB0', // 다크 블루
      light: '#63B3ED', // 라이트 블루
    },
    background: {
      default: '#F7FAFC', // 매우 밝은 블루-그레이 계열
      paper: '#FFFFFF', // 흰색 유지
    },
    text: {
      primary: '#1A202C', // 거의 블랙
      secondary: '#4A5568', // 다크 그레이
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(90deg, #1A365D 0%, #2C5282 100%)',
          borderRadius: '8px',
          textTransform: 'none',
          fontSize: '0.875rem',
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(26, 54, 93, 0.25)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease, background 0.3s ease',
          '&:hover': {
            background: 'linear-gradient(90deg, #0F2942 0%, #1E3A8A 100%)',
            boxShadow: '0 8px 16px rgba(26, 54, 93, 0.3)',
            transform: 'scale(1.02)',
          },
          color: '#FFFFFF !important', // 버튼 텍스트 색상 명시 (강조)
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: '#FFFFFF !important',
          boxShadow: '0 2px 5px rgba(26, 54, 93, 0.1)',
          color: '#1A202C !important', // AppBar 내 텍스트 색상 명시
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
      fontSize: '60px',
      lineHeight: 1.1,
      letterSpacing: '-0.02em',
      color: '#1A365D',
    },
    h4: {
      fontWeight: 500,
      fontSize: '28px',
      lineHeight: 1.3,
      color: '#2C5282',
    },
    h5: {
      fontWeight: 600,
      fontSize: '22px',
      color: '#1A202C',
    },
    h6: {
      fontSize: '18px',
      lineHeight: 1.5,
      color: '#4A5568',
    },
    body1: {
      fontSize: '18px',
      lineHeight: 1.5,
      color: '#4A5568',
    },
    subtitle2: {
      color: '#718096',
      fontWeight: 500,
      fontSize: '14px',
    },
  },
  commonStyles: commonStyles,
});

export default theme;