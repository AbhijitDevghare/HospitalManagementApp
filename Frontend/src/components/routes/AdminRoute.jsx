// src/components/routes/AdminRoute.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Guards any route that requires the authenticated user to have role 'admin'.
// Composes on top of the authentication check — an unauthenticated visitor
// is sent to /login; an authenticated non-admin is sent to /unauthorized.
//
// Behaviour
// ─────────
//   • Reads isAuthenticated, user, and loading from the Redux auth slice.
//   • While loading → full-page spinner (same pattern as ProtectedRoute).
//   • Once loading is false:
//       – unauthenticated          → <Navigate to="/login" />
//       – authenticated, non-admin → <Navigate to="/unauthorized" />
//       – authenticated, admin     → renders <Outlet />
//
// Usage (in your router)
// ──────────────────────
//   <Route element={<AdminRoute />}>
//     <Route path="/admin/staff"     element={<StaffManagement />} />
//     <Route path="/admin/inventory" element={<InventoryPage />} />
//     <Route path="/admin/rooms"     element={<RoomManagement />} />
//   </Route>
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  selectIsAuthenticated,
  selectUser,
  selectAuthLoading,
} from '../../store/slices/authSlice';

const AdminRoute = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user            = useSelector(selectUser);
  const loading         = useSelector(selectAuthLoading);
  const location        = useLocation();

  // ── Still resolving the stored token against the backend ──────────────────
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
        <span className="hms-spinner" />
      </div>
    );
  }

  // ── Not authenticated → redirect to login ─────────────────────────────────
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // ── Authenticated but not an admin → redirect to /unauthorized ────────────
  // Sending to a dedicated page (rather than silently to /dashboard) lets you
  // show a clear "Access Denied" message and avoids confusing UX.
  if (user?.role !== 'admin') {
    return (
      <Navigate
        to="/unauthorized"
        state={{ from: location }}
        replace
      />
    );
  }

  // ── Authenticated admin → render the child route ──────────────────────────
  return <Outlet />;
};

export default AdminRoute;
