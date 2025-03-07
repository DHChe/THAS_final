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
  container: {
    py: 4, // 패딩 (y축)
    px: { xs: 2, sm: 3 }, // 반응형 패딩 (x축)
    maxWidth: 'xl', // 최대 너비 (MUI breakpoints)
  },
  pageTitle: {
    mb: 4, // 마진 바텀
    fontWeight: 500,
    color: 'primary.main',
  },
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 3,
    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: 5,
    },
  },
  formControl: {
    width: '100%',
    mb: 2, // 마진 바텀
  },
  buttonGroup: {
    mt: 3, // 마진 탑
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 2, // 버튼 사이 간격
  },
  tableContainer: {
    boxShadow: 2,
    borderRadius: 1,
    overflow: 'hidden',
  },
  modal: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    bgcolor: 'background.paper',
    borderRadius: 1,
    boxShadow: 24,
    p: 4,
    width: { xs: '90%', sm: 600 },
    maxHeight: '90vh',
    overflow: 'auto',
  },
};

// 전역 스타일 - CssBaseline 오버라이드용
const globalStyles = (theme) => ({
  html: {
    scrollbarWidth: 'thin',
    scrollbarColor: `${theme.palette.grey[400]} ${theme.palette.grey[100]}`,
    overflowY: 'scroll',
  },
  body: {
    overflowY: 'scroll !important', // 항상 스크롤바 표시
  },
  '*::-webkit-scrollbar': {
    width: '8px',
    height: '8px',
  },
  '*::-webkit-scrollbar-track': {
    background: theme.palette.grey[100],
  },
  '*::-webkit-scrollbar-thumb': {
    backgroundColor: theme.palette.grey[400],
    borderRadius: '4px',
  },
  '*::-webkit-scrollbar-thumb:hover': {
    backgroundColor: theme.palette.grey[600],
  },
});

export default commonStyles;
export { globalStyles };