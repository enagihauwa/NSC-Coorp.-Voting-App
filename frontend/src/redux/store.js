import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import memberReducer from './memberSlice';
import candidateReducer from './candidateSlice';
import voteReducer from './voteSlice';
import resultReducer from './resultSlice';
import adminReducer from './adminSlice';
import runoffReducer from './runoffSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    members: memberReducer,
    candidates: candidateReducer,
    votes: voteReducer,
    results: resultReducer,
    admin: adminReducer,
    runoffs: runoffReducer,
  },
  devTools: true,
});

export default store;
