const commonStyles = {
  pageContainer: {
    display: 'flex',
    flexDirection: 'column',
    background: '#F7FAFC', // 매우 밝은 블루-그레이 계열
    minHeight: '100vh',
    color: '#1A202C', // 거의 블랙
  },
  cardHover: {
    transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
    '&:hover': {
      transform: 'translateY(-8px)', // 부드러운 이동 강화
      boxShadow: '0 12px 30px rgba(26, 54, 93, 0.15)',
    },
  },
  buttonGradient: {
    background: 'linear-gradient(90deg, #1A365D 0%, #2C5282 100%)', // 그라데이션 적용
    '&:hover': {
      background: 'linear-gradient(90deg, #0F2942 0%, #1E3A8A 100%)', // 더 짙은 그라데이션
      transform: 'scale(1.03)', // 부드러운 확대
      boxShadow: '0 8px 16px rgba(26, 54, 93, 0.25)', // 그림자 강화 및 색상 조정
    },
  },
  headerText: {
    mt: 6,
    mb: 6,
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
    fontWeight: 600,
    color: '#1A365D',
    letterSpacing: '-0.01em',
  },
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 20px rgba(26, 54, 93, 0.1)',
    borderRadius: '12px',
    transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
    background: 'linear-gradient(180deg, #FFFFFF 0%, #F7FAFC 100%)',
    border: '1px solid rgba(49, 130, 206, 0.1)',
    overflow: 'hidden',
    '&:hover': {
      transform: 'translateY(-8px)',
      boxShadow: '0 12px 30px rgba(26, 54, 93, 0.15)',
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
    boxShadow: '0 4px 20px rgba(26, 54, 93, 0.1)',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid rgba(49, 130, 206, 0.1)',
  },
  modal: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    bgcolor: 'background.paper',
    borderRadius: '12px',
    boxShadow: '0 12px 30px rgba(26, 54, 93, 0.15)',
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
    scrollbarColor: `${theme.palette.primary.light} ${theme.palette.background.default}`,
    overflowY: 'scroll',
  },
  body: {
    overflowY: 'scroll !important', // 항상 스크롤바 표시
    background: theme.palette.background.default,
  },
  '*::-webkit-scrollbar': {
    width: '8px',
    height: '8px',
  },
  '*::-webkit-scrollbar-track': {
    background: theme.palette.background.default,
  },
  '*::-webkit-scrollbar-thumb': {
    backgroundColor: theme.palette.primary.light,
    borderRadius: '4px',
  },
  '*::-webkit-scrollbar-thumb:hover': {
    backgroundColor: theme.palette.primary.main,
  },
});

export default commonStyles;
export { globalStyles };