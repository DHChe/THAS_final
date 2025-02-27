import { Card, Button, Paper } from '@mui/material';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { keyframes } from '@emotion/react';

// 기존 neonPulse 애니메이션 제거, 단순 호버 효과로 대체
const buttonHover = keyframes`
  0% { transform: scale(1); }
  100% { transform: scale(1.02); }
`;

export const StyledCard = styled(Card)(({ theme }) => ({
  background: '#FFFFFF',
  border: '1px solid rgba(0, 0, 0, 0.1)', // 연한 회색 테두리
  borderRadius: '4px', // 둥근 모서리 줄임
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', // 그림자 줄임
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-2px)', // 부드러운 호버 효과
  },

  // 카드 내부 텍스트 색상
  '& .MuiTypography-root': {
    color: '#333333', // 어두운 텍스트 유지
  },
}));

export const StyledButton = styled(Button)(({ theme }) => css`
  background: #333333; // 블랙 버튼
  border: '1px solid #333333',
  borderRadius: 4px; // 둥근 모서리 줄임
  text-transform: none;
  font-size: 0.875rem;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); // 그림자 조정

  &:hover {
    background: #1a1a1a; // 더 어두운 블랙
    transform: scale(1.02); // 부드러운 확대
    animation: ${buttonHover} 0.2s ease-in-out;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); // 그림자 약간 강렬
  }
`);

export const StyledPaper = styled(Paper)(({ theme }) => ({
  background: '#FFFFFF',
  border: '1px solid rgba(0, 0, 0, 0.1)', // 연한 회색 테두리
  padding: 3,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', // 그림자 줄임
  '&.custom-paper': {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 2,
    border: '1px solid rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
  },
  '&.chat-paper': {
    height: 'calc(100vh - 190px)',
    padding: 2.5,
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 2,
    border: '1px solid rgba(0, 0, 0, 0.08)',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    flexDirection: 'column',
  },
}));