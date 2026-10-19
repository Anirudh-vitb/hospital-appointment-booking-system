import { Navigate, Outlet } from 'react-router-dom';
import useAuth, { HOME_FOR_ROLE } from '../hooks/useAuth.js';
import ProtectedRoute from './ProtectedRoute.jsx';

// Shows a section only to the listed roles. This only improves navigation —
// the Express API checks the role again on every request.
export default function RoleBasedRoute({ roles }) {
  const { user } = useAuth();
  return (
    <ProtectedRoute>
      {user && !roles.includes(user.role) ? <Navigate to={HOME_FOR_ROLE[user.role]} replace /> : <Outlet />}
    </ProtectedRoute>
  );
}
