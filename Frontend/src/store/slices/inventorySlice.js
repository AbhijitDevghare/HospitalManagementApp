// src/store/slices/inventorySlice.js
// ─────────────────────────────────────────────────────────────────────────────
// Redux Toolkit slice for Inventory Management.
//
// State shape
// ───────────
//   items           – full inventory array
//   alerts          – { count: Number, items: Array }  (low-stock alerts)
//   summary         – Array of category-grouped stats  [{ _id, total, ... }]
//   loading         – true while any thunk is in-flight
//   error           – last backend error message (null when clean)
//   lastAlertMessage– non-null when updateStock triggers a low-stock warning
//
// Thunks
// ──────
//   addInventoryItem   POST  /api/inventory                    (admin)
//   fetchAllItems      GET   /api/inventory
//   fetchLowStockAlerts GET  /api/inventory/alerts
//   fetchInventorySummary GET /api/inventory/summary
//   updateStock        PATCH /api/inventory/:id/stock          (admin)
//   updateItemDetails  PUT   /api/inventory/:id               (admin)
//   deleteItem         DELETE /api/inventory/:id              (admin)
// ─────────────────────────────────────────────────────────────────────────────
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';

// ─── Error extractor ──────────────────────────────────────────────────────────
// Surfaces the Express backend { message } field for all status codes,
// including the specific cases we must handle explicitly:
//   409 Conflict   → item with the same name already exists
//   400 Bad Request → insufficient stock for a 'remove' operation
const extractError = (err) =>
  err.response?.data?.message ||
  err.response?.data?.error ||
  err.message ||
  'An unexpected error occurred';

// ─── Async Thunks ─────────────────────────────────────────────────────────────

/**
 * addInventoryItem  (Admin Only)
 * POST /api/inventory
 * Body: { itemName, category, quantity, unit, lowStockThreshold }
 *
 * 409 → item with that name already exists — captured in state.error
 */
