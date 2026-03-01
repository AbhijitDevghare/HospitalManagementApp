// src/store/slices/userSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';

const extractError = (err) =>
  err.response?.data?.message ||
  err.response?.data?.error ||
  err.message ||
  'An unexpected error occurred';

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchAllUsers = createAsyncThunk(
  'users/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get('/users', { params });
      return res.data.data?.users ?? res.data.data ?? res.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const searchUsers = createAsyncThunk(
  'users/search',
  async ({ query }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get('/users/search', { params: { q: query } });
      return res.data.data?.users ?? res.data.data ?? res.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const fetchUserById = createAsyncThunk(
  'users/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get(`/users/${id}`);
      return res.data.data?.user ?? res.data.data ?? res.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const updateUser = createAsyncThunk(
  'users/update',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.patch(`/users/${id}`, updates);
      return res.data.data?.user ?? res.data.data ?? res.data;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const deleteUser = createAsyncThunk(
  'users/delete',
  async (id, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/users/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const initialState = {
  users:         [],
  searchResults: [],
  selectedUser:  null,
  loading:       false,
  error:         null,
};

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearUserError(state)    { state.error = null; },
    clearSelectedUser(state) { state.selectedUser = null; },
    clearSearchResults(state){ state.searchResults = []; },
    resetUsers()             { return initialState; },
  },
  extraReducers: (builder) => {
    const pending  = (state) => { state.loading = true;  state.error = null; };
    const rejected = (state, action) => { state.loading = false; state.error = action.payload; };

    builder
      .addCase(fetchAllUsers.pending, pending)
      .addCase(fetchAllUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users   = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchAllUsers.rejected, rejected)

      .addCase(searchUsers.pending, pending)
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.loading       = false;
        state.searchResults = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(searchUsers.rejected, rejected)

      .addCase(fetchUserById.pending, pending)
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.loading      = false;
        state.selectedUser = action.payload;
      })
      .addCase(fetchUserById.rejected, rejected)

      .addCase(updateUser.pending, pending)
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false;
        state.users   = state.users.map((u) =>
          (u._id ?? u.id) === (action.payload._id ?? action.payload.id)
            ? { ...u, ...action.payload }
            : u
        );
      })
      .addCase(updateUser.rejected, rejected)

      .addCase(deleteUser.pending, pending)
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.loading = false;
        state.users   = state.users.filter((u) => (u._id ?? u.id) !== action.payload);
      })
      .addCase(deleteUser.rejected, rejected);
  },
});

export const {
  clearUserError, clearSelectedUser, clearSearchResults, resetUsers,
} = userSlice.actions;

export const selectAllUsers        = (state) => state.users.users;
export const selectUserSearchResults = (state) => state.users.searchResults;
export const selectSelectedUser    = (state) => state.users.selectedUser;
export const selectUsersLoading    = (state) => state.users.loading;
export const selectUsersError      = (state) => state.users.error;

export default userSlice.reducer;
