// src/pages/RegisterPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Dispatches the register thunk with { name, email, password, phone, role }.
//
// Role selection is limited to 'guest' only in the public form — admin
// accounts are created server-side or through a separate admin flow.
// The role field is kept in state but hidden from the UI so the form remains
// simple while still sending the correct value to the backend.
//
// On successful registration the authSlice.register thunk calls persistAuth,
// mirroring the token to localStorage. The useEffect redirect fires once
// isAuthenticated flips to true — same pattern as LoginPage.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector }    from 'react-redux';
import { useNavigate, useLocation }    from 'react-router-dom';
import {
  register,
  clearError,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
  selectUser,
} from '../store/slices/authSlice';
import AuthLayout from '../components/auth/AuthLayout';

// ── Client-side field validators ──────────────────────────────────────────────
const validators = {
  name:     (v) => v.trim().length < 2  ? 'Full name must be at least 2 characters.' : '',
  email:    (v) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? 'Enter a valid email address.' : '',
  password: (v) => v.length < 6        ? 'Password must be at least 6 characters.' : '',
  phone:    (v) => v && !/^\+?[\d\s\-()]{7,15}$/.test(v) ? 'Enter a valid phone number.' : '',
};

const validate = (form) => ({
  name:     validators.name(form.name),
  email:    validators.email(form.email),
  password: validators.password(form.password),
  phone:    validators.phone(form.phone),
});

// ─────────────────────────────────────────────────────────────────────────────
const RegisterPage = () => {
  const dispatch        = useDispatch();
  const navigate        = useNavigate();
  const location        = useLocation();

  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading         = useSelector(selectAuthLoading);
  const error           = useSelector(selectAuthError);
  const user            = useSelector(selectUser);

  const [form, setForm] = useState({
    name:     '',
    email:    '',
    password: '',
    phone:    '',
    role:     'guest',      // hardcoded — public registration is guest-only
  });
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched]           = useState({});
  const [fieldErrors, setFieldErrors]   = useState({});

  // ── Redirect once registered & authenticated ──────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    const from = location.state?.from?.pathname;
    navigate(user?.role === 'admin' ? '/admin/dashboard' : (from ?? '/rooms'), {
      replace: true,
    });
  }, [isAuthenticated, user, navigate, location.state]);

  // ── Clear stale backend error on unmount ──────────────────────────────────
  useEffect(() => {
    return () => { dispatch(clearError()); };
  }, [dispatch]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    dispatch(clearError());
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Live-validate touched fields
    if (touched[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: validators[name]?.(value) ?? '' }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setFieldErrors((prev) => ({ ...prev, [name]: validators[name]?.(value) ?? '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Mark all fields touched and run full validation
    const allTouched = { name: true, email: true, password: true, phone: true };
    setTouched(allTouched);
    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    dispatch(
      register({
        name:     form.name.trim(),
        email:    form.email.trim(),
        password: form.password,
        phone:    form.phone.trim() || undefined,
        role:     form.role,
      })
    );
  };

  // ── Helper: get the error for a field only after it's been touched ────────
  const fieldErr = (name) => (touched[name] ? fieldErrors[name] : '');

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join HMS and manage your bookings"
      footerText="Already have an account?"
      footerLinkTo="/login"
      footerLinkLabel="Sign in"
    >
      <form
        className="auth-form"
        onSubmit={handleSubmit}
        noValidate
        aria-label="Registration form"
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

        {/* ── Full name ─────────────────────────────────────────────────── */}
        <div className={`form-group ${fieldErr('name') ? 'form-group--error' : ''}`}>
          <label htmlFor="reg-name">Full Name</label>
          <input
            id="reg-name"
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            onBlur={handleBlur}
            autoComplete="name"
            placeholder="Jane Smith"
            aria-describedby={fieldErr('name') ? 'reg-name-err' : undefined}
            aria-invalid={!!fieldErr('name')}
            required
          />
          {fieldErr('name') && (
            <span id="reg-name-err" className="form-group__error-msg" role="alert">
              {fieldErr('name')}
            </span>
          )}
        </div>

        {/* ── Email ─────────────────────────────────────────────────────── */}
        <div className={`form-group ${fieldErr('email') ? 'form-group--error' : ''}`}>
          <label htmlFor="reg-email">Email Address</label>
          <input
            id="reg-email"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            onBlur={handleBlur}
            autoComplete="email"
            placeholder="you@example.com"
            aria-describedby={fieldErr('email') ? 'reg-email-err' : undefined}
            aria-invalid={!!fieldErr('email')}
            required
          />
          {fieldErr('email') && (
            <span id="reg-email-err" className="form-group__error-msg" role="alert">
              {fieldErr('email')}
            </span>
          )}
        </div>

        {/* ── Password ──────────────────────────────────────────────────── */}
        <div className={`form-group ${fieldErr('password') ? 'form-group--error' : ''}`}>
          <label htmlFor="reg-password">Password</label>
          <div className="form-group__input-wrap">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={form.password}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              aria-describedby={fieldErr('password') ? 'reg-pw-err' : undefined}
              aria-invalid={!!fieldErr('password')}
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
          {fieldErr('password') && (
            <span id="reg-pw-err" className="form-group__error-msg" role="alert">
              {fieldErr('password')}
            </span>
          )}
        </div>

        {/* ── Phone (optional) ──────────────────────────────────────────── */}
        <div className={`form-group ${fieldErr('phone') ? 'form-group--error' : ''}`}>
          <label htmlFor="reg-phone">
            Phone <span className="form-group__optional">(optional)</span>
          </label>
          <input
            id="reg-phone"
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            onBlur={handleBlur}
            autoComplete="tel"
            placeholder="+1 555 000 0000"
            aria-describedby={fieldErr('phone') ? 'reg-phone-err' : undefined}
            aria-invalid={!!fieldErr('phone')}
          />
          {fieldErr('phone') && (
            <span id="reg-phone-err" className="form-group__error-msg" role="alert">
              {fieldErr('phone')}
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
              Creating account…
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;
