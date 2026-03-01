// src/store/slices/hotelServiceSlice.js
// ─────────────────────────────────────────────────────────────────────────────
// Redux Toolkit slice for Hotel Services management.
//
// State shape
// ───────────
//   availableServices – all hotel services array (public catalogue)
//   selectedService   – single service detail object
//   costBreakdown     – result of POST /services/breakdown (checkout preview)
//   loading           – true while any thunk is in-flight
//   error             – last backend error message (null when clean)
//
// Thunks
// ──────
//   fetchAllServices            GET   /api/services                  (public)
//   fetchServiceById            GET   /api/services/:id              (public)
//   getServiceCostBreakdown     POST  /api/services/breakdown        (auth, rate-limited)
//   attachServicesToBooking     POST  /api/services/attach           (auth, rate-limited)
//   createService               POST  /api/services                  (admin)
//   updateService               PUT   /api/services/:id              (admin)
//   toggleServiceAvailability   PATCH /api/services/:id/toggle       (admin)
//   deleteService               DELETE /api/services/:id             (admin)
// ─────────────────────────────────────────────────────────────────────────────
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';

// ─── Error extractor ──────────────────────────────────────────────────────────
// Surfaces the Express backend { message } field for all status codes,
// including the specific cases we must handle explicitly:
//   429 Too Many Requests → apiLimiter on breakdown / attach endpoints
//   400 Bad Request       → empty / invalid serviceIds array, missing fields
const extractError = (err) => {
  const status = err.response?.status;

  // ── 429 Rate limit ─────────────────────────────────────────────────────────
  // apiLimiter may send plain text rather than JSON
  if (status === 429) {
    return (
      err.response?.data?.message ||
      err.response?.data ||
      'Too many requests. Please wait a moment and try again.'
    );
  }

  // ── 400 Validation / bad serviceIds ────────────────────────────────────────
  if (status === 400) {
    return (
      err.response?.data?.message ||
      err.response?.data?.error  ||
      'Invalid request. Please check the provided service details.'
    );
  }

  // ── All other errors (401, 403, 404, 500…) ─────────────────────────────────
  return (
    err.response?.data?.message ||
    err.response?.data?.error  ||
    err.message                ||
    'An unexpected error occurred'
  );
};

// ─── Async Thunks ─────────────────────────────────────────────────────────────

/**
 * fetchAllServices  (Public)
 * GET /api/services
 * Query params (both optional): category, isAvailable
 */
export const fetchAllServices = createAsyncThunk(
  'hotelServices/fetchAllServices',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')
      );
      const response = await axiosInstance.get('/services', { params });
      return response.data.services ?? response.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * fetchServiceById  (Public)
 * GET /api/services/:id
 */
