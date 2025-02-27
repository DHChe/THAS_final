import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableRow,
  IconButton,
  Tooltip
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip } from 'recharts';
import RefreshIcon from '@mui/icons-material/Refresh';
import { performanceMonitor } from '../../utils/performanceMonitor';

const PerformanceMonitor = () => {
  const [metrics, setMetrics] = useState(null);
  const [showChart, setShowChart] = useState(false);

  const updateMetrics = () => {
    const currentMetrics = performanceMonitor.getAverageMetrics();
    setMetrics(currentMetrics);
  };

  useEffect(() => {
    updateMetrics();
    const interval = setInterval(updateMetrics, 5000); // 5초마다 갱신
    return () => clearInterval(interval);
  }, []);

  const formatTime = (ms) => `${ms.toFixed(2)}ms`;
  const formatMemory = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)}MB`;

  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">성능 모니터링</Typography>
        <Tooltip title="새로고침">
          <IconButton onClick={updateMetrics}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {metrics && (
        <>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>지표</TableCell>
                <TableCell align="right">평균값</TableCell>
                <TableCell align="right">임계값</TableCell>
                <TableCell align="right">상태</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>데이터 로드</TableCell>
                <TableCell align="right">{formatTime(metrics.avgLoadTime)}</TableCell>
                <TableCell align="right">2000ms</TableCell>
                <TableCell align="right">
                  {metrics.avgLoadTime > 2000 ? '⚠️' : '✅'}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>데이터 파싱</TableCell>
                <TableCell align="right">{formatTime(metrics.avgParseTime)}</TableCell>
                <TableCell align="right">1000ms</TableCell>
                <TableCell align="right">
                  {metrics.avgParseTime > 1000 ? '⚠️' : '✅'}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>렌더링</TableCell>
                <TableCell align="right">{formatTime(metrics.avgRenderTime)}</TableCell>
                <TableCell align="right">500ms</TableCell>
                <TableCell align="right">
                  {metrics.avgRenderTime > 500 ? '⚠️' : '✅'}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>메모리 사용량</TableCell>
                <TableCell align="right">{formatMemory(metrics.avgMemoryUsage)}</TableCell>
                <TableCell align="right">50MB</TableCell>
                <TableCell align="right">
                  {metrics.avgMemoryUsage > 50 * 1024 * 1024 ? '⚠️' : '✅'}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </>
      )}
    </Paper>
  );
};

export default PerformanceMonitor; 