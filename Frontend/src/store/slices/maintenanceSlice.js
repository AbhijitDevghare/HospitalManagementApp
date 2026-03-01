// src/store/slices/maintenanceSlice.js
// ─────────────────────────────────────────────────────────────────────────────
// Redux Toolkit slice for Hotel Maintenance & Room Repair.
//
// State shape
// ───────────
//   records             – all maintenance records array
//   summary             – { pending, inProgress, completed } counts object
//   selectedRecord      – single record for the detail / edit view
//   loading             – true while any thunk is in-flight
//   error               – last backend error message (null when clean)
//   statusUpdateMessage – contextual success message from status transitions
//                         e.g. "Maintenance completed. Room is now available."
//
// Thunks
// ──────
//   reportIssue               POST  /api/maintenance              (admin)
//   fetchAllMaintenanceRecords GET   /api/maintenance
//   fetchMaintenanceSummary   GET   /api/maintenance/summary
//   fetchMaintenanceById      GET   /api/maintenance/:id
//   updateMaintenanceStatus   PATCH /api/maintenance/:id/status   (admin)
//   assignStaff               PATCH /api/maintenance/:id/assign   (admin)
//   deleteMaintenanceRecord   DELETE /api/maintenance/:id         (admin)
// ─────────────────────────────────────────────────────────────────────────────
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';

// ─── Error extractor ──────────────────────────────────────────────────────────
// Surfaces the Express backend { message } field for all status codes,
// including the specific cases we must handle:
//   400 Bad Request → missing required fields (issueDescription, maintenanceStatus)
//   404 Not Found   → record or room does not exist
//   403 Forbidden   → attempt to delete a non-completed record
const extractError = (err) =>
  err.response?.data?.message ||
  err.response?.data?.error ||
  err.message ||
  'An unexpected error occurred';

// ─── Async Thunks ─────────────────────────────────────────────────────────────

/**
 * reportIssue  (Admin Only)
 * POST /api/maintenance
 * Body: { roomId, issueDescription, priority, assignedStaff }
 *
 * The backend automatically sets the linked room's status to 'maintenance'
 * when this record is created, so no separate room-status call is needed.
 *
 * 400 → "issueDescription is required" (or similar missing-field message)
 */
