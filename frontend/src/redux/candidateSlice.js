import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

const CACHE_TTL = 30000;

export const fetchCandidates = createAsyncThunk('candidates/fetchCandidates', async (params, { getState, rejectWithValue }) => {
  const state = getState().candidates;
  if (!params?.force && state.dataLoaded && state.lastFetched && Date.now() - state.lastFetched < CACHE_TTL) {
    return { data: state.candidates, cached: true };
  }
  try {
    const response = await api.get('/candidates', { params });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const createCandidate = createAsyncThunk('candidates/createCandidate', async (formData, { rejectWithValue }) => {
  try {
    const response = await api.post('/candidates', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const updateCandidate = createAsyncThunk('candidates/updateCandidate', async ({ id, data }, { rejectWithValue }) => {
  try {
    const response = await api.put(`/candidates/${id}`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const deleteCandidate = createAsyncThunk('candidates/deleteCandidate', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/candidates/${id}`);
    return id;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const toggleCandidateStatus = createAsyncThunk('candidates/toggleCandidateStatus', async (id, { rejectWithValue }) => {
  try {
    const response = await api.patch(`/candidates/${id}/status`);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

const initialState = {
  candidates: [],
  currentCandidate: null,
  loading: false,
  error: null,
  dataLoaded: false,
  lastFetched: null,
};

const candidateSlice = createSlice({
  name: 'candidates',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCandidates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCandidates.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.cached) return;
        const payload = action.payload;
        state.candidates = payload.data || payload.candidates || payload || [];
        state.dataLoaded = true;
        state.lastFetched = Date.now();
      })
      .addCase(fetchCandidates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createCandidate.fulfilled, (state, action) => {
        const candidate = action.payload.candidate || action.payload.data || action.payload;
        if (candidate) state.candidates.push(candidate);
        state.lastFetched = null;
      })
      .addCase(updateCandidate.fulfilled, (state, action) => {
        const updated = action.payload.candidate || action.payload.data || action.payload;
        const index = state.candidates.findIndex((c) => c._id === updated._id || c.id === updated.id);
        if (index !== -1) state.candidates[index] = updated;
        state.lastFetched = null;
      })
      .addCase(deleteCandidate.fulfilled, (state, action) => {
        state.candidates = state.candidates.filter((c) => c._id !== action.payload && c.id !== action.payload);
        state.lastFetched = null;
      })
      .addCase(toggleCandidateStatus.fulfilled, (state, action) => {
        const updated = action.payload.candidate || action.payload.data || action.payload;
        const index = state.candidates.findIndex((c) => c._id === updated._id || c.id === updated.id);
        if (index !== -1) state.candidates[index] = updated;
        state.lastFetched = null;
      });
  },
});

export default candidateSlice.reducer;
