// src/store/slices/bookingSlice.js
// ─────────────────────────────────────────────────────────────────────────────
// Redux Toolkit slice for hotel bookings.
//
// State shape
// ───────────
//   bookings       – all bookings array (admin view)
//   myBookings     – current user's bookings array
//   currentBooking – single booking detail object
//   loading        – true while any thunk is in-flight
//   error          – last backend error message (null when clean)
//
// Thunks
// ──────
//   createBooking     POST  /api/bookings
//   fetchAllBookings  GET   /api/bookings          (admin)
//   fetchMyBookings   GET   /api/bookings/my
//   fetchBookingById  GET   /api/bookings/:id
//   cancelBooking     PATCH /api/bookings/:id/cancel
//   rescheduleBooking PATCH /api/bookings/:id/reschedule
//   completeBooking   PATCH /api/bookings/:id/complete  (admin)
// ─────────────────────────────────────────────────────────────────────────────
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';

// ─── Error extractor ─────────────────────────────────────────────────────────
// Surfaces the Express backend's { message } field for every status code,
// including the specific cases we must handle:
//   409 Conflict  → room already booked for the requested dates
//   400 Bad Request → room under maintenance / unavailable
const extractError = (err) =>
  err.response?.data?.message ||
  err.response?.data?.error ||
  err.message ||
  'An unexpected error occurred';

// ─── Async Thunks ─────────────────────────────────────────────────────────────

/**
 * createBooking
 * POST /api/bookings
 * Body: { roomId, checkInDate, checkOutDate, numberOfGuests, serviceCharges }
 */
