// src/components/layout/Navbar.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Responsive navigation bar.
//
// Unauthenticated  → Login · Register
// Authenticated guest  → Rooms · My Bookings · Profile · Logout
// Authenticated admin  → Rooms · My Bookings · Admin Dashboard · Profile · Logout
//
// The mobile hamburger toggles a slide-down nav drawer.
// The active link is highlighted via NavLink's className callback.
// Logout dispatches the logout thunk then calls resetReviews / resetRooms
// so no stale data lingers in Redux after session end.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate }               from 'react-router-dom';
import { useDispatch, useSelector }           from 'react-redux';
import { logout, selectUser, selectIsAuthenticated } from '../../store/slices/authSlice';

const ADMIN_LINKS = [
  { to: '/admin/dashboard',    label: '📊 Dashboard'  },
  { to: '/admin/rooms',        label: '🏨 Rooms'       },
  { to: '/admin/inventory',    label: '📦 Inventory'   },
  { to: '/admin/staff',        label: '👥 Staff'       },
  { to: '/admin/maintenance',  label: '🔧 Maintenance' },
  { to: '/admin/services',     label: '🛎️ Services'    },
  { to: '/admin/bookings/new', label: '📋 New Booking' },
  { to: '/admin/bookings',           label: '📑 Bookings'    },
];

const GUEST_LINKS = [
  { to: '/rooms',    label: 'Rooms'    },
  { to: '/bookings', label: 'Bookings' },
];

const Navbar = () => {
  const dispatch        = useDispatch();
  const navigate        = useNavigate();
  const user            = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isAdmin         = user?.role === 'admin';

  const [adminOpen,  setAdminOpen]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropRef = useRef(null);

  /* close admin dropdown on outside click */
  useEffect(() => {
    if (!adminOpen) return;
    const h = (e) => { if (!dropRef.current?.contains(e.target)) setAdminOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [adminOpen]);

  /* close mobile menu on route change */
  useEffect(() => { setMobileOpen(false); setAdminOpen(false); }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const navLinkClass = ({ isActive }) =>
    `navbar__link ${isActive ? 'navbar__link--active' : ''}`;

  return (
    <nav className="navbar" aria-label="Main navigation">
      <div className="navbar__inner">

        {/* ── Logo ── */}
        <NavLink to={isAuthenticated ? '/rooms' : '/login'} className="navbar__brand">
          🏨 <span className="navbar__brand-name">HMS</span>
        </NavLink>

        {/* ── Desktop links ── */}
        <div className="navbar__links">
          {isAuthenticated && !isAdmin && GUEST_LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={navLinkClass}>{l.label}</NavLink>
          ))}

          {/* Admin mega-dropdown */}
          {isAdmin && (
            <div className="navbar__dropdown" ref={dropRef}>
              <button
                className={`navbar__link navbar__dropdown-trigger ${adminOpen ? 'navbar__link--active' : ''}`}
                onClick={() => setAdminOpen((p) => !p)}
                aria-haspopup="true"
                aria-expanded={adminOpen}>
                ⚙️ Admin <span aria-hidden="true" className="navbar__chevron">{adminOpen ? '▴' : '▾'}</span>
              </button>

              {adminOpen && (
                <ul className="navbar__dropdown-menu" role="menu">
                  {ADMIN_LINKS.map((l) => (
                    <li key={l.to} role="none">
                      <NavLink
                        to={l.to}
                        role="menuitem"
                        className={({ isActive }) =>
                          `navbar__dropdown-item ${isActive ? 'navbar__dropdown-item--active' : ''}`}
                        onClick={() => setAdminOpen(false)}>
                        {l.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* ── Right side ── */}
        <div className="navbar__right">
          {isAuthenticated ? (
            <>
              <span className="navbar__user">
                {user?.name ?? user?.email ?? 'User'}
                {isAdmin && <span className="navbar__role-badge">Admin</span>}
              </span>
              <button className="btn btn--ghost btn--sm" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login"    className="btn btn--ghost btn--sm">Login</NavLink>
              <NavLink to="/register" className="btn btn--primary btn--sm">Register</NavLink>
            </>
          )}

          {/* Hamburger */}
          <button
            className="navbar__hamburger"
            onClick={() => setMobileOpen((p) => !p)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}>
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <div className="navbar__mobile">
          {isAuthenticated && !isAdmin && GUEST_LINKS.map((l) => (
            <NavLink key={l.to} to={l.to}
              className={navLinkClass}
              onClick={() => setMobileOpen(false)}>
              {l.label}
            </NavLink>
          ))}

          {isAdmin && ADMIN_LINKS.map((l) => (
            <NavLink key={l.to} to={l.to}
              className={({ isActive }) => `navbar__link ${isActive ? 'navbar__link--active' : ''}`}
              onClick={() => setMobileOpen(false)}>
              {l.label}
            </NavLink>
          ))}

          {isAuthenticated
            ? <button className="btn btn--ghost btn--sm mt-2" onClick={handleLogout}>Logout</button>
            : <>
                <NavLink to="/login"    className="btn btn--ghost btn--sm" onClick={() => setMobileOpen(false)}>Login</NavLink>
                <NavLink to="/register" className="btn btn--primary btn--sm" onClick={() => setMobileOpen(false)}>Register</NavLink>
              </>}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