export const fetchServiceById = createAsyncThunk(
  'hotelServices/fetchServiceById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/services/${id}`);
      return response.data.service ?? response.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * getServiceCostBreakdown  (Authenticated, rate-limited)
 * POST /api/services/breakdown
 * Body: { serviceIds: [String] }
 *
 * Returns a cost preview for multiple services before the guest confirms
 * their selection. Stored in state.costBreakdown for the checkout UI.
 *
 * 429 → apiLimiter rate-limit
 * 400 → empty or invalid serviceIds array
 */
export const getServiceCostBreakdown = createAsyncThunk(
  'hotelServices/getServiceCostBreakdown',
  async (serviceIds, { rejectWithValue }) => {
    try {
      // Guard: prevent sending an empty array to the backend
      if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
        return rejectWithValue('Please select at least one service.');
      }
      const response = await axiosInstance.post('/services/breakdown', {
        serviceIds,
      });
      return response.data.breakdown ?? response.data;
    } catch (err) {
      // Captures 429 rate-limit and 400 empty / invalid serviceIds
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * attachServicesToBooking  (Authenticated, rate-limited)
 * POST /api/services/attach
 * Body: { bookingId: String, serviceIds: [String] }
 *
 * Response shape: { booking, attachedServices, additionalCharges }
 *
 * 429 → apiLimiter rate-limit
 * 400 → serviceIds empty / invalid, or bookingId missing
 */
export const attachServicesToBooking = createAsyncThunk(
  'hotelServices/attachServicesToBooking',
  async ({ bookingId, serviceIds }, { rejectWithValue }) => {
    try {
      if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
        return rejectWithValue('Please select at least one service to attach.');
      }
      const response = await axiosInstance.post('/services/attach', {
        bookingId,
        serviceIds,
      });
      const data = response.data;
      // Normalise the three-field response shape
      return {
        booking:           data.booking            ?? null,
        attachedServices:  data.attachedServices   ?? [],
        additionalCharges: data.additionalCharges  ?? 0,
      };
    } catch (err) {
      // Captures 429 rate-limit and 400 validation errors
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * createService  (Admin Only)
 * POST /api/services
 * Body: { name, category, price, description, isAvailable, … }
 */
export const createService = createAsyncThunk(
  'hotelServices/createService',
  async (serviceData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/services', serviceData);
      return response.data.service ?? response.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * updateService  (Admin Only)
 * PUT /api/services/:id
 * Body: any subset of service fields
 */
export const updateService = createAsyncThunk(
  'hotelServices/updateService',
  async ({ id, ...fields }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/services/${id}`, fields);
      return response.data.service ?? response.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * toggleServiceAvailability  (Admin Only)
 * PATCH /api/services/:id/toggle
 * Returns the updated service object with the flipped isAvailable value.
 */
export const toggleServiceAvailability = createAsyncThunk(
  'hotelServices/toggleServiceAvailability',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`/services/${id}/toggle`);
      return response.data.service ?? response.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * deleteService  (Admin Only)
 * DELETE /api/services/:id
 * Returns the deleted id for in-place array filtering.
 */
export const deleteService = createAsyncThunk(
  'hotelServices/deleteService',
  async (id, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/services/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

// ─── Helpers: in-place array operations ──────────────────────────────────────

/**
 * Replace the matching service in an array (merge so existing fields are kept).
 */
const replaceInServices = (services, updatedService) =>
  services.map((s) =>
    (s._id ?? s.id) === (updatedService._id ?? updatedService.id)
      ? { ...s, ...updatedService }
      : s
  );

/**
 * Filter the deleted service id out of an array.
 */
const filterServices = (services, deletedId) =>
  services.filter((s) => (s._id ?? s.id) !== deletedId);

// ─── Initial State ────────────────────────────────────────────────────────────
const initialState = {
  availableServices: [],
  selectedService:   null,
  costBreakdown:     null,
  loading:           false,
  error:             null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────
const hotelServiceSlice = createSlice({
  name: 'hotelServices',
  initialState,

  // ── Synchronous reducers ───────────────────────────────────────────────────
  reducers: {
    /** Dismiss an error banner without a network call */
    clearServiceError(state) {
      state.error = null;
    },

    /**
     * Clear the cost breakdown when the guest navigates away from checkout
     * or resets their service selection, preventing stale totals from showing.
     */
    clearCostBreakdown(state) {
      state.costBreakdown = null;
    },

    /** Clear the detail view when navigating away from a service page */
    clearSelectedService(state) {
      state.selectedService = null;
    },

    /** Full reset — call this on logout */
    resetHotelServices() {
      return initialState;
    },
  },

  // ── Async thunk reducers ───────────────────────────────────────────────────
  extraReducers: (builder) => {

    // ── fetchAllServices ──────────────────────────────────────────────────────
    builder
      .addCase(fetchAllServices.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchAllServices.fulfilled, (state, action) => {
        state.loading            = false;
        state.availableServices  = action.payload;
        state.error              = null;
      })
      .addCase(fetchAllServices.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── fetchServiceById ──────────────────────────────────────────────────────
    builder
      .addCase(fetchServiceById.pending, (state) => {
        state.loading         = true;
        state.error           = null;
        state.selectedService = null;   // clear stale data while loading
      })
      .addCase(fetchServiceById.fulfilled, (state, action) => {
        state.loading         = false;
        state.selectedService = action.payload;
        state.error           = null;
      })
      .addCase(fetchServiceById.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── getServiceCostBreakdown ───────────────────────────────────────────────
    // Stores the full breakdown object in its own dedicated field so it never
    // contaminates availableServices or selectedService state.
    builder
      .addCase(getServiceCostBreakdown.pending, (state) => {
        state.loading      = true;
        state.error        = null;
        state.costBreakdown = null;    // clear stale breakdown while loading
      })
      .addCase(getServiceCostBreakdown.fulfilled, (state, action) => {
        state.loading       = false;
        // Stored verbatim — the UI reads whatever the backend computes
        // e.g. { services: [...], subtotal, tax, total }
        state.costBreakdown = action.payload;
        state.error         = null;
      })
      .addCase(getServiceCostBreakdown.rejected, (state, action) => {
        state.loading       = false;
        // Captures 429 rate-limit and 400 empty/invalid serviceIds
        state.error         = action.payload;
        state.costBreakdown = null;
      });

    // ── attachServicesToBooking ───────────────────────────────────────────────
    // On success the costBreakdown is cleared — the attachment is confirmed so
    // the preview is no longer needed. The booking update is handled by the
    // bookingSlice; we only store the additionalCharges summary here for receipt
    // display if needed.
    builder
      .addCase(attachServicesToBooking.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(attachServicesToBooking.fulfilled, (state) => {
        state.loading       = false;
        // Clear the checkout preview — services are now attached to the booking
        state.costBreakdown = null;
        state.error         = null;
      })
      .addCase(attachServicesToBooking.rejected, (state, action) => {
        state.loading = false;
        // Captures 429 rate-limit and 400 validation errors
        state.error   = action.payload;
      });

    // ── createService ─────────────────────────────────────────────────────────
    builder
      .addCase(createService.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(createService.fulfilled, (state, action) => {
        state.loading = false;
        // Prepend so the newest service appears at the top of the catalogue
        state.availableServices.unshift(action.payload);
        // Surface immediately as selectedService for post-create detail view
        state.selectedService = action.payload;
        state.error = null;
      })
      .addCase(createService.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── updateService ─────────────────────────────────────────────────────────
    // Merges the updated service in-place in availableServices and syncs
    // selectedService if that service is currently open in the detail view.
    builder
      .addCase(updateService.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(updateService.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload;

        state.availableServices = replaceInServices(state.availableServices, updated);

        // Sync detail view if this service is currently open
        if (
          state.selectedService &&
          (state.selectedService._id ?? state.selectedService.id) ===
            (updated._id ?? updated.id)
        ) {
          state.selectedService = { ...state.selectedService, ...updated };
        }

        state.error = null;
      })
      .addCase(updateService.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── toggleServiceAvailability ─────────────────────────────────────────────
    // Flips isAvailable in-place in availableServices and selectedService so
    // the availability badge updates immediately without a full re-fetch.
    builder
      .addCase(toggleServiceAvailability.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(toggleServiceAvailability.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload;

        // In-place list sync — isAvailable flips to its new value
        state.availableServices = replaceInServices(state.availableServices, updated);

        // Sync detail view if this service is currently open
        if (
          state.selectedService &&
          (state.selectedService._id ?? state.selectedService.id) ===
            (updated._id ?? updated.id)
        ) {
          state.selectedService = { ...state.selectedService, ...updated };
        }

        state.error = null;
      })
      .addCase(toggleServiceAvailability.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── deleteService ─────────────────────────────────────────────────────────
    // Filters the deleted service out of availableServices and nulls
    // selectedService if that service was open in the detail view.
    builder
      .addCase(deleteService.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(deleteService.fulfilled, (state, action) => {
        state.loading     = false;
        const deletedId   = action.payload;

        state.availableServices = filterServices(state.availableServices, deletedId);

        // Clear detail view if the deleted service was open
        if (
          state.selectedService &&
          (state.selectedService._id ?? state.selectedService.id) === deletedId
        ) {
          state.selectedService = null;
        }

        state.error = null;
      })
      .addCase(deleteService.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });
  },
});

// ─── Action Exports ───────────────────────────────────────────────────────────
export const {
  clearServiceError,
  clearCostBreakdown,
  clearSelectedService,
  resetHotelServices,
} = hotelServiceSlice.actions;

// ─── Selector Exports ─────────────────────────────────────────────────────────
export const selectAvailableServices = (state) => state.hotelServices.availableServices;
export const selectSelectedService   = (state) => state.hotelServices.selectedService;
export const selectCostBreakdown     = (state) => state.hotelServices.costBreakdown;
export const selectServiceLoading    = (state) => state.hotelServices.loading;
export const selectServiceError      = (state) => state.hotelServices.error;

export default hotelServiceSlice.reducer;
