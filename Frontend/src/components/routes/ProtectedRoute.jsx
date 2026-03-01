// src/components/routes/ProtectedRoute.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Guards any route that requires a logged-in user regardless of role.
//
// Behaviour
// ─────────
//   • Reads isAuthenticated and loading from the Redux auth slice.
//   • While the auth state is still being validated (e.g. getMe in-flight on
//     first mount) it renders a full-page spinner instead of redirecting — this
//     prevents a flash-redirect to /login for users who are actually logged in.
//   • Once loading is false:
//       – authenticated  → renders <Outlet /> (the child route)
//       – unauthenticated → <Navigate to="/login" /> carrying the original
//         pathname in location.state.from so the login page can redirect back.
//
// Usage (in your router)
// ──────────────────────
//   <Route element={<ProtectedRoute />}>
//     <Route path="/dashboard" element={<Dashboard />} />
//     <Route path="/bookings"  element={<MyBookings />} />
//   </Route>
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  selectIsAuthenticated,
  selectAuthLoading,
} from '../../store/slices/authSlice';

const ProtectedRoute = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading         = useSelector(selectAuthLoading);
  const location        = useLocation();

  // ── Still resolving the stored token against the backend ──────────────────
  // Avoid a premature redirect while getMe is in-flight on first mount.
  if (loading) {
    return (
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          minHeight:      '100vh',
        }}
        aria-label="Verifying session…"
      >
        {/* Replace with your project's Spinner component if available */}
        <span className="hms-spinner" />
      </div>
    );
  }

  // ── Not authenticated → redirect to login ─────────────────────────────────
  // Preserve the attempted URL in state.from so the login page can send
  // the user back after successful authentication.
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // ── Authenticated → render the child route ────────────────────────────────
  return <Outlet />;
};

export default ProtectedRoute;
