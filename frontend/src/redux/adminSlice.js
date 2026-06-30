import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

const CACHE_TTL = 30000;

export const fetchDashboard = createAsyncThunk('admin/fetchDashboard', async (params, { getState, rejectWithValue }) => {
  const state = getState().admin;
  if (!params?.force && state.dashboardLoaded && state.dashboardFetched && Date.now() - state.dashboardFetched < CACHE_TTL) {
    return { data: state.stats, cached: true };
  }
  try {
    const response = await api.get('/dashboard');
    return response.data;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const fetchSettings = createAsyncThunk('admin/fetchSettings', async (params, { getState, rejectWithValue }) => {
  const state = getState().admin;
  if (!params?.force && state.settingsLoaded && state.settingsFetched && Date.now() - state.settingsFetched < CACHE_TTL) {
    return { data: { settings: state.settings }, cached: true };
  }
  try {
    const response = await api.get('/settings');
    return response.data;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const updateSetting = createAsyncThunk('admin/updateSetting', async ({ key, value }, { rejectWithValue }) => {
  try {
    const response = await api.put(`/settings/${key}`, { value });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const fetchLogs = createAsyncThunk('admin/fetchLogs', async (params, { rejectWithValue }) => {
  try {
    const response = await api.get('/settings/logs', { params });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

const initialState = {
  stats: null,
  settings: [],
  logs: [],
  loading: false,
  error: null,
  dashboardLoaded: false,
  dashboardFetched: null,
  settingsLoaded: false,
  settingsFetched: null,
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.cached) return;
        state.stats = action.payload.data || action.payload;
        state.dashboardLoaded = true;
        state.dashboardFetched = Date.now();
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.cached) return;
        const data = action.payload.data || action.payload.settings || {};
        if (Array.isArray(data)) {
          state.settings = data;
        } else if (typeof data === 'object' && data !== null) {
          state.settings = Object.entries(data).map(([key, value]) => ({ key, value }));
        } else {
          state.settings = [];
        }
        state.settingsLoaded = true;
        state.settingsFetched = Date.now();
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateSetting.pending, (state) => {
        state.error = null;
      })
      .addCase(updateSetting.fulfilled, (state, action) => {
        const updated = action.payload.data || action.payload;
        if (updated && updated.key) {
          const index = state.settings.findIndex((s) => s.key === updated.key);
          if (index !== -1) {
            state.settings[index] = updated;
          } else {
            state.settings.push(updated);
          }
        }
        state.settingsFetched = null;
      })
      .addCase(updateSetting.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(fetchLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLogs.fulfilled, (state, action) => {
        state.loading = false;
        const data = action.payload.data || action.payload.logs || [];
        state.logs = Array.isArray(data) ? data : [];
      })
      .addCase(fetchLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default adminSlice.reducer;
