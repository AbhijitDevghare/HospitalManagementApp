// src/App.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Root router. Lazy-loads heavy page components so the auth pages ship in
// the initial bundle while dashboard/admin pages are code-split.
//
// Route structure
// ───────────────
//   Public
//     /login          LoginPage
//     /register       RegisterPage
//     /unauthorized   UnauthorizedPage
//     /rooms          RoomGalleryPage  (public — optionalAuthenticate)
//
//   Protected (any logged-in user)
//     /bookings        BookingPage
//     /dashboard       GuestDashboard  (placeholder)
//
//   Admin-only
//     /admin/dashboard  AdminDashboardPage
//     …more admin routes go here
//
//   Catch-all → /login
// ─────────────────────────────────────────────────────────────────────────────
import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate }          from 'react-router-dom';
import { useDispatch, useSelector }         from 'react-redux';
import { getMe, selectIsAuthenticated }     from './store/slices/authSlice';
import { ProtectedRoute, AdminRoute }       from './components/routes';
import Navbar                               from './components/layout/Navbar';
import { Toaster }                         from 'react-hot-toast';

// ── Eagerly loaded (small, always needed) ─────────────────────────────────────
import LoginPage        from './pages/LoginPage';
import RegisterPage     from './pages/RegisterPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import AdminBookingsPage from './pages/AdminBookingsPage';

// ── Lazy-loaded (code-split) ──────────────────────────────────────────────────
const BookingPage          = lazy(() => import('./pages/BookingPage'));
const BookingDetailPage    = lazy(() => import('./pages/BookingDetailPage'));
const InvoicePage          = lazy(() => import('./pages/InvoicePage'));
const AdminDashboardPage   = lazy(() => import('./pages/AdminDashboardPage'));
const RoomGalleryPage      = lazy(() => import('./pages/RoomGalleryPage'));
const RoomDetailPage       = lazy(() => import('./pages/RoomDetailPage'));
const PaymentPage          = lazy(() => import('./pages/PaymentPage'));
const BookingFormPage      = lazy(() => import('./pages/BookingFormPage'));
const MaintenancePage          = lazy(() => import('./pages/admin/MaintenancePage'));
const StockMonitorPage         = lazy(() => import('./pages/admin/StockMonitorPage'));
const StaffManagementPage      = lazy(() => import('./pages/admin/StaffManagementPage'));
const RoomManagementPage       = lazy(() => import('./pages/admin/RoomManagementPage'));
const ServicesManagementPage   = lazy(() => import('./pages/admin/ServicesManagementPage'));
const AdminBookingFormPage     = lazy(() => import('./pages/admin/AdminBookingFormPage'));
const AdminInvoicePage         = lazy(() => import('./pages/admin/AdminInvoicePage'));

// Thin spinner used during lazy-load suspense boundaries
const PageSpinner = () => (
  <div
    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}
    aria-label="Loading page…"
  >
    <span className="hms-spinner" />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
const App = () => {
  const dispatch        = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // ── Rehydrate session on first mount ────────────────────────────────────
  // If a token exists in localStorage (from a previous login), getMe validates
  // it against the backend and refreshes the Redux user object.
  // ProtectedRoute / AdminRoute show a spinner while this is in-flight so no
  // premature redirects occur.
  useEffect(() => {
    const token = localStorage.getItem('hms_token');
    if (token) {
      dispatch(getMe());
    }
  }, [dispatch]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Suspense fallback={<PageSpinner />}>
      {/* Navbar persists across every route — auth pages included */}
      <Navbar />

      <div className="app-content">
        <Routes>

        {/* ── Public routes ───────────────────────────────────────────── */}
        <Route
          path="/login"
          element={
            // Already logged in → skip the login page entirely
            isAuthenticated ? <Navigate to="/rooms" replace /> : <LoginPage />
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? <Navigate to="/rooms" replace /> : <RegisterPage />
          }
        />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/rooms"        element={<RoomGalleryPage />} />
        <Route path="/rooms/:id"    element={<RoomDetailPage />} />

        {/* ── Protected routes (any authenticated user) ───────────────── */}
        <Route element={<ProtectedRoute />}>
          <Route path="/bookings"              element={<BookingPage />} />
          <Route path="/bookings/:id"          element={<BookingDetailPage />} />
          <Route path="/bookings/:bookingId/invoice" element={<InvoicePage />} />
          <Route path="/book"                  element={<BookingFormPage />} />
          <Route path="/payment"         element={<PaymentPage />} />
          {/* Add more guest-accessible routes here */}
        </Route>

        {/* ── Admin-only routes ────────────────────────────────────────── */}
        <Route element={<AdminRoute />}>
          <Route path="/admin/dashboard"    element={<AdminDashboardPage />} />
          <Route path="/admin/maintenance"  element={<MaintenancePage />} />
          <Route path="/admin/inventory"    element={<StockMonitorPage />} />
          <Route path="/admin/staff"        element={<StaffManagementPage />} />
          <Route path="/admin/rooms"        element={<RoomManagementPage />} />
          <Route path="/admin/services"     element={<ServicesManagementPage />} />
          <Route path="/admin/bookings/new" element={<AdminBookingFormPage />} />
          <Route path="/admin/invoices"     element={<AdminInvoicePage />} />
          <Route path="/admin/bookings" element={<AdminBookingsPage />} />
        </Route>

        {/* ── Default / catch-all ──────────────────────────────────────── */}
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? '/rooms' : '/login'} replace />}
        />
        <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { fontSize: '0.875rem', fontFamily: "'Segoe UI', sans-serif" },
          success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </Suspense>
  );
};

export default App;
