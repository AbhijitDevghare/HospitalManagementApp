// src/store/slices/staffSlice.js
// ─────────────────────────────────────────────────────────────────────────────
// Redux Toolkit slice for Staff Management.
//
// State shape
// ───────────
//   staffList      – all staff members array (admin management view)
//   salarySummary  – role-grouped headcount & salary statistics array
//   selectedStaff  – single staff profile object
//   loading        – true while any thunk is in-flight
//   error          – last backend error message (null when clean)
//
// Thunks (all admin-only unless noted)
// ──────
//   fetchAllStaff         GET    /api/staff
//   fetchSalarySummary    GET    /api/staff/salary-summary
//   addStaff              POST   /api/staff
//   fetchStaffById        GET    /api/staff/:id
//   updateStaffDetails    PUT    /api/staff/:id
//   updateShiftTiming     PATCH  /api/staff/:id/shift
//   deactivateStaff       PATCH  /api/staff/:id/deactivate
//   reactivateStaff       PATCH  /api/staff/:id/reactivate
//   deleteStaff           DELETE /api/staff/:id
// ─────────────────────────────────────────────────────────────────────────────
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';

// ─── Error extractor ──────────────────────────────────────────────────────────
// Surfaces the Express backend { message } field for all status codes,
// including the specific cases we must handle explicitly:
//   400 Bad Request  → missing shift times, validation failures
//   409 Conflict     → e.g. duplicate email on addStaff
//   403 Forbidden    → hard-delete attempted before deactivation
const extractError = (err) => {
  const status = err.response?.status;

  // ── 403 Delete restriction ─────────────────────────────────────────────────
  // Backend enforces deactivation before hard delete.
  if (status === 403) {
    return (
      err.response?.data?.message ||
      'Staff member must be deactivated before deletion.'
    );
  }

  // ── 409 Duplicate / conflict ───────────────────────────────────────────────
  if (status === 409) {
    return (
      err.response?.data?.message ||
      'A staff member with this information already exists.'
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
 * fetchAllStaff  (Admin Only)
 * GET /api/staff
 * Query params (both optional): role, isActive
 */
export const fetchAllStaff = createAsyncThunk(
  'staff/fetchAllStaff',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')
      );
      const response = await axiosInstance.get('/staff', { params });
      console.log("RESPOSNE STAFF LIST : ",response.data.data.staff)
      return response.data.data.staff;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * fetchSalarySummary  (Admin Only)
 * GET /api/staff/salary-summary
 * Response shape: Array of { role, headCount, totalSalary, averageSalary }
 * Stored verbatim in state.salarySummary for dashboard/table rendering.
 */
export const fetchSalarySummary = createAsyncThunk(
  'staff/fetchSalarySummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/staff/salary-summary');
      return response.data.summary ?? response.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * addStaff  (Admin Only)
 * POST /api/staff
 * Body: { name, email, role, salary, shift: { startTime, endTime }, … }
 *
 * 400 → missing required fields or validation failure
 * 409 → duplicate email address
 */
export const addStaff = createAsyncThunk(
  'staff/addStaff',
  async (staffData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/staff', staffData);
      return response.data.staff ?? response.data;
    } catch (err) {
      // Captures 400 validation and 409 duplicate email
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * fetchStaffById
 * GET /api/staff/:id
 */
export const fetchStaffById = createAsyncThunk(
  'staff/fetchStaffById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/staff/${id}`);
      return response.data.staff ?? response.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * updateStaffDetails  (Admin Only)
 * PUT /api/staff/:id
 * Body: any subset of { name, email, role, salary, … }
 */
export const updateStaffDetails = createAsyncThunk(
  'staff/updateStaffDetails',
  async ({ id, ...fields }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/staff/${id}`, fields);
      return response.data.staff ?? response.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * updateShiftTiming  (Admin Only)
 * PATCH /api/staff/:id/shift
 * Body: { startTime, endTime }  — both in HH:MM 24-hour format
 *
 * 400 → missing or malformed startTime / endTime
 */
export const updateShiftTiming = createAsyncThunk(
  'staff/updateShiftTiming',
  async ({ id, startTime, endTime }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`/staff/${id}/shift`, {
        startTime,
        endTime,
      });
      return response.data.staff ?? response.data;
    } catch (err) {
      // Captures 400 "startTime and endTime are required (HH:MM format)"
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * deactivateStaff  (Admin Only)
 * PATCH /api/staff/:id/deactivate
 * Soft-deletes by setting isActive: false.
 * Returns the updated staff object for in-place state sync.
 */
export const deactivateStaff = createAsyncThunk(
  'staff/deactivateStaff',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`/staff/${id}/deactivate`);
      return response.data.staff ?? response.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * reactivateStaff  (Admin Only)
 * PATCH /api/staff/:id/reactivate
 * Reverses deactivation by setting isActive: true.
 * Returns the updated staff object for in-place state sync.
 */
export const reactivateStaff = createAsyncThunk(
  'staff/reactivateStaff',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`/staff/${id}/reactivate`);
      return response.data.staff ?? response.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * deleteStaff  (Admin Only)
 * DELETE /api/staff/:id
 * Backend requires prior deactivation before a hard delete is permitted.
 * Returns the deleted id for in-place array filtering.
 *
 * 403 → "Staff member must be deactivated before deletion"
 */
export const deleteStaff = createAsyncThunk(
  'staff/deleteStaff',
  async (id, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/staff/${id}`);
      return id;
    } catch (err) {
      // Captures 403 delete-before-deactivation restriction
      return rejectWithValue(extractError(err));
    }
  }
);

// ─── Helpers: in-place array operations ──────────────────────────────────────

/**
 * Replace the matching staff member in an array.
 * Merge rather than replace to preserve any locally-populated reference fields.
 */
const replaceInStaff = (staffList, updatedMember) =>
  staffList.map((s) =>
    (s._id ?? s.id) === (updatedMember._id ?? updatedMember.id)
      ? { ...s, ...updatedMember }
      : s
  );

/**
 * Filter the deleted staff id out of an array.
 */
const filterStaff = (staffList, deletedId) =>
  staffList.filter((s) => (s._id ?? s.id) !== deletedId);

// ─── Initial State ────────────────────────────────────────────────────────────
const initialState = {
  staffList:     [],
  salarySummary: [],
  selectedStaff: null,
  loading:       false,
  error:         null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────
const staffSlice = createSlice({
  name: 'staff',
  initialState,

  // ── Synchronous reducers ───────────────────────────────────────────────────
  reducers: {
    /** Dismiss an error banner without a network call */
    clearStaffError(state) {
      state.error = null;
    },

    /** Clear the profile view when navigating away from a staff detail page */
    clearSelectedStaff(state) {
      state.selectedStaff = null;
    },

    /** Full reset — call this on logout */
    resetStaff() {
      return initialState;
    },
  },

  // ── Async thunk reducers ───────────────────────────────────────────────────
  extraReducers: (builder) => {

    // ── fetchAllStaff ─────────────────────────────────────────────────────────
    builder
      .addCase(fetchAllStaff.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchAllStaff.fulfilled, (state, action) => {
        state.loading   = false;
        state.staffList = action.payload;
        state.error     = null;
      })
      .addCase(fetchAllStaff.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── fetchSalarySummary ────────────────────────────────────────────────────
    builder
      .addCase(fetchSalarySummary.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchSalarySummary.fulfilled, (state, action) => {
        state.loading       = false;
        // Stored verbatim — shape defined by the backend aggregation pipeline
        // e.g. [{ role, headCount, totalSalary, averageSalary }, ...]
        state.salarySummary = action.payload;
        state.error         = null;
      })
      .addCase(fetchSalarySummary.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── addStaff ──────────────────────────────────────────────────────────────
    builder
      .addCase(addStaff.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(addStaff.fulfilled, (state, action) => {
        state.loading = false;
        // Prepend so the newest member appears at the top of the list
        state.staffList.unshift(action.payload);
        // Surface immediately as selectedStaff for post-create profile view
        state.selectedStaff = action.payload;
        state.error = null;
      })
      .addCase(addStaff.rejected, (state, action) => {
        state.loading = false;
        // Captures 400 validation and 409 duplicate email
        state.error = action.payload;
      });

    // ── fetchStaffById ────────────────────────────────────────────────────────
    builder
      .addCase(fetchStaffById.pending, (state) => {
        state.loading       = true;
        state.error         = null;
        state.selectedStaff = null;   // clear stale profile while loading
      })
      .addCase(fetchStaffById.fulfilled, (state, action) => {
        state.loading       = false;
        state.selectedStaff = action.payload;
        state.error         = null;
      })
      .addCase(fetchStaffById.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── updateStaffDetails ────────────────────────────────────────────────────
    // Merges updated fields in-place in staffList and selectedStaff so the
    // management table and profile view both reflect the change immediately.
    builder
      .addCase(updateStaffDetails.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(updateStaffDetails.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload;

        state.staffList = replaceInStaff(state.staffList, updated);

        // Sync the open profile view if it matches the updated member
        if (
          state.selectedStaff &&
          (state.selectedStaff._id ?? state.selectedStaff.id) ===
            (updated._id ?? updated.id)
        ) {
          state.selectedStaff = { ...state.selectedStaff, ...updated };
        }

        state.error = null;
      })
      .addCase(updateStaffDetails.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── updateShiftTiming ─────────────────────────────────────────────────────
    // Merges the updated shift fields (startTime, endTime) in-place in both
    // staffList and selectedStaff without triggering a full re-fetch.
    builder
      .addCase(updateShiftTiming.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(updateShiftTiming.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload;

        state.staffList = replaceInStaff(state.staffList, updated);

        // Sync the open profile view
        if (
          state.selectedStaff &&
          (state.selectedStaff._id ?? state.selectedStaff.id) ===
            (updated._id ?? updated.id)
        ) {
          state.selectedStaff = { ...state.selectedStaff, ...updated };
        }

        state.error = null;
      })
      .addCase(updateShiftTiming.rejected, (state, action) => {
        state.loading = false;
        // Captures 400 "startTime and endTime are required (HH:MM format)"
        state.error   = action.payload;
      });

    // ── deactivateStaff ───────────────────────────────────────────────────────
    // Flips isActive → false in-place in staffList and selectedStaff so the
    // status badge and profile view update immediately without a re-fetch.
    builder
      .addCase(deactivateStaff.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(deactivateStaff.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload;

        state.staffList = replaceInStaff(state.staffList, updated);

        if (
          state.selectedStaff &&
          (state.selectedStaff._id ?? state.selectedStaff.id) ===
            (updated._id ?? updated.id)
        ) {
          state.selectedStaff = { ...state.selectedStaff, ...updated };
        }

        state.error = null;
      })
      .addCase(deactivateStaff.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── reactivateStaff ───────────────────────────────────────────────────────
    // Flips isActive → true in-place using the same merge pattern.
    builder
      .addCase(reactivateStaff.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(reactivateStaff.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload;

        state.staffList = replaceInStaff(state.staffList, updated);

        if (
          state.selectedStaff &&
          (state.selectedStaff._id ?? state.selectedStaff.id) ===
            (updated._id ?? updated.id)
        ) {
          state.selectedStaff = { ...state.selectedStaff, ...updated };
        }

        state.error = null;
      })
      .addCase(reactivateStaff.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── deleteStaff ───────────────────────────────────────────────────────────
    // Filters the deleted member out of staffList and nulls selectedStaff
    // if that profile was open in the detail view.
    builder
      .addCase(deleteStaff.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(deleteStaff.fulfilled, (state, action) => {
        state.loading   = false;
        const deletedId = action.payload;

        state.staffList = filterStaff(state.staffList, deletedId);

        // Clear the profile view if the deleted member was open
        if (
          state.selectedStaff &&
          (state.selectedStaff._id ?? state.selectedStaff.id) === deletedId
        ) {
          state.selectedStaff = null;
        }

        state.error = null;
      })
      .addCase(deleteStaff.rejected, (state, action) => {
        state.loading = false;
        // Captures 403 "Staff member must be deactivated before deletion"
        state.error   = action.payload;
      });
  },
});

// ─── Action Exports ───────────────────────────────────────────────────────────
export const {
  clearStaffError,
  clearSelectedStaff,
  resetStaff,
} = staffSlice.actions;

// ─── Selector Exports ─────────────────────────────────────────────────────────
export const selectStaffList     = (state) => state.staff.staffList;
export const selectSalarySummary = (state) => state.staff.salarySummary;
export const selectSelectedStaff = (state) => state.staff.selectedStaff;
export const selectStaffLoading  = (state) => state.staff.loading;
export const selectStaffError    = (state) => state.staff.error;

export default staffSlice.reducer;
