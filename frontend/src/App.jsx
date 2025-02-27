import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import adminRoutes from './routes/adminRoutes';
// ... other imports

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      // ... existing routes ...
      ...adminRoutes, // 관리자 라우트 추가
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App; 