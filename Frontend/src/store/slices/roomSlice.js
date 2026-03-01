// src/store/slices/roomSlice.js
// ─────────────────────────────────────────────────────────────────────────────
// Redux Toolkit slice for Room Management.
//
// State shape
// ───────────
//   rooms              – all rooms array (admin management view)
//   availableRooms     – date-filtered rooms array (booking / guest view)
//   currentRoom        – single room detail object
//   availabilityStatus – result of a specific room availability check
//   loading            – true while any thunk is in-flight
//   error              – last backend error message (null when clean)
//
// Thunks
// ──────
//   fetchAllRooms                GET   /api/rooms
//   fetchAvailableRooms          GET   /api/rooms/available
//   fetchRoomById                GET   /api/rooms/:id
//   checkSpecificRoomAvailability GET  /api/rooms/:id/availability
//   createRoom                   POST  /api/rooms              (admin, FormData)
//   updateRoom                   PUT   /api/rooms/:id          (admin, FormData)
//   updateRoomStatus             PATCH /api/rooms/:id/status   (admin)
//   deleteRoom                   DELETE /api/rooms/:id         (admin)
// ─────────────────────────────────────────────────────────────────────────────
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';

// ─── Error extractor ──────────────────────────────────────────────────────────
// Surfaces the Express backend { message } field for all status codes,
// including the specific cases we must handle:
//   400 Bad Request  → missing checkIn/checkOut, invalid status value,
//                      validation failures on room fields
//   413 Payload Too Large → uploadLimiter file size exceeded
//   429 Too Many Requests → uploadLimiter request rate exceeded
const extractError = (err) => {
  const status = err.response?.status;

  // ── 413 File too large ─────────────────────────────────────────────────────
  if (status === 413) {
    return (
      err.response?.data?.message ||
      'Upload failed: one or more files exceed the maximum allowed size.'
    );
  }

  // ── 429 Upload rate limit ──────────────────────────────────────────────────
  if (status === 429) {
    return (
      err.response?.data?.message ||
      err.response?.data ||
      'Too many upload requests. Please wait a moment and try again.'
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

// ─── FormData builder ─────────────────────────────────────────────────────────
/**
 * Converts a plain fields object + optional images array into a FormData
 * instance ready for multipart/form-data submission.
 *
 * @param {Object} fields  - scalar room fields (roomType, price, etc.)
 * @param {File[]} [images] - File objects from an <input type="file"> element
 * @returns {FormData}
 */
const buildRoomFormData = (fields, images = []) => {
  const fd = new FormData();

  // Append all scalar fields — skip undefined / null values
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      // Arrays (e.g. amenities) must be JSON-stringified so Express can parse
      fd.append(key, Array.isArray(value) ? JSON.stringify(value) : value);
    }
  });

  // Append each image under the 'images' key that uploadMultiple expects
  images.forEach((file) => fd.append('images', file));

  return fd;
};

// ─── Async Thunks ─────────────────────────────────────────────────────────────

/**
 * fetchAllRooms  (Admin / Public)
 * GET /api/rooms
 * Query params (all optional): roomType, status, minPrice, maxPrice, maxOccupancy
 */
export const fetchAllRooms = createAsyncThunk(
  'rooms/fetchAllRooms',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')
      );
      const response = await axiosInstance.get('/rooms', { params });
      console.log("rooomsa",response)
      const data = response.data.data.rooms ;
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * fetchAvailableRooms
 * GET /api/rooms/available
 * Required: checkInDate, checkOutDate
 * Optional: roomType, minPrice, maxPrice, maxOccupancy
 *
 * 400 → missing checkInDate or checkOutDate
 */
