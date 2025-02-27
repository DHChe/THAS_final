const commonStyles = {
  pageContainer: {
    display: 'flex',
    flexDirection: 'column',
    background: '#FFFFFF', // 흰색 배경 유지
    minHeight: '100vh',
    color: '#333333', // 어두운 텍스트 유지
  },
  cardHover: {
    transition: 'transform 0.2s ease-in-out', // 호버 속도 조정
    '&:hover': {
      transform: 'translateY(-2px)', // 부드러운 이동
    },
  },
  buttonGradient: {
    background: '#333333', // 블랙 버튼
    '&:hover': {
      background: '#1a1a1a', // 더 어두운 블랙
      transform: 'scale(1.02)', // 부드러운 확대
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)', // 그림자 조정
    },
  },
  headerText: {
    mt: 4,
    mb: 4,
    textAlign: 'center',
    position: 'relative',
    zIndex: 1,
  },
};

export default commonStyles;