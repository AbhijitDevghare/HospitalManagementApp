// src/store/slices/reviewSlice.js
// ─────────────────────────────────────────────────────────────────────────────
// Redux Toolkit slice for Room Reviews & Ratings.
//
// State shape
// ───────────
//   roomReviews   – reviews for the currently viewed room
//   myReviews     – authenticated user's own review history
//   ratingSummary – aggregated star-breakdown object for graph/bars
//   averageRating – Number derived from the room reviews response
//   loading       – true while any thunk is in-flight
//   error         – last backend error message (null when clean)
//
// Thunks
// ──────
//   getReviewsByRoom      GET    /api/reviews/room/:roomId      (public / optional auth)
//   getRoomRatingSummary  GET    /api/reviews/room/:roomId/summary (public)
//   addReview             POST   /api/reviews                   (authenticated)
//   fetchMyReviews        GET    /api/reviews/my                (authenticated)
//   updateReview          PUT    /api/reviews/:id               (authenticated owner)
//   deleteReview          DELETE /api/reviews/:id               (authenticated owner / admin)
//   fetchReviewsByUser    GET    /api/reviews/user/:userId       (admin)
// ─────────────────────────────────────────────────────────────────────────────
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';

// ─── Error extractor ──────────────────────────────────────────────────────────
// Surfaces the Express backend { message } field for all status codes,
// including the specific cases we handle:
//   429 Too Many Requests → apiLimiter rate-limit hit on addReview
//   403 Forbidden         → attempting to edit / delete another user's review
//   400 Bad Request       → rating out of range, comment too short, etc.
const extractError = (err) => {
  const status = err.response?.status;

  // ── 429 Rate limit ─────────────────────────────────────────────────────────
  // apiLimiter may send plain text instead of JSON
  if (status === 429) {
    return (
      err.response?.data?.message ||
      err.response?.data ||
      'Too many review submissions. Please wait a moment and try again.'
    );
  }

  // ── 403 Permission / ownership ─────────────────────────────────────────────
  if (status === 403) {
    return (
      err.response?.data?.message ||
      'You do not have permission to modify this review.'
    );
  }

  // ── All other errors (400 validation, 404, 500…) ───────────────────────────
  return (
    err.response?.data?.message ||
    err.response?.data?.error  ||
    err.message                ||
    'An unexpected error occurred'
  );
};

// ─── Async Thunks ─────────────────────────────────────────────────────────────

/**
 * getReviewsByRoom  (Public / Optional Auth)
 * GET /api/reviews/room/:roomId
 * Query params (optional): rating
 *
 * The axiosInstance request interceptor already attaches the Bearer token
 * only when one exists in localStorage, so optionalAuthenticate routes
 * work transparently — no special logic is needed in the thunk itself.
 *
 * Response shape: { totalReviews, averageRating, data: { reviews } }
 */
