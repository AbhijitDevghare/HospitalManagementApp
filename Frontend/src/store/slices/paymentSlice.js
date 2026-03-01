// src/store/slices/paymentSlice.js
// ─────────────────────────────────────────────────────────────────────────────
// Redux Toolkit slice for Hotel Payments.
//
// State shape
// ───────────
//   payments       – all payment transactions array (admin view)
//   currentPayment – single payment detail / receipt object
//   loading        – true while any thunk is in-flight
//   error          – last backend error message (null when clean)
//
// Thunks
// ──────
//   processPayment         POST  /api/payments
//   fetchAllPayments       GET   /api/payments              (admin)
//   fetchPaymentById       GET   /api/payments/:id
//   fetchPaymentByBookingId GET  /api/payments/booking/:bookingId
//   confirmPayment         PATCH /api/payments/:id/confirm  (admin)
//   failPayment            PATCH /api/payments/:id/fail     (admin)
// ─────────────────────────────────────────────────────────────────────────────
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';

// ─── Error extractor ──────────────────────────────────────────────────────────
// Surfaces the Express backend { message } field for ALL status codes,
// including the specific cases handled explicitly in this slice:
//
//   429 Too Many Requests → apiLimiter middleware rate-limit hit on processPayment
//   403 Forbidden         → guest attempting to view another user's payment
//   400 Bad Request       → missing / invalid body fields
//   404 Not Found         → payment or booking does not exist
const extractError = (err) => {
  const status = err.response?.status;

  // ── 429 Rate limit ─────────────────────────────────────────────────────────
  // Express rate-limiter typically sends plain text or { message }.
  // Provide a clear, user-friendly fallback so the UI can prompt a retry.
  if (status === 429) {
    return (
      err.response?.data?.message ||
      err.response?.data ||
      'Too many payment requests. Please wait a moment and try again.'
    );
  }

  // ── 403 Ownership / authorisation ──────────────────────────────────────────
  if (status === 403) {
    return (
      err.response?.data?.message ||
      'You do not have permission to view this payment.'
    );
  }

  // ── All other errors ────────────────────────────────────────────────────────
  return (
    err.response?.data?.message ||
    err.response?.data?.error  ||
    err.message                ||
    'An unexpected error occurred'
  );
};

// ─── Async Thunks ─────────────────────────────────────────────────────────────

/**
 * processPayment
 * POST /api/payments
 * Body: { bookingId, paymentAmount, paymentMethod, transactionId }
 *
 * 429 → rate-limited by apiLimiter middleware — captured in state.error
 * 400 → missing / invalid fields
 */
