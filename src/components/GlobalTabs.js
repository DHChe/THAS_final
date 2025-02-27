import React from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const GlobalTabs = ({ menuItems, tabValue, handleTabChange }) => {
  const navigate = useNavigate();

  return (
    <Box sx={{ 
      borderBottom: 1, 
      borderColor: 'divider', 
      position: 'sticky', 
      top: 0, 
      bgcolor: 'background.paper', 
      zIndex: 1, 
      borderRadius: '10px',
      minHeight: '34px'  // 추가된 스타일 (기본 높이의 70%로 조정)
    }}>
      <Tabs 
        value={tabValue >= 0 ? tabValue : false} 
        onChange={handleTabChange}
        centered
        variant="fullWidth"
        sx={{
          minHeight: '34px',  // Tabs 컴포넌트 높이 조정
          '& .MuiTab-root': {  // 개별 탭 아이템 스타일
            minHeight: '34px',
            padding: '6px 12px',
            fontSize: '0.8rem'
          }
        }}
      >
        {menuItems.map((item, index) => (
          <Tab 
            key={index}
            icon={item.icon} 
            label={item.title}
            onClick={() => navigate(item.path)}
            sx={{ 
              '& .MuiSvgIcon-root': {  // 아이콘 크기 조정
                fontSize: '1.2rem'
              }
            }}
          />
        ))}
      </Tabs>
    </Box>
  );
};

export default GlobalTabs;
