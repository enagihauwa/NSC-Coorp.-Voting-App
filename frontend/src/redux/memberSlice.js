import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

const CACHE_TTL = 30000;

export const fetchMembers = createAsyncThunk('members/fetchMembers', async (params, { getState, rejectWithValue }) => {
  const state = getState().members;
  if (!params?.force && state.dataLoaded && state.lastFetched && Date.now() - state.lastFetched < CACHE_TTL) {
    return { data: state.members, total: state.total, cached: true };
  }
  try {
    const response = await api.get('/members', { params });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const fetchMemberByStaffNumber = createAsyncThunk('members/fetchMemberByStaffNumber', async ({ staffNumber, fullname }, { rejectWithValue }) => {
  try {
    const response = await api.get(`/members/${encodeURIComponent(staffNumber)}`, {
      params: { fullname },
    });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || error.message);
  }
});

export const importMembers = createAsyncThunk('members/importMembers', async (formData, { rejectWithValue }) => {
  try {
    const response = await api.post('/members/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

const initialState = {
  members: [],
  currentMember: null,
  total: 0,
  loading: false,
  error: null,
  dataLoaded: false,
  lastFetched: null,
};

const memberSlice = createSlice({
  name: 'members',
  initialState,
  reducers: {
    clearCurrentMember: (state) => {
      state.currentMember = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMembers.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.cached) return;
        const payload = action.payload;
        state.members = payload.data || payload.members || payload || [];
        state.total = payload.pagination?.total || payload.total || state.members.length;
        state.dataLoaded = true;
        state.lastFetched = Date.now();
      })
      .addCase(fetchMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchMemberByStaffNumber.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMemberByStaffNumber.fulfilled, (state, action) => {
        state.loading = false;
        state.currentMember = action.payload.data || action.payload.member || action.payload;
      })
      .addCase(fetchMemberByStaffNumber.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(importMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(importMembers.fulfilled, (state) => {
        state.loading = false;
        state.lastFetched = null;
      })
      .addCase(importMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearCurrentMember, clearError } = memberSlice.actions;
export default memberSlice.reducer;
