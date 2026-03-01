// src/context/AuthContext.js
// ─────────────────────────────────────────────────────────────────────────────
// Thin React context that exposes the Redux auth slice to the component tree
// via a stable hook (useAuth).  All real async work is delegated to the Redux
// thunks; this context simply unwraps the Redux state and dispatches.
// ─────────────────────────────────────────────────────────────────────────────
import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  login      as loginThunk,
  logout     as logoutThunk,
  register   as registerThunk,
  getMe      as getMeThunk,
  changePassword as changePasswordThunk,
  clearError,
  updateUserProfile,
  resetAuth,
  selectUser,
  selectToken,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
} from '../store/slices/authSlice';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();

  // ── Read slice state via selectors ────────────────────────────────────────
  const user            = useSelector(selectUser);
  const token           = useSelector(selectToken);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading         = useSelector(selectAuthLoading);
  const error           = useSelector(selectAuthError);

  // ── On mount: verify token with /api/auth/me ──────────────────────────────
  // If a token exists in localStorage (and therefore in initial Redux state)
  // we re-validate it against the backend so stale / revoked tokens are purged.
  useEffect(() => {
    if (token) {
      dispatch(getMeThunk());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — run once on mount

  // ── Stable action wrappers ────────────────────────────────────────────────
  const login = useCallback(
    (credentials) => dispatch(loginThunk(credentials)).unwrap(),
    [dispatch]
  );

  const register = useCallback(
    (userData) => dispatch(registerThunk(userData)).unwrap(),
    [dispatch]
  );

  const logout = useCallback(
    () => dispatch(logoutThunk()).unwrap(),
    [dispatch]
  );

  const refreshUser = useCallback(
    () => dispatch(getMeThunk()).unwrap(),
    [dispatch]
  );

  const updatePassword = useCallback(
    (passwords) => dispatch(changePasswordThunk(passwords)).unwrap(),
    [dispatch]
  );

  const updateUser = useCallback(
    (data) => dispatch(updateUserProfile(data)),
    [dispatch]
  );

  const dismissError = useCallback(
    () => dispatch(clearError()),
    [dispatch]
  );

  const hardReset = useCallback(
    () => dispatch(resetAuth()),
    [dispatch]
  );

  const value = {
    // ── state ──────────────────────────────────────────────────────────────
    user,
    token,
    isAuthenticated,
    loading,
    error,
    // ── actions ────────────────────────────────────────────────────────────
    login,
    register,
    logout,
    refreshUser,
    updatePassword,
    updateUser,
    dismissError,
    hardReset,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/** Primary hook — use this everywhere instead of useSelector for auth state */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