export const getReviewsByRoom = createAsyncThunk(
  'reviews/getReviewsByRoom',
  async ({ roomId, rating } = {}, { rejectWithValue }) => {
    try {
      const params = {};
      if (rating !== undefined && rating !== '') params.rating = rating;

      const response = await axiosInstance.get(`/reviews/room/${roomId}`, { params });
      const data = response.data;
      return {
        reviews:       data.data?.reviews ?? data.reviews ?? [],
        totalReviews:  data.totalReviews  ?? 0,
        averageRating: data.averageRating ?? 0,
      };
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * getRoomRatingSummary  (Public)
 * GET /api/reviews/room/:roomId/summary
 * Returns aggregated star-count breakdown for rendering rating bars/graphs.
 * Response shape is stored verbatim in state.ratingSummary.
 */
export const getRoomRatingSummary = createAsyncThunk(
  'reviews/getRoomRatingSummary',
  async (roomId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/reviews/room/${roomId}/summary`);
      return response.data.summary ?? response.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * addReview  (Authenticated)
 * POST /api/reviews
 * Body: { roomId, rating, comment }
 *
 * 429 → apiLimiter rate-limit — captured in state.error
 * 400 → validation (rating out of 1-5 range, comment too short, etc.)
 */
export const addReview = createAsyncThunk(
  'reviews/addReview',
  async ({ roomId, rating, comment }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/reviews', {
        roomId,
        rating,
        comment,
      });
      return response.data.review ?? response.data;
    } catch (err) {
      // Captures 429 rate-limit and 400 validation errors
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * fetchMyReviews  (Authenticated)
 * GET /api/reviews/my
 */
export const fetchMyReviews = createAsyncThunk(
  'reviews/fetchMyReviews',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/reviews/my');
      return response.data.reviews ?? response.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * updateReview  (Authenticated — owner only)
 * PUT /api/reviews/:id
 * Body: { rating, comment }
 *
 * 403 → trying to update another user's review
 * 400 → invalid rating / empty comment
 */
export const updateReview = createAsyncThunk(
  'reviews/updateReview',
  async ({ id, rating, comment }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/reviews/${id}`, {
        rating,
        comment,
      });
      return response.data.review ?? response.data;
    } catch (err) {
      // Captures 403 ownership and 400 validation errors
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * deleteReview  (Authenticated owner / Admin)
 * DELETE /api/reviews/:id
 * Returns the deleted id so the reducer can filter it from both arrays.
 *
 * 403 → guest trying to delete another user's review
 */
export const deleteReview = createAsyncThunk(
  'reviews/deleteReview',
  async (id, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/reviews/${id}`);
      return id;
    } catch (err) {
      // Captures 403 permission errors
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * fetchReviewsByUser  (Admin Only)
 * GET /api/reviews/user/:userId
 */
export const fetchReviewsByUser = createAsyncThunk(
  'reviews/fetchReviewsByUser',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/reviews/user/${userId}`);
      return response.data.reviews ?? response.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

// ─── Helpers: in-place array operations ──────────────────────────────────────

/**
 * Replace the matching review in an array using MongoDB _id (id fallback).
 * Merges rather than replacing so any extra local fields are preserved.
 */
const replaceInReviews = (reviews, updatedReview) =>
  reviews.map((r) =>
    (r._id ?? r.id) === (updatedReview._id ?? updatedReview.id)
      ? { ...r, ...updatedReview }
      : r
  );

/**
 * Filter the deleted review id out of an array.
 */
const filterReviews = (reviews, deletedId) =>
  reviews.filter((r) => (r._id ?? r.id) !== deletedId);

/**
 * Recalculate the average rating from an array of review objects.
 * Returns 0 when the array is empty to avoid NaN in the UI.
 */
const recalcAverage = (reviews) => {
  if (!reviews.length) return 0;
  const sum = reviews.reduce((acc, r) => acc + (r.rating ?? 0), 0);
  return Math.round((sum / reviews.length) * 10) / 10; // 1 decimal place
};

// ─── Initial State ────────────────────────────────────────────────────────────
const initialState = {
  roomReviews:   [],
  myReviews:     [],
  ratingSummary: {},
  averageRating: 0,
  loading:       false,
  error:         null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────
const reviewSlice = createSlice({
  name: 'reviews',
  initialState,

  // ── Synchronous reducers ───────────────────────────────────────────────────
  reducers: {
    /** Dismiss an error banner without a network call */
    clearReviewError(state) {
      state.error = null;
    },

    /**
     * Clear room-specific review data when navigating away from a room page.
     * Prevents stale reviews from flashing on the next room visited.
     */
    clearRoomReviews(state) {
      state.roomReviews   = [];
      state.ratingSummary = {};
      state.averageRating = 0;
    },

    /** Full reset — call this on logout */
    resetReviews() {
      return initialState;
    },
  },

  // ── Async thunk reducers ───────────────────────────────────────────────────
  extraReducers: (builder) => {

    // ── getReviewsByRoom ──────────────────────────────────────────────────────
    builder
      .addCase(getReviewsByRoom.pending, (state) => {
        state.loading     = true;
        state.error       = null;
        state.roomReviews = [];   // clear stale reviews while loading
      })
      .addCase(getReviewsByRoom.fulfilled, (state, action) => {
        state.loading     = false;
        state.roomReviews = action.payload.reviews;
        // Store the server-computed average directly — authoritative source
        state.averageRating = action.payload.averageRating;
        state.error       = null;
      })
      .addCase(getReviewsByRoom.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── getRoomRatingSummary ──────────────────────────────────────────────────
    builder
      .addCase(getRoomRatingSummary.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(getRoomRatingSummary.fulfilled, (state, action) => {
        state.loading       = false;
        // Stored verbatim — component reads whatever shape the backend sends
        // (e.g. { 1: 2, 2: 5, 3: 8, 4: 14, 5: 21 } or [{ star, count }])
        state.ratingSummary = action.payload;
        state.error         = null;
      })
      .addCase(getRoomRatingSummary.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── addReview ─────────────────────────────────────────────────────────────
    // Prepends the new review to roomReviews and myReviews, then recalculates
    // the local averageRating so the star display updates immediately.
    builder
      .addCase(addReview.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(addReview.fulfilled, (state, action) => {
        state.loading = false;
        const review  = action.payload;

        // Prepend to room view and personal history
        state.roomReviews.unshift(review);
        state.myReviews.unshift(review);

        // Recalculate local average (server average will be refreshed on next
        // getReviewsByRoom call; this keeps the display in sync immediately)
        state.averageRating = recalcAverage(state.roomReviews);
        state.error = null;
      })
      .addCase(addReview.rejected, (state, action) => {
        state.loading = false;
        // Captures 429 rate-limit and 400 validation errors
        state.error = action.payload;
      });

    // ── fetchMyReviews ────────────────────────────────────────────────────────
    builder
      .addCase(fetchMyReviews.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchMyReviews.fulfilled, (state, action) => {
        state.loading   = false;
        state.myReviews = action.payload;
        state.error     = null;
      })
      .addCase(fetchMyReviews.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── updateReview ──────────────────────────────────────────────────────────
    // Merges the updated review in-place in BOTH roomReviews and myReviews,
    // then recalculates averageRating from the updated roomReviews array.
    builder
      .addCase(updateReview.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(updateReview.fulfilled, (state, action) => {
        state.loading    = false;
        const updated    = action.payload;

        state.roomReviews = replaceInReviews(state.roomReviews, updated);
        state.myReviews   = replaceInReviews(state.myReviews,   updated);

        // Keep the displayed average in sync with the updated rating value
        state.averageRating = recalcAverage(state.roomReviews);
        state.error = null;
      })
      .addCase(updateReview.rejected, (state, action) => {
        state.loading = false;
        // Captures 403 ownership and 400 validation errors
        state.error   = action.payload;
      });

    // ── deleteReview ──────────────────────────────────────────────────────────
    // Filters the deleted review out of BOTH arrays and recalculates the
    // average so the star count updates immediately without a re-fetch.
    builder
      .addCase(deleteReview.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(deleteReview.fulfilled, (state, action) => {
        state.loading       = false;
        const deletedId     = action.payload;

        state.roomReviews   = filterReviews(state.roomReviews, deletedId);
        state.myReviews     = filterReviews(state.myReviews,   deletedId);

        // Recalculate average after deletion
        state.averageRating = recalcAverage(state.roomReviews);
        state.error = null;
      })
      .addCase(deleteReview.rejected, (state, action) => {
        state.loading = false;
        // Captures 403 permission errors
        state.error   = action.payload;
      });

    // ── fetchReviewsByUser ────────────────────────────────────────────────────
    // Admin-only: loads a specific user's reviews into myReviews so the same
    // "review list" component can be reused in the admin user-detail view.
    builder
      .addCase(fetchReviewsByUser.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchReviewsByUser.fulfilled, (state, action) => {
        state.loading   = false;
        // Intentionally reuses myReviews — admin views a user's history in
        // the same panel component that guests use for their own history
        state.myReviews = action.payload;
        state.error     = null;
      })
      .addCase(fetchReviewsByUser.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });
  },
});

// ─── Action Exports ───────────────────────────────────────────────────────────
export const {
  clearReviewError,
  clearRoomReviews,
  resetReviews,
} = reviewSlice.actions;

// ─── Selector Exports ─────────────────────────────────────────────────────────
export const selectRoomReviews   = (state) => state.reviews.roomReviews;
export const selectMyReviews     = (state) => state.reviews.myReviews;
export const selectRatingSummary = (state) => state.reviews.ratingSummary;
export const selectAverageRating = (state) => state.reviews.averageRating;
export const selectReviewLoading = (state) => state.reviews.loading;
export const selectReviewError   = (state) => state.reviews.error;

export default reviewSlice.reducer;