export const reportIssue = createAsyncThunk(
  'maintenance/reportIssue',
  async ({ roomId, issueDescription, priority, assignedStaff }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/maintenance', {
        roomId,
        issueDescription,
        priority,
        // assignedStaff is optional — omit the key entirely when not supplied
        ...(assignedStaff !== undefined && assignedStaff !== ''
          ? { assignedStaff }
          : {}),
      });
      return response.data.data.record ;
    } catch (err) {
      // Captures 400 "issueDescription is required"
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * fetchAllMaintenanceRecords
 * GET /api/maintenance
 * Query params (all optional): maintenanceStatus, priority, roomId, assignedStaff
 */
export const fetchAllMaintenanceRecords = createAsyncThunk(
  'maintenance/fetchAllMaintenanceRecords',
  async (filters = {}, { rejectWithValue }) => {
    try {
      // Strip keys that were not supplied by the caller so the URL stays clean
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')
      );
      console.log("PARAMS FILTERS FETCH MAIANTIEN",params)
      const response = await axiosInstance.get('/maintenance', { params });
      return response.data.data.records;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * fetchMaintenanceSummary
 * GET /api/maintenance/summary
 * Response shape: { pending: N, inProgress: N, completed: N }
 * (or the server may use snake_case keys — normalised below)
 */
export const fetchMaintenanceSummary = createAsyncThunk(
  'maintenance/fetchMaintenanceSummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/maintenance/summary');
      const data = response.data.data.summary;

      // Normalise both camelCase and snake_case server shapes into one object
      return {
        pending:    data.pending    ?? data.Pending    ?? 0,
        inProgress: data.inProgress ?? data.in_progress ?? data['in-progress'] ?? data.InProgress ?? 0,
        completed:  data.completed  ?? data.Completed  ?? 0,
      };
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * fetchMaintenanceById
 * GET /api/maintenance/:id
 */
export const fetchMaintenanceById = createAsyncThunk(
  'maintenance/fetchMaintenanceById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/maintenance/${id}`);
      return response.data.data.record ;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * updateMaintenanceStatus  (Admin Only)
 * PATCH /api/maintenance/:id/status
 * Body: { maintenanceStatus, assignedStaff }
 *
 * The backend returns a contextual `message` alongside the updated record:
 *   "Maintenance completed. Room is now available."
 *   "Status updated to in-progress."
 * This message is stored separately in state.statusUpdateMessage so the UI
 * can display it as a success banner without conflating it with errors.
 *
 * 400 → "maintenanceStatus is required"
 */
export const updateMaintenanceStatus = createAsyncThunk(
  'maintenance/updateMaintenanceStatus',
  async ({ id, maintenanceStatus, assignedStaff }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`/maintenance/${id}/status`, {
        maintenanceStatus,
        ...(assignedStaff !== undefined && assignedStaff !== ''
          ? { assignedStaff }
          : {}),
      });
      const data = response.data;
      return {
        record:  data.record  ?? data.maintenance ?? data,
        message: data.message ?? null,
      };
    } catch (err) {
      // Captures 400 "maintenanceStatus is required"
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * assignStaff  (Admin Only)
 * PATCH /api/maintenance/:id/assign
 * Body: { staffId }
 * Returns the updated record so we can sync state in-place.
 */
export const assignStaff = createAsyncThunk(
  'maintenance/assignStaff',
  async ({ id, staffId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`/maintenance/${id}/assign`, {
        staffId,
      });
      return response.data.data.record ?? response.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * deleteMaintenanceRecord  (Admin Only)
 * DELETE /api/maintenance/:id
 * Backend enforces that only 'completed' records may be deleted.
 * Returns the deleted id so the reducer can filter it out of state.
 *
 * 400 / 403 → "Only completed maintenance records can be deleted"
 */
export const deleteMaintenanceRecord = createAsyncThunk(
  'maintenance/deleteMaintenanceRecord',
  async (id, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/maintenance/${id}`);
      return id;
    } catch (err) {
      // Captures 403 "Only completed maintenance records can be deleted"
      return rejectWithValue(extractError(err));
    }
  }
);

// ─── Helper: in-place record update ──────────────────────────────────────────
// Replaces the matching record in the records array using MongoDB _id (id
// fallback). Merges rather than replacing wholesale so extra local fields
// (e.g. populated room/staff references) are preserved.
const replaceInRecords = (records, updatedRecord) =>
  records.map((rec) =>
    (rec._id ?? rec.id) === (updatedRecord._id ?? updatedRecord.id)
      ? { ...rec, ...updatedRecord }
      : rec
  );

// ─── Initial State ────────────────────────────────────────────────────────────
const initialState = {
  records:             [],
  summary:             { pending: 0, inProgress: 0, completed: 0 },
  selectedRecord:      null,
  loading:             false,
  error:               null,
  statusUpdateMessage: null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────
const maintenanceSlice = createSlice({
  name: 'maintenance',
  initialState,

  // ── Synchronous reducers ───────────────────────────────────────────────────
  reducers: {
    /** Dismiss an error banner without a network call */
    clearMaintenanceError(state) {
      state.error = null;
    },

    /**
     * Dismiss the status-transition success message after the UI has shown it
     * (e.g. after a toast auto-closes or the user navigates away).
     */
    clearStatusUpdateMessage(state) {
      state.statusUpdateMessage = null;
    },

    /** Clear the detail view when navigating away from a record page */
    clearSelectedRecord(state) {
      state.selectedRecord = null;
    },

    /** Full reset — call this on logout */
    resetMaintenance() {
      return initialState;
    },
  },

  // ── Async thunk reducers ───────────────────────────────────────────────────
  extraReducers: (builder) => {

    // ── reportIssue ───────────────────────────────────────────────────────────
    builder
      .addCase(reportIssue.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(reportIssue.fulfilled, (state, action) => {
        state.loading = false;
        // Prepend so the newest issue appears at the top of the list
        state.records.unshift(action.payload);
        // Optimistically increment the pending summary count
        state.summary.pending += 1;
        state.error = null;
      })
      .addCase(reportIssue.rejected, (state, action) => {
        state.loading = false;
        // Captures 400 "issueDescription is required"
        state.error = action.payload;
      });

    // ── fetchAllMaintenanceRecords ─────────────────────────────────────────────
    builder
      .addCase(fetchAllMaintenanceRecords.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchAllMaintenanceRecords.fulfilled, (state, action) => {
        state.loading  = false;
        state.records  = action.payload;
        state.error    = null;
      })
      .addCase(fetchAllMaintenanceRecords.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── fetchMaintenanceSummary ────────────────────────────────────────────────
    builder
      .addCase(fetchMaintenanceSummary.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchMaintenanceSummary.fulfilled, (state, action) => {
        state.loading  = false;
        state.summary  = action.payload;
        state.error    = null;
      })
      .addCase(fetchMaintenanceSummary.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── fetchMaintenanceById ──────────────────────────────────────────────────
    builder
      .addCase(fetchMaintenanceById.pending, (state) => {
        state.loading        = true;
        state.error          = null;
        state.selectedRecord = null;   // clear stale data while loading
      })
      .addCase(fetchMaintenanceById.fulfilled, (state, action) => {
        state.loading        = false;
        state.selectedRecord = action.payload;
        state.error          = null;
      })
      .addCase(fetchMaintenanceById.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── updateMaintenanceStatus ───────────────────────────────────────────────
    // Syncs the updated record in-place in state.records and selectedRecord.
    // Also captures the contextual transition message in statusUpdateMessage
    // and adjusts the summary counts to reflect the status change.
    builder
      .addCase(updateMaintenanceStatus.pending, (state) => {
        state.loading             = true;
        state.error               = null;
        state.statusUpdateMessage = null;
      })
      .addCase(updateMaintenanceStatus.fulfilled, (state, action) => {
        state.loading = false;
        const { record, message } = action.payload;

        // ── In-place list sync ───────────────────────────────────────────────
        const previous = state.records.find(
          (r) => (r._id ?? r.id) === (record._id ?? record.id)
        );
        state.records = replaceInRecords(state.records, record);

        // ── Detail view sync ─────────────────────────────────────────────────
        if (
          state.selectedRecord &&
          (state.selectedRecord._id ?? state.selectedRecord.id) ===
            (record._id ?? record.id)
        ) {
          state.selectedRecord = { ...state.selectedRecord, ...record };
        }

        // ── Summary count adjustment ─────────────────────────────────────────
        // Decrement the old status bucket and increment the new one so the
        // summary widget stays accurate without a separate API call.
        if (previous?.maintenanceStatus !== record.maintenanceStatus) {
          const dec = (key) => {
            if (state.summary[key] > 0) state.summary[key] -= 1;
          };
          const statusToKey = (s) => {
            if (s === 'pending')     return 'pending';
            if (s === 'in-progress') return 'inProgress';
            if (s === 'completed')   return 'completed';
            return null;
          };
          const oldKey = statusToKey(previous?.maintenanceStatus);
          const newKey = statusToKey(record.maintenanceStatus);
          if (oldKey) dec(oldKey);
          if (newKey) state.summary[newKey] = (state.summary[newKey] ?? 0) + 1;
        }

        // ── Contextual message ───────────────────────────────────────────────
        // Stored separately from error so the UI can display it as a success
        // banner (e.g. "Maintenance completed. Room is now available.")
        state.statusUpdateMessage = message;
        state.error = null;
      })
      .addCase(updateMaintenanceStatus.rejected, (state, action) => {
        state.loading = false;
        // Captures 400 "maintenanceStatus is required"
        state.error   = action.payload;
      });

    // ── assignStaff ───────────────────────────────────────────────────────────
    // Merges the returned record into state.records and selectedRecord so the
    // assigned staff member appears immediately without a re-fetch.
    builder
      .addCase(assignStaff.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(assignStaff.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload;

        // In-place list sync
        state.records = replaceInRecords(state.records, updated);

        // Detail view sync
        if (
          state.selectedRecord &&
          (state.selectedRecord._id ?? state.selectedRecord.id) ===
            (updated._id ?? updated.id)
        ) {
          state.selectedRecord = { ...state.selectedRecord, ...updated };
        }

        state.error = null;
      })
      .addCase(assignStaff.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── deleteMaintenanceRecord ───────────────────────────────────────────────
    // Filters the deleted record out of state.records and decrements the
    // completed summary count — no re-fetch required.
    builder
      .addCase(deleteMaintenanceRecord.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(deleteMaintenanceRecord.fulfilled, (state, action) => {
        state.loading     = false;
        const deletedId   = action.payload;

        state.records = state.records.filter(
          (r) => (r._id ?? r.id) !== deletedId
        );

        // Clear detail view if the deleted record was open
        if (
          state.selectedRecord &&
          (state.selectedRecord._id ?? state.selectedRecord.id) === deletedId
        ) {
          state.selectedRecord = null;
        }

        // Backend only permits deleting completed records → always decrement
        if (state.summary.completed > 0) state.summary.completed -= 1;

        state.error = null;
      })
      .addCase(deleteMaintenanceRecord.rejected, (state, action) => {
        state.loading = false;
        // Captures 403 "Only completed maintenance records can be deleted"
        state.error   = action.payload;
      });
  },
});

// ─── Action Exports ───────────────────────────────────────────────────────────
export const {
  clearMaintenanceError,
  clearStatusUpdateMessage,
  clearSelectedRecord,
  resetMaintenance,
} = maintenanceSlice.actions;

// ─── Selector Exports ─────────────────────────────────────────────────────────
export const selectMaintenanceRecords  = (state) => state.maintenance.records;
export const selectMaintenanceSummary  = (state) => state.maintenance.summary;
export const selectSelectedRecord      = (state) => state.maintenance.selectedRecord;
export const selectMaintenanceLoading  = (state) => state.maintenance.loading;
export const selectMaintenanceError    = (state) => state.maintenance.error;
export const selectStatusUpdateMessage = (state) => state.maintenance.statusUpdateMessage;

export default maintenanceSlice.reducer;
