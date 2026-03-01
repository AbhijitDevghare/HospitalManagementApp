// src/components/auth/AuthLayout.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Shared card shell used by both LoginPage and RegisterPage.
// Keeps the two pages visually consistent without duplicating markup.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { Link } from 'react-router-dom';

const AuthLayout = ({ title, subtitle, children, footerText, footerLinkTo, footerLinkLabel }) => (
  <div className="auth-page">
    {/* Full-screen split: decorative panel + form card */}
    <div className="auth-page__brand" aria-hidden="true">
      <div className="auth-page__brand-content">
        <h1 className="auth-page__hotel-name">HMS</h1>
        <p className="auth-page__tagline">Hotel Management System</p>
      </div>
    </div>

    <div className="auth-page__form-side">
      <div className="auth-card">
        <header className="auth-card__header">
          <h2 className="auth-card__title">{title}</h2>
          {subtitle && <p className="auth-card__subtitle">{subtitle}</p>}
        </header>

        {children}

        {footerText && (
          <p className="auth-card__footer">
            {footerText}{' '}
            <Link to={footerLinkTo} className="auth-card__link">
              {footerLinkLabel}
            </Link>
          </p>
        )}
      </div>
    </div>
  </div>
);

export default AuthLayout;