export const processPayment = createAsyncThunk(
  'payments/processPayment',
  async (
    { bookingId, paymentAmount, paymentMethod, transactionId },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.post('/payments', {
        bookingId,
        paymentAmount,
        paymentMethod,
        transactionId,
      });
      return response.data.data.payment ?? response.data;
    } catch (err) {
      console.log(err.message)
      // Captures 429 rate-limit and 400 validation errors
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * fetchAllPayments  (Admin Only)
 * GET /api/payments
 * Query params (both optional): paymentStatus, paymentMethod
 */
export const fetchAllPayments = createAsyncThunk(
  'payments/fetchAllPayments',
  async (filters = {}, { rejectWithValue }) => {
    try {
      // Strip keys that were not supplied so the URL stays clean
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')
      );
      const response = await axiosInstance.get('/payments', { params });
      return response.data.data.payments ?? response.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * fetchPaymentById
 * GET /api/payments/:id
 *
 * 403 → guest user viewing a payment not linked to their own booking
 */
export const fetchPaymentById = createAsyncThunk(
  'payments/fetchPaymentById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/payments/${id}`);
      return response.data.data.payment ?? response.data;
    } catch (err) {
      // Captures 403 ownership violation
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * fetchPaymentByBookingId
 * GET /api/payments/booking/:bookingId
 * Used from the booking detail view to load its associated payment.
 *
 * 403 → guest user fetching a payment for another user's booking
 */
export const fetchPaymentByBookingId = createAsyncThunk(
  'payments/fetchPaymentByBookingId',
  async (bookingId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/payments/booking/${bookingId}`);
      return response.data.data.payment ?? response.data;
    } catch (err) {
      // Captures 403 ownership violation
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * confirmPayment  (Admin Only)
 * PATCH /api/payments/:id/confirm
 * Returns the full updated payment object for in-place state sync.
 */
export const confirmPayment = createAsyncThunk(
  'payments/confirmPayment',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`/payments/${id}/confirm`);
      return response.data.data.payment ?? response.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * failPayment  (Admin Only)
 * PATCH /api/payments/:id/fail
 * Body: { reason }
 * Returns the updated payment with paymentStatus: 'failed' and the
 * failure reason stored on the record.
 */
export const failPayment = createAsyncThunk(
  'payments/failPayment',
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`/payments/${id}/fail`, {
        reason,
      });
      return response.data.data.payment ?? response.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

// ─── Helper: in-place payment update ─────────────────────────────────────────
// Replaces the matching payment in the payments array using MongoDB _id
// (with an `id` fallback). Merges rather than replacing wholesale so any
// extra locally-populated fields (e.g. a full booking reference object)
// are preserved while the changed fields (paymentStatus, failureReason,
// confirmedAt, etc.) are updated.
const replaceInPayments = (payments, updatedPayment) =>
  payments.map((p) =>
    (p._id ?? p.id) === (updatedPayment._id ?? updatedPayment.id)
      ? { ...p, ...updatedPayment }
      : p
  );

// ─── Initial State ────────────────────────────────────────────────────────────
const initialState = {
  payments:       [],
  currentPayment: null,
  loading:        false,
  error:          null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────
const paymentSlice = createSlice({
  name: 'payments',
  initialState,

  // ── Synchronous reducers ───────────────────────────────────────────────────
  reducers: {
    /** Dismiss an error banner without a network call */
    clearPaymentError(state) {
      state.error = null;
    },

    /** Clear the detail view when navigating away from a payment page */
    clearCurrentPayment(state) {
      state.currentPayment = null;
    },

    /** Full reset — call this on logout */
    resetPayments() {
      return initialState;
    },
  },

  // ── Async thunk reducers ───────────────────────────────────────────────────
  extraReducers: (builder) => {

    // ── processPayment ────────────────────────────────────────────────────────
    builder
      .addCase(processPayment.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(processPayment.fulfilled, (state, action) => {
        state.loading = false;
        // Prepend to list so the newest transaction appears at the top
        state.payments.unshift(action.payload);
        // Immediately available in the detail / receipt view
        state.currentPayment = action.payload;
        state.error = null;
      })
      .addCase(processPayment.rejected, (state, action) => {
        state.loading = false;
        // Captures 429 rate-limit and 400 validation errors
        state.error = action.payload;
      });

    // ── fetchAllPayments ──────────────────────────────────────────────────────
    builder
      .addCase(fetchAllPayments.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchAllPayments.fulfilled, (state, action) => {
        state.loading   = false;
        state.payments  = action.payload;
        state.error     = null;
      })
      .addCase(fetchAllPayments.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── fetchPaymentById ──────────────────────────────────────────────────────
    builder
      .addCase(fetchPaymentById.pending, (state) => {
        state.loading        = true;
        state.error          = null;
        state.currentPayment = null;    // clear stale data while loading
      })
      .addCase(fetchPaymentById.fulfilled, (state, action) => {
        state.loading        = false;
        state.currentPayment = action.payload;
        state.error          = null;
      })
      .addCase(fetchPaymentById.rejected, (state, action) => {
        state.loading = false;
        // Captures 403 ownership violation with user-friendly message
        state.error   = action.payload;
      });

    // ── fetchPaymentByBookingId ───────────────────────────────────────────────
    builder
      .addCase(fetchPaymentByBookingId.pending, (state) => {
        state.loading        = true;
        state.error          = null;
        state.currentPayment = null;
      })
      .addCase(fetchPaymentByBookingId.fulfilled, (state, action) => {
        state.loading        = false;
        state.currentPayment = action.payload;
        state.error          = null;
      })
      .addCase(fetchPaymentByBookingId.rejected, (state, action) => {
        state.loading = false;
        // Captures 403 ownership violation
        state.error   = action.payload;
      });

    // ── confirmPayment ────────────────────────────────────────────────────────
    // Updates paymentStatus → 'confirmed' (and any server-stamped fields like
    // confirmedAt) in-place in both state.payments and state.currentPayment
    // so the status badge and receipt view update instantly without a reload.
    builder
      .addCase(confirmPayment.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(confirmPayment.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload;

        // Sync the admin transaction list row
        state.payments = replaceInPayments(state.payments, updated);

        // Sync the detail / receipt view if this payment is currently open
        if (
          state.currentPayment &&
          (state.currentPayment._id ?? state.currentPayment.id) ===
            (updated._id ?? updated.id)
        ) {
          state.currentPayment = { ...state.currentPayment, ...updated };
        }

        state.error = null;
      })
      .addCase(confirmPayment.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── failPayment ───────────────────────────────────────────────────────────
    // Updates paymentStatus → 'failed' AND merges the failure reason returned
    // by the backend in-place in both arrays so the UI reflects the reason
    // without requiring a re-fetch.
    builder
      .addCase(failPayment.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(failPayment.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload;

        // Sync the admin transaction list row (includes failureReason field)
        state.payments = replaceInPayments(state.payments, updated);

        // Sync the detail view if this payment is currently open
        if (
          state.currentPayment &&
          (state.currentPayment._id ?? state.currentPayment.id) ===
            (updated._id ?? updated.id)
        ) {
          state.currentPayment = { ...state.currentPayment, ...updated };
        }

        state.error = null;
      })
      .addCase(failPayment.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });
  },
});

// ─── Action Exports ───────────────────────────────────────────────────────────
export const {
  clearPaymentError,
  clearCurrentPayment,
  resetPayments,
} = paymentSlice.actions;

// ─── Selector Exports ─────────────────────────────────────────────────────────
export const selectPayments       = (state) => state.payments.payments;
export const selectCurrentPayment = (state) => state.payments.currentPayment;
export const selectPaymentLoading = (state) => state.payments.loading;
export const selectPaymentError   = (state) => state.payments.error;

export default paymentSlice.reducer;