export const addInventoryItem = createAsyncThunk(
  'inventory/addInventoryItem',
  async (
    { itemName, category, quantity, unit, lowStockThreshold },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.post('/inventory', {
        itemName,
        category,
        quantity,
        unit,
        lowStockThreshold,
      });
      return response.data.data.item;
    } catch (err) {
      // 409 Conflict — "Item already exists"
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * fetchAllItems
 * GET /api/inventory
 * Query params (both optional):
 *   category  – string filter
 *   lowStock  – boolean string 'true' to return only below-threshold items
 */
export const fetchAllItems = createAsyncThunk(
  'inventory/fetchAllItems',
  async (filters = {}, { rejectWithValue }) => {
    try {
      // Strip keys that were not supplied by the caller
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')
      );
      const response = await axiosInstance.get('/inventory', { params });
      console.log("fetchAllItems",response)
      return response.data.data.items;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * fetchLowStockAlerts
 * GET /api/inventory/alerts
 * Response shape: { count: Number, items: [ { ...item, deficit: Number }, ... ] }
 */
export const fetchLowStockAlerts = createAsyncThunk(
  'inventory/fetchLowStockAlerts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/inventory/alerts');
      // Normalise: guarantee { count, items } shape regardless of response wrap
      const data = response.data.data;
      console.log("LOW STOCK ALREATS ",data)
      return {
        count: data.count  ?? data.items?.length ?? 0,
        items: data.items  ?? [],
      };
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * fetchInventorySummary
 * GET /api/inventory/summary
 * Response shape: Array of objects grouped by _id (category)
 *   e.g. [{ _id: 'Linen', totalItems, totalQuantity, lowStockCount }, ...]
 */
export const fetchInventorySummary = createAsyncThunk(
  'inventory/fetchInventorySummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/inventory/summary');
      return response.data.data.summary;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * updateStock  (Admin Only)
 * PATCH /api/inventory/:id/stock
 * Body: { operation: 'add' | 'remove', amount: Number }
 *
 * Response may include an optional `alert` field when the resulting quantity
 * falls below lowStockThreshold:
 *   { item: {...}, alert: { triggered: true, message: '...' } }
 *
 * 400 Bad Request → insufficient stock for a 'remove' operation
 */
export const updateStock = createAsyncThunk(
  'inventory/updateStock',
  async ({ id, operation, quantity }, { rejectWithValue }) => {
    try {
      console.log("AMOUN OF INVENTORU : ",id, operation, quantity)
      const response = await axiosInstance.patch(`/inventory/${id}/stock`, {
        operation,
        amount:quantity,
      });
      const data = response.data.data;
      return {
        item:         data.item  ?? data,
        // Normalise alert: present only when the threshold was crossed
        alertMessage:
          data.alert?.triggered && data.alert?.message
            ? data.alert.message
            : null,
      };
    } catch (err) {
      // 400 → "Insufficient stock" — captured in state.error
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * updateItemDetails  (Admin Only)
 * PUT /api/inventory/:id
 * Body: any subset of { itemName, category, lowStockThreshold, unit, ... }
 */
export const updateItemDetails = createAsyncThunk(
  'inventory/updateItemDetails',
  async ({ id, ...fields }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/inventory/${id}`, fields);
      return response.data.data.items;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * deleteItem  (Admin Only)
 * DELETE /api/inventory/:id
 * Returns the id that was deleted so we can splice it from state.
 */
export const deleteItem = createAsyncThunk(
  'inventory/deleteItem',
  async (id, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/inventory/${id}`);
      return id; // pass the id back so the reducer can filter it out
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

// ─── Helper: in-place array update ───────────────────────────────────────────
// Replaces the matching item in the items array using MongoDB _id (id fallback).
// Merges the incoming object rather than replacing wholesale so that any extra
// fields already in local state are preserved.
const replaceInItems = (items, updatedItem) =>
  items.map((item) =>
    (item._id ?? item.id) === (updatedItem._id ?? updatedItem.id)
      ? { ...item, ...updatedItem }
      : item
  );

// ─── Initial State ────────────────────────────────────────────────────────────
const initialState = {
  items:           [],
  alerts:          { count: 0, items: [] },
  summary:         [],
  loading:         false,
  error:           null,
  lastAlertMessage: null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────
const inventorySlice = createSlice({
  name: 'inventory',
  initialState,

  // ── Synchronous reducers ───────────────────────────────────────────────────
  reducers: {
    /** Dismiss an error banner without a network call */
    clearInventoryError(state) {
      state.error = null;
    },

    /** Dismiss the low-stock alert message after the UI has shown it */
    clearAlertMessage(state) {
      state.lastAlertMessage = null;
    },

    /** Full reset — call this on logout */
    resetInventory() {
      return initialState;
    },
  },

  // ── Async thunk reducers ───────────────────────────────────────────────────
  extraReducers: (builder) => {

    // ── addInventoryItem ──────────────────────────────────────────────────────
    builder
      .addCase(addInventoryItem.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(addInventoryItem.fulfilled, (state, action) => {
        state.loading = false;
        // Prepend so the new item appears at the top of the list
        state.items.unshift(action.payload);
        state.error = null;
      })
      .addCase(addInventoryItem.rejected, (state, action) => {
        state.loading = false;
        // Captures 409 "Item already exists" from the backend
        state.error = action.payload;
      });

    // ── fetchAllItems ─────────────────────────────────────────────────────────
    builder
      .addCase(fetchAllItems.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchAllItems.fulfilled, (state, action) => {
        state.loading = false;
        state.items   = action.payload;
        state.error   = null;
      })
      .addCase(fetchAllItems.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── fetchLowStockAlerts ───────────────────────────────────────────────────
    builder
      .addCase(fetchLowStockAlerts.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchLowStockAlerts.fulfilled, (state, action) => {
        state.loading = false;
        // Stores the full { count, items } object — items include the
        // `deficit` field injected by the backend aggregation
        state.alerts  = action.payload;
        state.error   = null;
      })
      .addCase(fetchLowStockAlerts.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── fetchInventorySummary ─────────────────────────────────────────────────
    builder
      .addCase(fetchInventorySummary.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchInventorySummary.fulfilled, (state, action) => {
        state.loading  = false;
        // Array of { _id (category), totalItems, totalQuantity, lowStockCount }
        state.summary  = action.payload;
        state.error    = null;
      })
      .addCase(fetchInventorySummary.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── updateStock ───────────────────────────────────────────────────────────
    // Syncs the updated item locally in state.items so the UI reflects the
    // new quantity and lastUpdatedDate without a full re-fetch.
    // Also captures any low-stock warning in state.lastAlertMessage.
    builder
      .addCase(updateStock.pending, (state) => {
        state.loading         = true;
        state.error           = null;
        state.lastAlertMessage = null;
      })
      .addCase(updateStock.fulfilled, (state, action) => {
        state.loading = false;
        const { item, alertMessage } = action.payload;

        // In-place update: merge new quantity + timestamps into the array
        state.items = replaceInItems(state.items, item);

        // Also sync the item inside alerts.items if it appears there
        state.alerts.items = replaceInItems(state.alerts.items, item);

        // Persist the low-stock warning message for the UI to display
        state.lastAlertMessage = alertMessage;
        state.error = null;
      })
      .addCase(updateStock.rejected, (state, action) => {
        state.loading = false;
        // Captures 400 "Insufficient stock" from the backend
        state.error = action.payload;
      });

    // ── updateItemDetails ─────────────────────────────────────────────────────
    // Merges the returned item into state.items so field changes (name,
    // category, threshold) are reflected immediately without a reload.
    builder
      .addCase(updateItemDetails.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(updateItemDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.items   = replaceInItems(state.items, action.payload);
        // Sync inside alerts list in case the threshold was changed
        state.alerts.items = replaceInItems(state.alerts.items, action.payload);
        state.error   = null;
      })
      .addCase(updateItemDetails.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── deleteItem ────────────────────────────────────────────────────────────
    // Filters the deleted item out of state.items and state.alerts.items
    // so the row disappears immediately without a re-fetch.
    builder
      .addCase(deleteItem.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(deleteItem.fulfilled, (state, action) => {
        state.loading = false;
        const deletedId = action.payload;
        state.items        = state.items.filter(
          (i) => (i._id ?? i.id) !== deletedId
        );
        state.alerts.items = state.alerts.items.filter(
          (i) => (i._id ?? i.id) !== deletedId
        );
        // Recount alerts after deletion
        state.alerts.count = state.alerts.items.length;
        state.error = null;
      })
      .addCase(deleteItem.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });
  },
});

// ─── Action Exports ───────────────────────────────────────────────────────────
export const {
  clearInventoryError,
  clearAlertMessage,
  resetInventory,
} = inventorySlice.actions;

// ─── Selector Exports ─────────────────────────────────────────────────────────
export const selectInventoryItems    = (state) => state.inventory.items;
export const selectLowStockAlerts    = (state) => state.inventory.alerts;
export const selectInventorySummary  = (state) => state.inventory.summary;
export const selectInventoryLoading  = (state) => state.inventory.loading;
export const selectInventoryError    = (state) => state.inventory.error;
export const selectLastAlertMessage  = (state) => state.inventory.lastAlertMessage;

export default inventorySlice.reducer;
