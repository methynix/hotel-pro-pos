import { RouteObject } from 'react-router-dom';
import App from '../App';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import TransactionManagement from '../pages/TransactionManagement';
import ExpenseManagement from '../pages/ExpenseManagement';
import AccountsManagement from '../pages/AccountsManagement';
import ReportsManagement from '../pages/ReportsManagement';
import UsersManagement from '../pages/UsersManagement';
import CategoriesManagement from '../pages/CategoriesManagement';
import Settings from '../pages/Settings';
import PrivacyPolicy from '../pages/PrivacyPolicy';
import Terms from '../pages/Terms';
import NotFound from '../pages/NotFound';
import ProtectedRoute from '../components/common/ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: <Login />,
      },
      {
        path: 'app',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'manager', 'viewer']}>
            <MainLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <Dashboard />,
          },
          {
            path: 'transactions',
            element: <TransactionManagement />,
          },
          {
            path: 'expenses',
            element: <ExpenseManagement />,
          },
          {
            path: 'accounts',
            element: <AccountsManagement />,
          },
          {
            path: 'reports',
            element: <ReportsManagement />,
          },
          {
            path: 'categories',
            element: <CategoriesManagement />,
          },
          {
            path: 'users',
            element: (
              <ProtectedRoute allowedRoles={['admin']}>
                <UsersManagement />
              </ProtectedRoute>
            ),
          },
          {
            path: 'settings',
            element: <Settings />,
          },
        ],
      },
      {
        path: 'privacy',
        element: <PrivacyPolicy />,
      },
      {
        path: 'terms',
        element: <Terms />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
];
