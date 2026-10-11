import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore } from '../../store/authStore.js';
import { FullScreenSpinner } from '../ui/Spinner.jsx';

const isPending = (status) => status === 'idle' || status === 'loading';

// Signed-in users only; everyone else goes to /login and comes back afterwards.
export function ProtectedRoute() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (isPending(status)) return <FullScreenSpinner />;
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

// Login/register pages: signed-in users are sent on to where they were going.
export function GuestRoute() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (isPending(status)) return <FullScreenSpinner />;
  if (status === 'authenticated') {
    const from = location.state?.from?.pathname ?? '/';
    return <Navigate to={from} replace />;
  }
  return <Outlet />;
}
