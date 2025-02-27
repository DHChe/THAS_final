import React, { useState, useEffect } from 'react';
import {
  Box,
  CircularProgress,
  Alert,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { fetchHRSummary } from '../../services/api';

// 차트 색상
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const DepartmentChart = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [chartType, setChartType] = useState('department'); // department or position

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const summary = await fetchHRSummary();
        
        // 데이터 형식 변환
        const transformData = (dataObj) => {
          return Object.entries(dataObj).map(([name, value]) => ({
            name,
            value
          }));
        };

        setData({
          department: transformData(summary.department_stats),
          position: transformData(summary.position_stats)
        });
        
        setError(null);
      } catch (err) {
        setError('데이터 로드 중 오류가 발생했습니다.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box sx={{ height: 400 }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          {chartType === 'department' ? '부서별 인원' : '직급별 인원'}
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>보기 기준</InputLabel>
          <Select
            value={chartType}
            label="보기 기준"
            onChange={(e) => setChartType(e.target.value)}
          >
            <MenuItem value="department">부서별</MenuItem>
            <MenuItem value="position">직급별</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data[chartType]}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data[chartType].map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [`${value}명`, name]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default DepartmentChart;