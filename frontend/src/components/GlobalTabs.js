import React, { useState, useEffect, useRef } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Tabs, 
  Tab, 
  Button, 
  Box, 
  IconButton, 
  Menu, 
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  useMediaQuery,
  Fade,
  Tooltip,
  Badge,
  Popper,
  Paper,
  ClickAwayListener,
  Grow,
  MenuList,
  Collapse
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../styles/theme';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PaymentsIcon from '@mui/icons-material/Payments';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AssessmentIcon from '@mui/icons-material/Assessment';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SettingsIcon from '@mui/icons-material/Settings';

const GlobalTabs = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [elevated, setElevated] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [openMobileSubmenu, setOpenMobileSubmenu] = useState(null);
  const anchorRefs = useRef({});

  // 메인 탭과 아이콘을 함께 관리 (하위 메뉴 추가)
  const mainTabs = [
    {
      label: '임금관리',
      path: '/payroll/management',
      icon: <PaymentsIcon fontSize="small" />,
      subMenu: [
        { label: '임금관리', path: '/payroll/management' },
        { label: '임금 지급 관리', path: '/payroll/payment' },
        { label: 'AI 분석', path: '/payroll/analysis' }
      ]
    },
    { label: '인사관리', path: '/hr', icon: <PeopleIcon fontSize="small" /> },
    { label: '재고관리', path: '/inventory', icon: <InventoryIcon fontSize="small" /> },
  ];

  // 스크롤 위치 추적
  useEffect(() => {
    const handleScroll = () => {
      const position = window.pageYOffset;
      setScrollPosition(position);
      setElevated(position > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 경로에 따른 현재 탭 설정
  let tabValue = 0; // 기본값을 0으로 설정
  if (location.pathname === '/') {
    tabValue = 0;
  } else if (location.pathname.startsWith('/payroll')) {
    tabValue = 0; // 임금관리 탭
  } else if (location.pathname.startsWith('/hr')) {
    tabValue = 1; // 인사관리 탭
  } else if (location.pathname.startsWith('/inventory')) {
    tabValue = 2; // 재고관리 탭
  }

  const handleTabClick = (event, newValue) => {
    // newValue가 문자열인 경우 (서브메뉴 경로)
    if (typeof newValue === 'string') {
      navigate(newValue);
      return;
    }
    
    // newValue가 숫자인 경우 (메인 탭)
    const selectedTab = mainTabs[newValue];
    if (selectedTab) {
      navigate(selectedTab.path);
    }
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
    handleMenuClose();
  };

  // 모바일 드로어 토글
  const toggleMobileDrawer = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  // 드롭다운 메뉴 처리
  const handleMenuToggle = (path) => {
    // 이미 열린 메뉴인 경우 닫기, 아니면 열기
    setOpenMenu(prevOpenMenu => prevOpenMenu === path ? null : path);
  };

  const handleMenuClose = () => {
    setOpenMenu(null);
  };

  // 모바일 서브메뉴 토글
  const toggleMobileSubmenu = (path) => {
    setOpenMobileSubmenu(openMobileSubmenu === path ? null : path);
  };

  // 데스크톱 탭 렌더링
  const renderDesktopTab = (tab, index) => {
    const hasSubMenu = tab.subMenu && tab.subMenu.length > 0;
    
    return (
      <Box 
        key={tab.path} 
        ref={(el) => anchorRefs.current[tab.path] = el}
        sx={{ 
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center'
        }}
        onMouseEnter={() => hasSubMenu && handleMenuToggle(tab.path)}
        onMouseLeave={() => {
          if (hasSubMenu) {
            setTimeout(() => {
              const menuElement = document.getElementById(`menu-${tab.path}`);
              const isMouseOverMenu = menuElement && menuElement.matches(':hover');
              if (!isMouseOverMenu) {
                handleMenuClose();
              }
            }, 100);
          }
        }}
      >
        <Tab
          value={index}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {tab.icon}
              <span>{tab.label}</span>
              {hasSubMenu && <KeyboardArrowDownIcon fontSize="small" sx={{ 
                ml: 0.5, 
                transition: 'transform 0.3s',
                transform: openMenu === tab.path ? 'rotate(180deg)' : 'rotate(0)'
              }} />}
            </Box>
          }
          onClick={(e) => {
            if (hasSubMenu) {
              e.preventDefault();
              e.stopPropagation();
              handleMenuToggle(tab.path);
            } else {
              handleTabClick(e, index);
            }
          }}
          sx={{
            textTransform: 'none',
            fontSize: '0.95rem',
            fontWeight: 600,
            minWidth: '110px',
            color: theme.palette.text.primary,
            transition: 'all 0.2s ease',
            borderRadius: '4px 4px 0 0',
            '&:hover': {
              color: theme.palette.primary.main,
              backgroundColor: 'rgba(26, 54, 93, 0.04)',
            },
            '&.Mui-selected': {
              color: theme.palette.primary.main,
              fontWeight: 700,
            },
            padding: '10px 16px',
          }}
        />
        {hasSubMenu && (
          <Popper
            id={`menu-${tab.path}`}
            open={openMenu === tab.path}
            anchorEl={anchorRefs.current[tab.path]}
            placement="bottom-start"
            transition
            modifiers={[
              {
                name: 'offset',
                options: {
                  offset: [0, 8],
                },
              },
              {
                name: 'preventOverflow',
                enabled: true,
                options: {
                  altAxis: true,
                  padding: 8
                }
              }
            ]}
            sx={{ 
              zIndex: 9999,
              position: 'absolute'
            }}
            onMouseEnter={() => setOpenMenu(tab.path)}
            onMouseLeave={() => handleMenuClose()}
          >
            {({ TransitionProps }) => (
              <Grow
                {...TransitionProps}
                style={{ transformOrigin: 'top left' }}
              >
                <Paper 
                  elevation={3}
                  sx={{ 
                    mt: 1,
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #F7FAFC 100%)',
                    boxShadow: '0 8px 16px rgba(26, 54, 93, 0.15)',
                    minWidth: 200
                  }}
                >
                  <ClickAwayListener onClickAway={handleMenuClose}>
                    <MenuList 
                      autoFocusItem={openMenu === tab.path} 
                      sx={{ py: 1 }}
                    >
                      {tab.subMenu.map((subItem) => (
                        <MenuItem 
                          key={subItem.path} 
                          onClick={(e) => {
                            e.stopPropagation(); // 이벤트 버블링 방지
                            navigate(subItem.path); // 직접 navigate 호출
                            handleMenuClose();
                          }}
                          sx={{
                            py: 1.5,
                            px: 2,
                            '&:hover': {
                              backgroundColor: 'rgba(26, 54, 93, 0.04)',
                            },
                          }}
                        >
                          {subItem.label}
                        </MenuItem>
                      ))}
                    </MenuList>
                  </ClickAwayListener>
                </Paper>
              </Grow>
            )}
          </Popper>
        )}
      </Box>
    );
  };

  // 모바일 메뉴 렌더링
  const renderMobileMenu = () => (
    <Drawer
      anchor="right"
      open={mobileDrawerOpen}
      onClose={toggleMobileDrawer}
      PaperProps={{
        sx: {
          width: '250px',
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F7FAFC 100%)',
          borderLeft: '1px solid rgba(26, 54, 93, 0.1)',
          boxShadow: '0 0 20px rgba(26, 54, 93, 0.1)',
          paddingTop: '1rem'
        }
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        px: 2, 
        pb: 2
      }}>
        <Box sx={{ 
          fontWeight: 800, 
          fontSize: '1.5rem', 
          color: theme.palette.primary.main
        }}>
          THAS
        </Box>
        <IconButton 
          onClick={toggleMobileDrawer} 
          sx={{ color: theme.palette.primary.main }}
        >
          <CloseIcon />
        </IconButton>
      </Box>
      
      <List sx={{ pt: 1 }}>
        {mainTabs.map((tab) => (
          <React.Fragment key={tab.path}>
            <ListItem 
              onClick={tab.subMenu && tab.subMenu.length > 0 ? 
                () => toggleMobileSubmenu(tab.path) : 
                () => handleTabClick(null, tab.path)
              }
              button
              selected={tabValue === tab.path}
              sx={{
                my: 0.5,
                mx: 1,
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                bgcolor: tabValue === tab.path ? 'rgba(26, 54, 93, 0.08)' : 'transparent',
                '&:hover': {
                  bgcolor: 'rgba(26, 54, 93, 0.12)',
                },
                '&.Mui-selected': {
                  bgcolor: 'rgba(26, 54, 93, 0.08)',
                }
              }}
            >
              <ListItemIcon sx={{ 
                minWidth: 40, 
                color: tabValue === tab.path ? theme.palette.primary.main : theme.palette.text.secondary 
              }}>
                {tab.icon}
              </ListItemIcon>
              <ListItemText 
                primary={tab.label} 
                primaryTypographyProps={{
                  fontWeight: tabValue === tab.path ? 700 : 500,
                  color: tabValue === tab.path ? theme.palette.primary.main : theme.palette.text.primary
                }}
              />
              {tab.subMenu && tab.subMenu.length > 0 && (
                <KeyboardArrowDownIcon sx={{ 
                  transition: 'transform 0.3s',
                  transform: openMobileSubmenu === tab.path ? 'rotate(180deg)' : 'rotate(0)' 
                }} />
              )}
            </ListItem>
            
            {tab.subMenu && tab.subMenu.length > 0 && (
              <Collapse in={openMobileSubmenu === tab.path} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {tab.subMenu.map((subItem) => (
                    <ListItem 
                      key={subItem.path}
                      button
                      onClick={() => handleTabClick(null, subItem.path)}
                      sx={{
                        py: 1,
                        pl: 6,
                        pr: 2,
                        mx: 1,
                        borderRadius: '8px',
                        '&:hover': {
                          bgcolor: 'rgba(26, 54, 93, 0.08)',
                        }
                      }}
                    >
                      <ListItemIcon sx={{ 
                        minWidth: 35,
                        color: theme.palette.primary.main
                      }}>
                        {subItem.icon}
                      </ListItemIcon>
                      <ListItemText 
                        primary={subItem.label} 
                        primaryTypographyProps={{ 
                          fontSize: '0.9rem',
                          fontWeight: 500
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            )}
          </React.Fragment>
        ))}
        
        <ListItem 
          button
          onClick={() => handleTabClick(null, '/dashboard')}
          sx={{
            mt: 2,
            mx: 1,
            borderRadius: '8px',
            bgcolor: theme.palette.primary.main,
            color: '#fff',
            '&:hover': {
              bgcolor: theme.palette.primary.dark,
            }
          }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: '#fff' }}>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText 
            primary="대시보드" 
            primaryTypographyProps={{
              fontWeight: 700
            }}
          />
        </ListItem>
      </List>
    </Drawer>
  );

  return (
    <ThemeProvider theme={theme}>
      <AppBar 
        position="sticky" 
        elevation={elevated ? 2 : 0}
        sx={{ 
          background: 'rgba(255, 255, 255, 0.98)', 
          backdropFilter: 'blur(10px)',
          boxShadow: elevated ? 
            '0 4px 20px rgba(26, 54, 93, 0.08)' : 
            '0 1px 0 rgba(26, 54, 93, 0.08)',
          transition: 'all 0.3s ease'
        }}
      >
        <Toolbar sx={{ 
          padding: { xs: '0 16px', md: '0 24px' },
          height: { xs: '60px', md: '68px' },
          transition: 'height 0.3s ease'
        }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mr: 4,
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              '&:hover': {
                transform: 'scale(1.03)',
              }
            }}
            onClick={() => navigate('/')}
          >
            <Box
              component="img"
              src="/logo.png"
              alt="THAS Logo"
              sx={{
                height: 36,
                cursor: 'pointer',
                mr: 1,
                display: { xs: 'none', sm: 'block' }
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <Box 
              component="div" 
              sx={{ 
                fontWeight: 800, 
                fontSize: { xs: '1.3rem', md: '1.5rem' }, 
                color: theme.palette.primary.main,
                cursor: 'pointer',
                letterSpacing: '-0.02em',
              }}
            >
              THAS
            </Box>
          </Box>
          
          {!isMobile ? (
            // 데스크톱 메뉴
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
              <Tabs
                value={tabValue}
                onChange={handleTabClick}
                TabIndicatorProps={{
                  style: {
                    height: '3px',
                    borderRadius: '3px 3px 0 0',
                    background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }
                }}
                sx={{
                  '& .MuiTabs-flexContainer': {
                    gap: 2,
                  }
                }}
              >
                {mainTabs.map((tab, index) => renderDesktopTab(tab, index))}
              </Tabs>
            </Box>
          ) : null}
          
          {/* 대시보드 버튼 - 데스크톱 */}
          {!isMobile && (
            <Tooltip title="대시보드" arrow placement="bottom">
              <Button
                variant="contained"
                startIcon={<DashboardIcon />}
                onClick={() => handleTabClick(null, '/dashboard')}
                sx={{
                  padding: '10px 18px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  borderRadius: '10px',
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                  boxShadow: '0 4px 10px rgba(26, 54, 93, 0.25)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 15px rgba(26, 54, 93, 0.3)',
                    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                  }
                }}
              >
                대시보드
              </Button>
            </Tooltip>
          )}
          
          {/* 모바일 메뉴 버튼 */}
          {isMobile && (
            <IconButton 
              edge="end" 
              color="primary" 
              onClick={toggleMobileDrawer}
              sx={{ 
                ml: 'auto',
                backgroundColor: 'rgba(26, 54, 93, 0.05)',
                '&:hover': {
                  backgroundColor: 'rgba(26, 54, 93, 0.1)',
                }
              }}
            >
              <MenuIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>
      
      {/* 모바일 메뉴 */}
      {renderMobileMenu()}
    </ThemeProvider>
  );
};

export default GlobalTabs;