export const createBooking = createAsyncThunk(
  'bookings/createBooking',
  async (
    { roomId, checkInDate, checkOutDate, numberOfGuests, serviceCharges },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.post('/bookings', {
        roomId,
        checkInDate,
        checkOutDate,
        numberOfGuests,
        serviceCharges,
      });
      return response.data.data.booking ?? response.data;
    } catch (err) {
      // 409 → already booked | 400 → maintenance/unavailable
      // Both are surfaced identically via rejectWithValue so the UI can
      // read state.bookings.error and display the backend message directly.
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * fetchAllBookings  (Admin Only)
 * GET /api/bookings
 * Query params (all optional): status, userId, roomId
 */
export const fetchAllBookings = createAsyncThunk(
  'bookings/fetchAllBookings',
  async (filters = {}, { rejectWithValue }) => {
    try {
      // Strip undefined / empty-string keys so the URL stays clean
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')
      );
      const response = await axiosInstance.get('/bookings', { params });
      return response.data.data.bookings ?? response.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * fetchMyBookings
 * GET /api/bookings/my
 * Query params (optional): status
 */
export const fetchMyBookings = createAsyncThunk(
  'bookings/fetchMyBookings',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')
      );
      const response = await axiosInstance.get('/bookings/my', { params });
      return response.data.data.bookings ?? response.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * fetchBookingById
 * GET /api/bookings/:id
 */
export const fetchBookingById = createAsyncThunk(
  'bookings/fetchBookingById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/bookings/${id}`);
      console.log("BOOKING BY UD ",response)
      return response.data.data.booking ?? response.data;

    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * cancelBooking
 * PATCH /api/bookings/:id/cancel
 * Returns the updated booking object from the backend.
 */
export const cancelBooking = createAsyncThunk(
  'bookings/cancelBooking',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`/bookings/${id}/cancel`);
      return response.data.data.bookings ?? response.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * rescheduleBooking
 * PATCH /api/bookings/:id/reschedule
 * Body: { checkInDate, checkOutDate }
 */
export const rescheduleBooking = createAsyncThunk(
  'bookings/rescheduleBooking',
  async ({ id, checkInDate, checkOutDate }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`/bookings/${id}/reschedule`, {
        checkInDate,
        checkOutDate,
      });
      return response.data.data.bookings ?? response.data;
    } catch (err) {
      // 409 date-conflict and 400 maintenance errors land here
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * completeBooking  (Admin Only)
 * PATCH /api/bookings/:id/complete
 */
export const completeBooking = createAsyncThunk(
  'bookings/completeBooking',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`/bookings/${id}/complete`);
      return response.data.data.bookings ?? response.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

// ─── Helper: in-place array update ───────────────────────────────────────────
// Replaces the matching booking object inside an array without a full reload.
// Matching is done against MongoDB's _id field (with an `id` fallback).
const replaceInArray = (array, updatedBooking) =>
  array.map((b) =>
    (b._id ?? b.id) === (updatedBooking._id ?? updatedBooking.id)
      ? updatedBooking
      : b
  );

// ─── Initial State ────────────────────────────────────────────────────────────
const initialState = {
  bookings: [],
  myBookings: [],
  currentBooking: null,
  loading: false,
  error: null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────
const bookingSlice = createSlice({
  name: 'bookings',
  initialState,

  // ── Synchronous reducerzs ───────────────────────────────────────────────────
  reducers: {
    /** Dismiss an error banner without making an API call */
    clearBookingError(state) {
      state.error = null;
    },

    /** Clear the detail view when navigating away from a booking page */
    clearCurrentBooking(state) {
      state.currentBooking = null;
    },

    /** Full reset (e.g. on logout) */
    resetBookings() {
      return initialState;
    },
  },

  // ── Async thunk reducers ───────────────────────────────────────────────────
  extraReducers: (builder) => {

    // ── createBooking ─────────────────────────────────────────────────────────
    builder
      .addCase(createBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.loading = false;
        // Prepend to both lists so the UI reflects it instantly
        state.bookings.unshift(action.payload);
        state.myBookings.unshift(action.payload);
        state.currentBooking = action.payload;
        state.error = null;
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.loading = false;
        // Captures 409 Conflict and 400 Maintenance messages from the backend
        state.error = action.payload;
      });

    // ── fetchAllBookings ──────────────────────────────────────────────────────
    builder
      .addCase(fetchAllBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = action.payload;
        state.error = null;
      })
      .addCase(fetchAllBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ── fetchMyBookings ───────────────────────────────────────────────────────
    builder
      .addCase(fetchMyBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.myBookings = action.payload;
        state.error = null;
      })
      .addCase(fetchMyBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ── fetchBookingById ──────────────────────────────────────────────────────
    builder
      .addCase(fetchBookingById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.currentBooking = null;
      })
      .addCase(fetchBookingById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentBooking = action.payload;
        state.error = null;
      })
      .addCase(fetchBookingById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ── cancelBooking ─────────────────────────────────────────────────────────
    // Updates the booking object in-place inside both arrays and currentBooking
    // so the UI status badge changes immediately without a reload.
    builder
      .addCase(cancelBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelBooking.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload;
        state.bookings   = replaceInArray(state.bookings,   updated);
        state.myBookings = replaceInArray(state.myBookings, updated);
        if (
          state.currentBooking &&
          (state.currentBooking._id ?? state.currentBooking.id) ===
            (updated._id ?? updated.id)
        ) {
          state.currentBooking = updated;
        }
        state.error = null;
      })
      .addCase(cancelBooking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ── rescheduleBooking ─────────────────────────────────────────────────────
    // Same in-place update pattern; captures 409/400 in error on rejection.
    builder
      .addCase(rescheduleBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(rescheduleBooking.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload;
        state.bookings   = replaceInArray(state.bookings,   updated);
        state.myBookings = replaceInArray(state.myBookings, updated);
        if (
          state.currentBooking &&
          (state.currentBooking._id ?? state.currentBooking.id) ===
            (updated._id ?? updated.id)
        ) {
          state.currentBooking = updated;
        }
        state.error = null;
      })
      .addCase(rescheduleBooking.rejected, (state, action) => {
        state.loading = false;
        // 409 Conflict / 400 Maintenance message stored here
        state.error = action.payload;
      });

    // ── completeBooking ───────────────────────────────────────────────────────
    builder
      .addCase(completeBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(completeBooking.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload;
        state.bookings   = replaceInArray(state.bookings,   updated);
        state.myBookings = replaceInArray(state.myBookings, updated);
        if (
          state.currentBooking &&
          (state.currentBooking._id ?? state.currentBooking.id) ===
            (updated._id ?? updated.id)
        ) {
          state.currentBooking = updated;
        }
        state.error = null;
      })
      .addCase(completeBooking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// ─── Action Exports ───────────────────────────────────────────────────────────
export const {
  clearBookingError,
  clearCurrentBooking,
  resetBookings,
} = bookingSlice.actions;

// ─── Selector Exports ─────────────────────────────────────────────────────────
export const selectBookings       = (state) => state.bookings.bookings;
export const selectMyBookings     = (state) => state.bookings.myBookings;
export const selectCurrentBooking = (state) => state.bookings.currentBooking;
export const selectBookingLoading = (state) => state.bookings.loading;
export const selectBookingError   = (state) => state.bookings.error;

export default bookingSlice.reducer;
