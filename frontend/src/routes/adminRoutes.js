import PerformanceMonitor from '../components/monitoring/PerformanceMonitor';

const adminRoutes = [
  {
    path: '/admin/monitoring',
    element: <PerformanceMonitor />,
    label: '성능 모니터링'
  }
];

export default adminRoutes; 