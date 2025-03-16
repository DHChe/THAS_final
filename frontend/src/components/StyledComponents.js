import { Card, Button, Paper } from '@mui/material';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { keyframes } from '@emotion/react';

// 버튼 호버 애니메이션 개선
const buttonHover = keyframes`
  0% { transform: scale(1); box-shadow: 0 4px 12px rgba(26, 54, 93, 0.25); }
  100% { transform: scale(1.03); box-shadow: 0 8px 16px rgba(26, 54, 93, 0.3); }
`;

// 카드 호버 애니메이션 추가
const cardHover = keyframes`
  0% { transform: translateY(0); box-shadow: 0 4px 20px rgba(26, 54, 93, 0.1); }
  100% { transform: translateY(-8px); box-shadow: 0 16px 40px rgba(26, 54, 93, 0.18), 0 2px 8px rgba(49, 130, 206, 0.2); }
`;

export const StyledCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(160deg, #FFFFFF 0%, #F7FAFC 55%, #EBF4FF 100%)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(49, 130, 206, 0.08)',
  borderBottom: '1px solid rgba(26, 54, 93, 0.05)',
  borderRight: '1px solid rgba(26, 54, 93, 0.05)',
  borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(26, 54, 93, 0.08), 0 1px 3px rgba(49, 130, 206, 0.1)',
  transition: 'all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)',
  overflow: 'hidden',
  position: 'relative',
  isolation: 'isolate',
  
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'linear-gradient(130deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 50%)',
    zIndex: -1,
  },
  
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: '0 16px 40px rgba(26, 54, 93, 0.18), 0 2px 8px rgba(49, 130, 206, 0.2)',
    animation: `${cardHover} 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)`,
    
    '& .MuiTypography-h5': {
      color: '#1A365D',
    },
  },

  // 카드 내부 텍스트 색상
  '& .MuiTypography-root': {
    color: '#1A202C', // 기본 텍스트 색상
  },
  
  '& .MuiTypography-h5': {
    color: '#1A365D', // 제목 색상
    transition: 'color 0.3s ease',
    fontWeight: 600,
    fontSize: '1.4rem',
    marginBottom: '0.75rem',
  },
  
  '& .MuiTypography-body1': {
    color: '#4A5568', // 본문 색상
    fontSize: '1.125rem',
    lineHeight: 1.6,
  },
  
  '& .MuiCardContent-root': {
    padding: '1.75rem 1.5rem',
  },
  
  '& .MuiSvgIcon-root': {
    transition: 'transform 0.3s ease',
  },
  
  '&:hover .MuiSvgIcon-root': {
    transform: 'scale(1.1)',
  }
}));

export const StyledButton = styled(Button)(({ theme }) => css`
  background: linear-gradient(90deg, #1A365D 0%, #2C5282 100%);
  border: none;
  borderRadius: 8px;
  padding: 12px 24px;
  text-transform: none;
  font-size: 1rem;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(26, 54, 93, 0.25);
  transition: transform 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;

  &:hover {
    background: linear-gradient(90deg, #0F2942 0%, #1E3A8A 100%);
    transform: scale(1.03);
    animation: ${buttonHover} 0.3s ease-in-out;
    box-shadow: 0 8px 16px rgba(26, 54, 93, 0.3);
  }
`);

export const StyledPaper = styled(Paper)(({ theme }) => ({
  background: '#FFFFFF',
  border: '1px solid rgba(49, 130, 206, 0.1)',
  padding: 3,
  boxShadow: '0 4px 20px rgba(26, 54, 93, 0.1)',
  borderRadius: '12px',
  '&.custom-paper': {
    background: 'linear-gradient(180deg, #FFFFFF 0%, #F7FAFC 100%)',
    borderRadius: '12px',
    border: '1px solid rgba(49, 130, 206, 0.1)',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(26, 54, 93, 0.1)',
    display: 'flex',
    flexDirection: 'column',
  },
  '&.chat-paper': {
    height: 'calc(100vh - 190px)',
    padding: 2.5,
    background: 'linear-gradient(180deg, #FFFFFF 0%, #F7FAFC 100%)',
    borderRadius: '12px',
    border: '1px solid rgba(49, 130, 206, 0.1)',
    boxShadow: '0 4px 20px rgba(26, 54, 93, 0.1)',
    display: 'flex',
    flexDirection: 'column',
  },
}));