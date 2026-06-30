import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

const CACHE_TTL = 30000;

export const submitVote = createAsyncThunk('votes/submitVote', async (voteData, { rejectWithValue }) => {
  try {
    const response = await api.post('/votes', voteData);
    return response.data.data || response.data;
  } catch (error) {
    return rejectWithValue({
      message: error.message,
      details: error.details || null,
    });
  }
});

export const fetchVotes = createAsyncThunk('votes/fetchVotes', async (params, { getState, rejectWithValue }) => {
  const state = getState().votes;
  if (!params?.force && state.dataLoaded && state.lastFetched && Date.now() - state.lastFetched < CACHE_TTL) {
    return { data: state.votes, cached: true };
  }
  try {
    const response = await api.get('/votes', { params });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const fetchVotesByMember = createAsyncThunk('votes/fetchVotesByMember', async (memberId, { rejectWithValue }) => {
  try {
    const response = await api.get(`/votes/member/${memberId}`);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

const initialState = {
  votes: [],
  currentVote: null,
  submissionStatus: 'idle',
  loading: false,
  error: null,
  dataLoaded: false,
  lastFetched: null,
};

const voteSlice = createSlice({
  name: 'votes',
  initialState,
  reducers: {
    resetSubmissionStatus: (state) => {
      state.submissionStatus = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitVote.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.submissionStatus = 'submitting';
      })
      .addCase(submitVote.fulfilled, (state, action) => {
        state.loading = false;
        state.submissionStatus = 'success';
        state.currentVote = action.payload.vote || action.payload.data || action.payload;
      })
      .addCase(submitVote.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.submissionStatus = 'error';
      })
      .addCase(fetchVotes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVotes.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.cached) return;
        state.votes = action.payload.votes || action.payload.data || action.payload || [];
        state.dataLoaded = true;
        state.lastFetched = Date.now();
      })
      .addCase(fetchVotes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchVotesByMember.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVotesByMember.fulfilled, (state, action) => {
        state.loading = false;
        state.votes = action.payload.votes || action.payload.data || action.payload || [];
      })
      .addCase(fetchVotesByMember.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { resetSubmissionStatus } = voteSlice.actions;
export default voteSlice.reducer;
