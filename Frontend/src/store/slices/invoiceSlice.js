// src/store/slices/invoiceSlice.js
// ─────────────────────────────────────────────────────────────────────────────
// Redux Toolkit slice for invoices & billing.
//
// State shape
// ───────────
//   invoices        – all invoices array (admin)
//   currentInvoice  – single invoice detail / guest view
//   invoicePreview  – live cost preview (no DB write)
//   loading         – true while any thunk is in-flight
//   previewLoading  – separate flag so the preview spinner doesn't block UI
//   error           – last error message (null when clean)
//
// Thunks
// ──────
//   previewInvoice        GET   /api/invoices/preview    (public, query params)
//   generateInvoice       POST  /api/invoices/generate   (admin)
//   getAllInvoices         GET   /api/invoices            (admin)
//   getInvoiceById        GET   /api/invoices/:id        (guest/admin — ownership enforced in controller)
//   getInvoiceByBookingId GET   /api/invoices/booking/:bookingId (guest/admin)
//   markInvoiceAsPaid     PATCH /api/invoices/:id/pay    (admin)
// ─────────────────────────────────────────────────────────────────────────────
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';

const extractError = (err) =>
  err.response?.data?.message ||
  err.response?.data?.error   ||
  err.message                 ||
  'An unexpected error occurred';

// ─── Thunks ───────────────────────────────────────────────────────────────────

/** Preview cost breakdown — public, GET with query params, no DB write */
export const previewInvoice = createAsyncThunk(
  'invoices/preview',
  async ({ pricePerNight, checkInDate, checkOutDate, serviceCharges = 0 }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get('/invoices/preview', {
        params: { pricePerNight, checkInDate, checkOutDate, serviceCharges },
      });
      return res.data.data ?? res.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/** Admin: generate (or fetch existing) invoice for a booking */
export const generateInvoice = createAsyncThunk(
  'invoices/generate',
  async ({ bookingId, serviceCharges = 0 }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post('/invoices/generate', {
        bookingId, serviceCharges,
      });
      return res.data.data?.invoice ?? res.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/** Admin: fetch all invoices with optional isPaid filter */
export const getAllInvoices = createAsyncThunk(
  'invoices/getAll',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')
      );
      const res = await axiosInstance.get('/invoices', { params });
      return res.data.data?.invoices ?? res.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/** Guest / Admin: get a single invoice by its own ID (ownership enforced in controller) */
export const getInvoiceById = createAsyncThunk(
  'invoices/getById',
  async (invoiceId, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get(`/invoices/${invoiceId}`);
      return res.data.data?.invoice ?? res.data;
    } catch (err) {
      // 403 → guest trying to view someone else's invoice
      return rejectWithValue(extractError(err));
    }
  }
);

/** Guest / Admin: get invoice for a specific booking */
export const getInvoiceByBookingId = createAsyncThunk(
  'invoices/getByBookingId',
  async (bookingId, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get(`/invoices/booking/${bookingId}`);
      return res.data.data?.invoice ?? res.data;
    } catch (err) {
      // 403 → guest trying to view someone else's invoice
      return rejectWithValue(extractError(err));
    }
  }
);

/** Admin: mark an invoice as paid */
export const markInvoiceAsPaid = createAsyncThunk(
  'invoices/markAsPaid',
  async (invoiceId, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.patch(`/invoices/${invoiceId}/pay`);
      return res.data.data?.invoice ?? res.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

// ─── Initial state ────────────────────────────────────────────────────────────
const initialState = {
  invoices:       [],
  currentInvoice: null,
  invoicePreview: null,
  loading:        false,
  previewLoading: false,
  error:          null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────
const invoiceSlice = createSlice({
  name: 'invoices',
  initialState,
  reducers: {
    clearInvoiceError(state)   { state.error          = null; },
    clearInvoicePreview(state) { state.invoicePreview  = null; },
    clearCurrentInvoice(state) { state.currentInvoice  = null; },
    resetInvoices()            { return initialState; },
  },
  extraReducers: (builder) => {

    // previewInvoice — uses dedicated previewLoading flag
    builder
      .addCase(previewInvoice.pending,   (state) => { state.previewLoading = true;  state.error = null; })
      .addCase(previewInvoice.fulfilled, (state, { payload }) => { state.previewLoading = false; state.invoicePreview = payload; })
      .addCase(previewInvoice.rejected,  (state, { payload }) => { state.previewLoading = false; state.error = payload; });

    // generateInvoice
    builder
      .addCase(generateInvoice.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(generateInvoice.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.currentInvoice = payload;
        // update in list if exists
        const idx = state.invoices.findIndex((i) => (i._id ?? i.id) === (payload._id ?? payload.id));
        if (idx >= 0) state.invoices[idx] = payload; else state.invoices.unshift(payload);
      })
      .addCase(generateInvoice.rejected,  (state, { payload }) => { state.loading = false; state.error = payload; });

    // getAllInvoices
    builder
      .addCase(getAllInvoices.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(getAllInvoices.fulfilled, (state, { payload }) => { state.loading = false; state.invoices = payload; })
      .addCase(getAllInvoices.rejected,  (state, { payload }) => { state.loading = false; state.error = payload; });

    // getInvoiceById
    builder
      .addCase(getInvoiceById.pending,   (state) => { state.loading = true;  state.error = null; state.currentInvoice = null; })
      .addCase(getInvoiceById.fulfilled, (state, { payload }) => { state.loading = false; state.currentInvoice = payload; })
      .addCase(getInvoiceById.rejected,  (state, { payload }) => { state.loading = false; state.error = payload; });

    // getInvoiceByBookingId
    builder
      .addCase(getInvoiceByBookingId.pending,   (state) => { state.loading = true;  state.error = null; state.currentInvoice = null; })
      .addCase(getInvoiceByBookingId.fulfilled, (state, { payload }) => { state.loading = false; state.currentInvoice = payload; })
      .addCase(getInvoiceByBookingId.rejected,  (state, { payload }) => { state.loading = false; state.error = payload; });

    // markInvoiceAsPaid
    builder
      .addCase(markInvoiceAsPaid.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(markInvoiceAsPaid.fulfilled, (state, { payload }) => {
        state.loading = false;
        const idx = state.invoices.findIndex((i) => (i._id ?? i.id) === (payload._id ?? payload.id));
        if (idx >= 0) state.invoices[idx] = payload;
        if (state.currentInvoice && (state.currentInvoice._id ?? state.currentInvoice.id) === (payload._id ?? payload.id))
          state.currentInvoice = payload;
      })
      .addCase(markInvoiceAsPaid.rejected,  (state, { payload }) => { state.loading = false; state.error = payload; });
  },
});

export const {
  clearInvoiceError,
  clearInvoicePreview,
  clearCurrentInvoice,
  resetInvoices,
} = invoiceSlice.actions;

export const selectInvoices       = (state) => state.invoices.invoices;
export const selectCurrentInvoice = (state) => state.invoices.currentInvoice;
export const selectInvoicePreview = (state) => state.invoices.invoicePreview;
export const selectInvoiceLoading = (state) => state.invoices.loading;
export const selectPreviewLoading = (state) => state.invoices.previewLoading;
export const selectInvoiceError   = (state) => state.invoices.error;

export default invoiceSlice.reducer;
