// src/services/axiosInstance.js
// ─────────────────────────────────────────────────────────────────────────────
// Thin re-export shim.
// All slice files import from this path; we forward to apiClient so there
// is exactly ONE Axios instance with ONE set of interceptors in the app.
// ─────────────────────────────────────────────────────────────────────────────
export { default } from './apiClient';
