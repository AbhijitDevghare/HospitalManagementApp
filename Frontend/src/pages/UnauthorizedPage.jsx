// src/pages/UnauthorizedPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Shown by AdminRoute when an authenticated non-admin tries to reach an
// admin-only page. Surfaces the attempted path from location.state.from
// so the message is specific, and offers role-appropriate navigation.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector }              from 'react-redux';
import { selectUser }               from '../store/slices/authSlice';

const UnauthorizedPage = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = useSelector(selectUser);

  const attempted = location.state?.from?.pathname ?? 'that page';

  return (
    <main className="error-page" aria-labelledby="unauth-title">
      <div className="error-page__card">
        <span className="error-page__icon" aria-hidden="true">🚫</span>

        <h1 id="unauth-title" className="error-page__title">Access Denied</h1>

        <p className="error-page__body">
          Your account <strong>({user?.email ?? 'unknown'})</strong> does not have
          permission to access <code>{attempted}</code>.
        </p>
        <p className="error-page__body">
          This area is restricted to administrators. If you believe this is an
          error, please contact hotel support.
        </p>

        <div className="error-page__actions">
          <button
            className="btn btn--primary"
            onClick={() => navigate('/rooms', { replace: true })}
          >
            Browse Rooms
          </button>
          <button
            className="btn btn--ghost"
            onClick={() => navigate(-1)}
          >
            ← Go Back
          </button>
        </div>
      </div>
    </main>
  );
};

export default UnauthorizedPage;