export const fetchAvailableRooms = createAsyncThunk(
  'rooms/fetchAvailableRooms',
  async (
    { checkInDate, checkOutDate, roomType, minPrice, maxPrice, maxOccupancy } = {},
    { rejectWithValue }
  ) => {
    try {
      // Required params are always sent; optional ones are stripped if absent
      const params = {
        checkInDate,
        checkOutDate,
        ...Object.fromEntries(
          Object.entries({ roomType, minPrice, maxPrice, maxOccupancy }).filter(
            ([, v]) => v !== undefined && v !== ''
          )
        ),
      };
      const response = await axiosInstance.get('/rooms/available', { params });
     console.log("ROOMS availability",response)

      const data = response.data.data.rooms ?? response.data;
      console.log("ROOMS availability",data)
      return Array.isArray(data) ? data : [];
    } catch (err) {
      // Captures 400 "checkInDate and checkOutDate are required"
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * fetchRoomById
 * GET /api/rooms/:id
 */
export const fetchRoomById = createAsyncThunk(
  'rooms/fetchRoomById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/rooms/${id}`);
      console.log("REPSONES room fetched by id: ",response)
      return response.data.data.room ?? response.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * checkSpecificRoomAvailability
 * GET /api/rooms/:id/availability
 * Required query params: checkInDate, checkOutDate
 *
 * Response shape is stored verbatim in state.availabilityStatus so the UI
 * can render whatever the backend returns (available, conflict dates, etc.)
 *
 * 400 → missing required date params
 */
export const checkSpecificRoomAvailability = createAsyncThunk(
  'rooms/checkSpecificRoomAvailability',
  async ({ id, checkInDate, checkOutDate }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/rooms/${id}/availability`, {
        params: { checkInDate, checkOutDate },
      });
      // console.log("ROOMS availability : ",response)
      return response?.data?.data;
    } catch (err) {
      // Captures 400 "checkInDate and checkOutDate are required"
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * createRoom  (Admin Only)
 * POST /api/rooms
 * Sends multipart/form-data to support uploadMultiple image middleware.
 *
 * @param {Object} roomData  - scalar fields: roomNumber, roomType, price,
 *                             maxOccupancy, description, amenities, status, …
 * @param {File[]} images    - array of File objects from the file input
 *
 * 400 → missing required fields or validation error
 * 413 → file(s) exceed uploadLimiter size cap
 * 429 → uploadLimiter request rate exceeded
 */
export const createRoom = createAsyncThunk(
  'rooms/createRoom',
  async (formData, { rejectWithValue }) => {
    try {
      // console.log(formData)
      // return;
      const res = await axiosInstance.post("/rooms", formData, {
  headers: { "Content-Type": "multipart/form-data" }
});
      return res.data.data.room ?? res.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * updateRoom  (Admin Only)
 * PUT /api/rooms/:id
 * Sends multipart/form-data so new images can be appended alongside
 * updated scalar fields in a single request.
 *
 * @param {string} id        - room MongoDB ObjectId
 * @param {Object} roomData  - fields to update (partial allowed)
 * @param {File[]} images    - new image File objects to append (may be empty)
 */
export const updateRoom = createAsyncThunk(
  'rooms/updateRoom',
  async ({ id, formData }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(
        `/rooms/${id}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      return response.data.data.room ?? response.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);
/**
 * updateRoomStatus  (Admin Only)
 * PATCH /api/rooms/:id/status
 * Body (JSON): { status }
 *
 * 400 → invalid status value (not in enum)
 */
export const updateRoomStatus = createAsyncThunk(
  'rooms/updateRoomStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`/rooms/${id}/status`, {
        status,
      });
      return response.data.data.room ?? response.data;
    } catch (err) {
      // Captures 400 "Invalid status value"
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * deleteRoom  (Admin Only)
 * DELETE /api/rooms/:id
 * Returns the deleted id for in-place array filtering.
 */
export const deleteRoom = createAsyncThunk(
  'rooms/deleteRoom',
  async (id, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/rooms/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

// ─── Helpers: in-place array operations ──────────────────────────────────────

/**
 * Replace the matching room in an array (merge so populated refs are kept).
 */
const replaceInRooms = (rooms, updatedRoom) =>
  rooms.map((r) =>
    (r._id ?? r.id) === (updatedRoom._id ?? updatedRoom.id)
      ? { ...r, ...updatedRoom }
      : r
  );

/**
 * Filter the deleted room id out of an array.
 */
const filterRooms = (rooms, deletedId) =>
  rooms.filter((r) => (r._id ?? r.id) !== deletedId);

// ─── Initial State ────────────────────────────────────────────────────────────
const initialState = {
  rooms:              [],
  availableRooms:     [],
  currentRoom:        null,
  availabilityStatus: null,
  loading:            false,
  error:              null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────
const roomSlice = createSlice({
  name: 'rooms',
  initialState,

  // ── Synchronous reducers ───────────────────────────────────────────────────
  reducers: {
    /** Dismiss an error banner without a network call */
    clearRoomError(state) {
      state.error = null;
    },

    /**
     * Clear the availability check result when the user changes dates or
     * navigates away — prevents a stale "available" badge from showing.
     */
    clearAvailabilityStatus(state) {
      state.availabilityStatus = null;
    },

    /** Clear the detail view when navigating away from a room page */
    clearCurrentRoom(state) {
      state.currentRoom = null;
    },

    /**
     * Clear available-rooms results when the booking search is reset,
     * preventing stale results from a previous date search from showing.
     */
    clearAvailableRooms(state) {
      state.availableRooms = [];
    },

    /** Full reset — call this on logout */
    resetRooms() {
      return initialState;
    },
  },

  // ── Async thunk reducers ───────────────────────────────────────────────────
  extraReducers: (builder) => {

    // ── fetchAllRooms ─────────────────────────────────────────────────────────
    builder
      .addCase(fetchAllRooms.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchAllRooms.fulfilled, (state, action) => {
        state.loading = false;
        state.rooms   = Array.isArray(action.payload) ? action.payload : [];
        state.error   = null;
      })
      .addCase(fetchAllRooms.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── fetchAvailableRooms ───────────────────────────────────────────────────
    builder
      .addCase(fetchAvailableRooms.pending, (state) => {
        state.loading        = true;
        state.error          = null;
        state.availableRooms = [];    // clear stale results while loading
      })
      .addCase(fetchAvailableRooms.fulfilled, (state, action) => {
        state.loading        = false;
        state.availableRooms = Array.isArray(action.payload) ? action.payload : [];
        state.error          = null;
      })
      .addCase(fetchAvailableRooms.rejected, (state, action) => {
        state.loading = false;
        // Captures 400 "checkInDate and checkOutDate are required"
        state.error   = action.payload;
      });

    // ── fetchRoomById ─────────────────────────────────────────────────────────
    builder
      .addCase(fetchRoomById.pending, (state) => {
        state.loading     = true;
        state.error       = null;
        state.currentRoom = null;   // clear stale room while loading
      })
      .addCase(fetchRoomById.fulfilled, (state, action) => {
        state.loading     = false;
        state.currentRoom = action.payload;
        state.error       = null;
      })
      .addCase(fetchRoomById.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── checkSpecificRoomAvailability ─────────────────────────────────────────
    builder
      .addCase(checkSpecificRoomAvailability.pending, (state) => {
        state.loading            = true;
        state.error              = null;
        state.availabilityStatus = null;  // clear previous result
      })
      .addCase(checkSpecificRoomAvailability.fulfilled, (state, action) => {
        state.loading            = false;
        // Stored verbatim — shape is defined by the backend
        // e.g. { available: true } or { available: false, conflictDates: [...] }
        state.availabilityStatus = action.payload;
        state.error              = null;
      })
      .addCase(checkSpecificRoomAvailability.rejected, (state, action) => {
        state.loading = false;
        // Captures 400 "checkInDate and checkOutDate are required"
        state.error   = action.payload;
      });

    // ── createRoom ────────────────────────────────────────────────────────────
    builder
      .addCase(createRoom.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(createRoom.fulfilled, (state, action) => {
        state.loading = false;
        // Prepend so the newest room appears at the top of the management list
        state.rooms.unshift(action.payload);
        // Surface immediately as currentRoom for post-create detail view
        state.currentRoom = action.payload;
        state.error = null;
      })
      .addCase(createRoom.rejected, (state, action) => {
        state.loading = false;
        // Captures 400 validation, 413 file size, 429 upload rate-limit
        state.error = action.payload;
      });

    // ── updateRoom ────────────────────────────────────────────────────────────
    // Merges updated room in-place in both state.rooms and state.availableRooms
    // so the management table and booking grid both reflect the change.
    builder
      .addCase(updateRoom.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(updateRoom.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload;
        console.log("UPDATED ROMM : ",action.payload)

        state.rooms          = replaceInRooms(state.rooms,          updated);
        state.availableRooms = replaceInRooms(state.availableRooms, updated);

        // Keep detail view in sync if this room is currently open
        if (
          state.currentRoom &&
          (state.currentRoom._id ?? state.currentRoom.id) ===
            (updated._id ?? updated.id)
        ) {
          state.currentRoom = { ...state.currentRoom, ...updated };
        }

        state.error = null;
      })
      .addCase(updateRoom.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── updateRoomStatus ──────────────────────────────────────────────────────
    // Updates the status badge in-place in BOTH arrays and currentRoom so
    // the management table and any open detail view reflect the change
    // immediately without a full re-fetch.
    builder
      .addCase(updateRoomStatus.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(updateRoomStatus.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload;

        state.rooms          = replaceInRooms(state.rooms,          updated);
        state.availableRooms = replaceInRooms(state.availableRooms, updated);

        // Sync detail view if the same room is currently open
        if (
          state.currentRoom &&
          (state.currentRoom._id ?? state.currentRoom.id) ===
            (updated._id ?? updated.id)
        ) {
          state.currentRoom = { ...state.currentRoom, ...updated };
        }

        state.error = null;
      })
      .addCase(updateRoomStatus.rejected, (state, action) => {
        state.loading = false;
        // Captures 400 "Invalid status value"
        state.error   = action.payload;
      });

    // ── deleteRoom ────────────────────────────────────────────────────────────
    // Filters the deleted room out of BOTH arrays and nulls currentRoom
    // if that room was open in the detail view.
    builder
      .addCase(deleteRoom.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(deleteRoom.fulfilled, (state, action) => {
        state.loading    = false;
        const deletedId  = action.payload;

        state.rooms          = filterRooms(state.rooms,          deletedId);
        state.availableRooms = filterRooms(state.availableRooms, deletedId);

        // Clear detail view if the deleted room was open
        if (
          state.currentRoom &&
          (state.currentRoom._id ?? state.currentRoom.id) === deletedId
        ) {
          state.currentRoom = null;
        }

        state.error = null;
      })
      .addCase(deleteRoom.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });
  },
});

// ─── Action Exports ───────────────────────────────────────────────────────────
export const {
  clearRoomError,
  clearAvailabilityStatus,
  clearCurrentRoom,
  clearAvailableRooms,
  resetRooms,
} = roomSlice.actions;

// ─── Selector Exports ─────────────────────────────────────────────────────────
export const selectRooms              = (state) => state.rooms.rooms;
export const selectAvailableRooms     = (state) => state.rooms.availableRooms;
export const selectCurrentRoom        = (state) => state.rooms.currentRoom;
export const selectAvailabilityStatus = (state) => state.rooms.availabilityStatus;
export const selectRoomLoading        = (state) => state.rooms.loading;
export const selectRoomError          = (state) => state.rooms.error;

export default roomSlice.reducer;
