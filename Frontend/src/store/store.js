// src/store.js
// ─────────────────────────────────────────────────────────────────────────────
// Central Redux store.
// Add every new slice reducer here under its namespace key.
// ─────────────────────────────────────────────────────────────────────────────
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import bookingsReducer from './slices/bookingSlice';
import inventoryReducer from './slices/inventorySlice';
import invoiceReducer from './slices/invoiceSlice';
import maintenanceReducer from './slices/maintenanceSlice';
import paymentsReducer from './slices/paymentSlice';
import reviewsReducer from './slices/reviewSlice';
import roomsReducer from './slices/roomSlice';
import hotelServicesReducer from './slices/hotelServiceSlice';
import staffReducer from './slices/staffSlice';
import servicesReducer from './slices/servicesSlice';
import usersReducer    from './slices/userSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    bookings: bookingsReducer,
    inventory: inventoryReducer,
    invoices: invoiceReducer,
    maintenance: maintenanceReducer,
    payments: paymentsReducer,
    reviews: reviewsReducer,
    rooms: roomsReducer,
    hotelServices: hotelServicesReducer,
    staff: staffReducer,
    services: servicesReducer,
    users:    usersReducer,
  },

  // RTK includes redux-thunk by default; no extra middleware needed.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Allow non-serializable values (e.g. Date objects) in state if needed.
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),

  devTools: process.env.NODE_ENV !== 'production',
});

export default store;
