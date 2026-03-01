// src/pages/LoginPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Dispatches the login thunk with { email, password }.
//
// Token management
// ────────────────
//   The authSlice.login thunk calls persistAuth(token, user) on success,
//   mirroring the token to localStorage automatically — no extra work needed
//   here. The axiosInstance request interceptor then picks it up on every
//   subsequent call so the user stays logged in after a page refresh.
//
// Redirect logic
// ──────────────
//   A useEffect watches isAuthenticated. Once true it redirects:
//     admin → /admin/dashboard
//     guest → location.state.from (the page they tried to reach) or /rooms
//
//   The redirect happens AFTER the fulfilled action updates Redux state, so
//   the user is never sent away before the token is persisted.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector }    from 'react-redux';
import { useNavigate, useLocation }    from 'react-router-dom';
import {
  login,
  clearError,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
  selectUser,
} from '../store/slices/authSlice';
import AuthLayout from '../components/auth/AuthLayout';

// ─────────────────────────────────────────────────────────────────────────────
const LoginPage = () => {
  const dispatch        = useDispatch();
  const navigate        = useNavigate();
  const location        = useLocation();

  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading         = useSelector(selectAuthLoading);
  const error           = useSelector(selectAuthError);
  const user            = useSelector(selectUser);

  const [form, setForm]             = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched]       = useState({});

  // ── Redirect once authenticated ───────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    // Respect the "from" location stored by ProtectedRoute / AdminRoute
    const from = location.state?.from?.pathname;
    if (user?.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    } else {
      navigate(from ?? '/rooms', { replace: true });
    }
  }, [isAuthenticated, user, navigate, location.state]);

  // ── Clear stale errors when the component unmounts ────────────────────────
  useEffect(() => {
    return () => { dispatch(clearError()); };
  }, [dispatch]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    dispatch(clearError());
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleBlur = (e) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!form.email.trim() || !form.password) return;
    dispatch(login({ email: form.email.trim(), password: form.password }));
  };

  // ── Client-side field validation messages ────────────────────────────────
  const emailError    = touched.email    && !form.email.trim()    ? 'Email is required.'    : '';
  const passwordError = touched.password && !form.password        ? 'Password is required.' : '';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account"
      footerText="Don't have an account?"
      footerLinkTo="/register"
      footerLinkLabel="Create one"
    >
      <form
        className="auth-form"
        onSubmit={handleSubmit}
        noValidate
        aria-label="Login form"
      >
        {/* ── Backend error banner ──────────────────────────────────────── */}
        {error && (
          <div className="auth-form__error" role="alert">
            <span>{error}</span>
            <button
              type="button"
              className="auth-form__error-close"
              onClick={() => dispatch(clearError())}
              aria-label="Dismiss error"
            >✕</button>
          </div>
        )}

        {/* ── Email ─────────────────────────────────────────────────────── */}
        <div className={`form-group ${emailError ? 'form-group--error' : ''}`}>
          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            onBlur={handleBlur}
            autoComplete="email"
            placeholder="you@example.com"
            aria-describedby={emailError ? 'login-email-err' : undefined}
            aria-invalid={!!emailError}
            required
          />
          {emailError && (
            <span id="login-email-err" className="form-group__error-msg" role="alert">
              {emailError}
            </span>
          )}
        </div>

        {/* ── Password ──────────────────────────────────────────────────── */}
        <div className={`form-group ${passwordError ? 'form-group--error' : ''}`}>
          <div className="form-group__label-row">
            <label htmlFor="login-password">Password</label>
          </div>
          <div className="form-group__input-wrap">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={form.password}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="current-password"
              placeholder="••••••••"
              aria-describedby={passwordError ? 'login-pw-err' : undefined}
              aria-invalid={!!passwordError}
              required
            />
            <button
              type="button"
              className="form-group__pw-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          {passwordError && (
            <span id="login-pw-err" className="form-group__error-msg" role="alert">
              {passwordError}
            </span>
          )}
        </div>

        {/* ── Submit ────────────────────────────────────────────────────── */}
        <button
          type="submit"
          className="btn btn--primary btn--full"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? (
            <>
              <span className="hms-spinner hms-spinner--sm" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
