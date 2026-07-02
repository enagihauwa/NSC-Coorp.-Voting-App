import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchActiveRunoffs = createAsyncThunk('runoffs/fetchActive', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/runoffs/active');
    return response.data.data || [];
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const fetchPositionRounds = createAsyncThunk('runoffs/fetchRounds', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/runoffs/rounds');
    return response.data.data || [];
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const fetchTies = createAsyncThunk('runoffs/fetchTies', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/runoffs/ties');
    return response.data.data || [];
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

const initialState = {
  activeRunoffs: [],
  rounds: [],
  ties: [],
  loading: false,
  error: null,
};

const runoffSlice = createSlice({
  name: 'runoffs',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchActiveRunoffs.fulfilled, (state, action) => {
        state.activeRunoffs = action.payload;
      })
      .addCase(fetchPositionRounds.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPositionRounds.fulfilled, (state, action) => {
        state.loading = false;
        state.rounds = action.payload;
      })
      .addCase(fetchPositionRounds.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchTies.fulfilled, (state, action) => {
        state.ties = action.payload;
      });
  },
});

export default runoffSlice.reducer;
