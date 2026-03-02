// src/store/slices/servicesSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';

const extractError = (err) =>
  err.response?.data?.message ||
  err.response?.data?.error ||
  err.message ||
  'An unexpected error occurred';

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchAllServices = createAsyncThunk(
  'services/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get('/services');
      return res.data.data?.services ?? res.data.data ?? res.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const createService = createAsyncThunk(
  'services/create',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post('/services', payload);
      return res.data.data?.service ?? res.data.data ?? res.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const updateService = createAsyncThunk(
  'services/update',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.put(`/services/${id}`, updates);
      return res.data.data?.service ?? res.data.data ?? res.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const toggleServiceAvailability = createAsyncThunk(
  'services/toggleAvailability',
  async (id, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.patch(`/services/${id}/toggle`);
      return res.data.data?.service ?? res.data.data ?? res.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const deleteService = createAsyncThunk(
  'services/delete',
  async (id, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/services/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const attachServicesToBooking = createAsyncThunk(
  'services/attachToBooking',
  async ({ bookingId, serviceIds }, { rejectWithValue }) => {
    try {
      // console.log("SERVICE S ATTAHE",serviceIds)
      const response = await axiosInstance.post(
        `services/attach`,
        { bookingId,serviceIds }
      );
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message ?? err.message ?? 'Failed to attach services.'
      );
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const replaceById = (arr, updated) =>
  arr.map((item) =>
    (item._id ?? item.id) === (updated._id ?? updated.id)
      ? { ...item, ...updated }
      : item
  );

const initialState = {
  services: [],
  loading:  false,
  error:    null,
};

const servicesSlice = createSlice({
  name: 'services',
  initialState,
  reducers: {
    clearServicesError(state) { state.error = null; },
    resetServices() { return initialState; },
  },
  extraReducers: (builder) => {
    const pending   = (state) => { state.loading = true;  state.error = null; };
    const rejected  = (state, action) => { state.loading = false; state.error = action.payload; };

    builder
      .addCase(fetchAllServices.pending, pending)
      .addCase(fetchAllServices.fulfilled, (state, action) => {
        state.loading  = false;
        state.services = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchAllServices.rejected, rejected)

      .addCase(createService.pending, pending)
      .addCase(createService.fulfilled, (state, action) => {
        state.loading = false;
        state.services.unshift(action.payload);
      })
      .addCase(createService.rejected, rejected)

      .addCase(updateService.pending, pending)
      .addCase(updateService.fulfilled, (state, action) => {
        state.loading  = false;
        state.services = replaceById(state.services, action.payload);
      })
      .addCase(updateService.rejected, rejected)

      .addCase(toggleServiceAvailability.pending, pending)
      .addCase(toggleServiceAvailability.fulfilled, (state, action) => {
        state.loading  = false;
        state.services = replaceById(state.services, action.payload);
      })
      .addCase(toggleServiceAvailability.rejected, rejected)

      .addCase(deleteService.pending, pending)
      .addCase(deleteService.fulfilled, (state, action) => {
        state.loading  = false;
        state.services = state.services.filter(
          (s) => (s._id ?? s.id) !== action.payload
        );
      })
      .addCase(deleteService.rejected, rejected)

      .addCase(attachServicesToBooking.pending, pending)
      .addCase(attachServicesToBooking.fulfilled, (state) => { state.loading = false; })
      .addCase(attachServicesToBooking.rejected, rejected);
  },
});

export const { clearServicesError, resetServices } = servicesSlice.actions;

export const selectAllServices     = (state) => state.services.services;
export const selectServicesLoading = (state) => state.services.loading;
export const selectServicesError   = (state) => state.services.error;

export default servicesSlice.reducer;
