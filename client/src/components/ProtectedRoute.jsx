import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import LoadingSpinner from './LoadingSpinner.jsx';

// Sends signed-out visitors to the login page and remembers where they were
// going, so they land back on the same page after signing in.
export default function ProtectedRoute({ children }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <LoadingSpinner label="Checking your session" className="page" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children ?? <Outlet />;
}
