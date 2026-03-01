// src/services/apiClient.js
// ─────────────────────────────────────────────────────────────────────────────
// Canonical Axios instance used by every Redux thunk.
//
// Request interceptor  → attaches Bearer token from localStorage
// Response interceptor → on 401, dispatches logout + redirects to /login
//
// The store is injected via injectStore() called from main.jsx AFTER the
// store is created, breaking the circular dependency:
//   store → thunks → apiClient → (needs store for dispatch) → store
// ─────────────────────────────────────────────────────────────────────────────
import axios from 'axios';

const BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Store injection ───────────────────────────────────────────────────────────
// Holds a reference to the Redux store once injectStore() is called.
// Using a module-level variable avoids importing the store directly (which
// would create a circular dep: store.js → slices → apiClient → store.js).
let _store = null;
export const injectStore = (store) => { _store = store; };

// ── Request interceptor ───────────────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Purge localStorage immediately so no stale token lingers
      localStorage.removeItem('hms_token');
      localStorage.removeItem('hms_user');

      // Dispatch the synchronous resetAuth action so Redux state clears
      // instantly without waiting for a round-trip logout API call.
      // We import lazily inside the handler to avoid the circular dep at
      // module-evaluation time.
      if (_store) {
        const { resetAuth } = await import('../store/slices/authSlice');
        _store.dispatch(resetAuth());
      }

      // Redirect to login, preserving the page they were on so LoginPage
      // can bounce them back via location.state.from after re-auth.
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
