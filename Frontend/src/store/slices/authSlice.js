// src/store/slices/authSlice.js
// ─────────────────────────────────────────────────────────────────────────────
// Redux Toolkit slice for authentication.
//
// State shape
// ───────────
//   user            – sanitized user object  (null when logged out)
//   token           – JWT string             (null when logged out)
//   isAuthenticated – derived boolean
//   loading         – true while any thunk is in-flight
//   error           – last backend error message (null when clean)
//
// Thunks (all hit the Express /api/auth/* endpoints)
// ────────────────────────────────────────────────────
//   register        POST  /api/auth/register
//   login           POST  /api/auth/login
//   logout          POST  /api/auth/logout
//   getMe           GET   /api/auth/me
//   changePassword  PUT   /api/auth/change-password
// ─────────────────────────────────────────────────────────────────────────────
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Persist token + user to localStorage after successful auth */
const persistAuth = (token, user) => {
  localStorage.setItem('hms_token', token);
  localStorage.setItem('hms_user', JSON.stringify(user));
};

/** Wipe auth data from localStorage */
const purgeAuth = () => {
  localStorage.removeItem('hms_token');
  localStorage.removeItem('hms_user');
};

/**
 * Strip sensitive / unnecessary fields from the API user object so we never
 * store raw hashed passwords or internal Mongoose fields in Redux state.
 */
const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, __v, ...safe } = user;
  return safe;
};

/**
 * Uniform error extractor for rejectWithValue.
 * Prefers the Express backend's { message } shape, falls back to the Axios
 * error message, and finally to a generic string.
 */
const extractError = (err) =>
  err.response?.data?.message ||
  err.response?.data?.error ||
  err.message ||
  'An unexpected error occurred';

// ─── Async Thunks ─────────────────────────────────────────────────────────────

/**
 * register
 * POST /api/auth/register
 * Body: { name, email, password, phone, role }
 */
export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/auth/register', {
        name: userData.name,
        email: userData.email,
        password: userData.password,
        phone: userData.phone,
        role: userData.role,
      });
      // Expected shape: { success, token, user }
      const { token, user } = response.data;
      persistAuth(token, sanitizeUser(user));
      return { token, user: sanitizeUser(user) };
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * login
 * POST /api/auth/login
 * Body: { email, password }
 */
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/auth/login', {
        email,  
        password,
      });
      const { token, user } = response.data ;
      persistAuth(token, sanitizeUser(user));
      return { token, user: sanitizeUser(user) };
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * logout
 * POST /api/auth/logout
 * Notifies the backend (e.g. to invalidate a refresh token / server-side
 * session), then always clears client state regardless of the response.
 */
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await axiosInstance.post('/auth/logout');
    } catch (err) {
      // We intentionally swallow the error and still clear local state,
      // but surface it so callers can show a warning if needed.
      return rejectWithValue(extractError(err));
    } finally {
      purgeAuth();
    }
  }
);

/**
 * getMe
 * GET /api/auth/me
 * Fetches the currently authenticated user's profile.
 * Requires a valid Bearer token (injected automatically by the interceptor).
 */
export const getMe = createAsyncThunk(
  'auth/getMe',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/auth/me');
      console.log("response me ",response)
      // Update cached user in localStorage with fresh data
      const user = sanitizeUser(response.data.data.user ?? response.data);
      localStorage.setItem('hms_user', JSON.stringify(user));
      return user;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * changePassword
 * PUT /api/auth/change-password
 * Body: { currentPassword, newPassword }
 */
export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ currentPassword, newPassword }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      return response.data?.message || 'Password updated successfully';
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

// ─── Initial State ────────────────────────────────────────────────────────────

const storedToken = localStorage.getItem('hms_token') || null;
const storedUser = (() => {
  try {
    const raw = localStorage.getItem('hms_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
})();

const initialState = {
  user: storedUser,
  token: storedToken,
  isAuthenticated: !!storedToken,
  loading: false,
  error: null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,

  // ── Synchronous reducers ───────────────────────────────────────────────────
  reducers: {
    /** Manually clear any displayed error (e.g. when the user dismisses a toast) */
    clearError(state) {
      state.error = null;
    },

    /** Optimistically update profile fields in Redux state (e.g. after a profile edit) */
    updateUserProfile(state, action) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem('hms_user', JSON.stringify(state.user));
      }
    },

    /**
     * Hard-reset the entire auth state.
     * Useful when the axios interceptor detects a 401 outside of a thunk.
     */
    resetAuth(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      purgeAuth();
    },
  },

  // ── Async thunk reducers ───────────────────────────────────────────────────
  extraReducers: (builder) => {

    // ── register ──────────────────────────────────────────────────────────────
    builder
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      });

    // ── login ─────────────────────────────────────────────────────────────────
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      });

    // ── logout ────────────────────────────────────────────────────────────────
    builder
      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logout.rejected, (state) => {
        // Even if the API call failed we still clear client state
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      });

    // ── getMe ─────────────────────────────────────────────────────────────────
    builder
      .addCase(getMe.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getMe.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(getMe.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        // A failed getMe means the token is bad → treat as logged out
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        purgeAuth();
      });

    // ── changePassword ────────────────────────────────────────────────────────
    builder
      .addCase(changePassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
        // token stays valid — user remains authenticated
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// ─── Action Exports ───────────────────────────────────────────────────────────
export const { clearError, updateUserProfile, resetAuth } = authSlice.actions;

// ─── Selector Exports ─────────────────────────────────────────────────────────
export const selectAuth          = (state) => state.auth;
export const selectUser          = (state) => state.auth.user;
export const selectToken         = (state) => state.auth.token;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading   = (state) => state.auth.loading;
export const selectAuthError     = (state) => state.auth.error;

export default authSlice.reducer;
