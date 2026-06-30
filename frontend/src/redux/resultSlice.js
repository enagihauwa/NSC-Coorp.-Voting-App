import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

const CACHE_TTL = 30000;

export const fetchResults = createAsyncThunk('results/fetchResults', async (params, { getState, rejectWithValue }) => {
  const state = getState().results;
  if (!params?.force && state.resultsLoaded && state.resultsLastFetched && Date.now() - state.resultsLastFetched < CACHE_TTL) {
    return { data: state.results, cached: true };
  }
  try {
    const response = await api.get('/results');
    return response.data;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const fetchLocationResults = createAsyncThunk('results/fetchLocationResults', async (params, { getState, rejectWithValue }) => {
  const state = getState().results;
  if (!params?.force && state.locationLoaded && state.locationLastFetched && Date.now() - state.locationLastFetched < CACHE_TTL) {
    return { data: state.locationResults, cached: true };
  }
  try {
    const response = await api.get('/results/location');
    return response.data;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const fetchSummary = createAsyncThunk('results/fetchSummary', async (params, { getState, rejectWithValue }) => {
  const state = getState().results;
  if (!params?.force && state.summaryLoaded && state.summaryLastFetched && Date.now() - state.summaryLastFetched < CACHE_TTL) {
    return { data: state.summary, cached: true };
  }
  try {
    const response = await api.get('/results/summary');
    return response.data;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

const initialState = {
  results: [],
  locationResults: null,
  summary: null,
  loading: false,
  error: null,
  resultsLoaded: false,
  resultsLastFetched: null,
  locationLoaded: false,
  locationLastFetched: null,
  summaryLoaded: false,
  summaryLastFetched: null,
};

const resultSlice = createSlice({
  name: 'results',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchResults.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchResults.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.cached) return;
        state.results = action.payload.data || action.payload.results || [];
        state.resultsLoaded = true;
        state.resultsLastFetched = Date.now();
      })
      .addCase(fetchResults.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchLocationResults.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLocationResults.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.cached) return;
        state.locationResults = action.payload.data || action.payload;
        state.locationLoaded = true;
        state.locationLastFetched = Date.now();
      })
      .addCase(fetchLocationResults.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchSummary.pending, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchSummary.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.cached) return;
        state.summary = action.payload.data || action.payload;
        state.summaryLoaded = true;
        state.summaryLastFetched = Date.now();
      })
      .addCase(fetchSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default resultSlice.reducer;
