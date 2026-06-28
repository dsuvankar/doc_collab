import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { UserJWT } from '../../lib/types';

interface AuthState {
  user: UserJWT | null;
  token: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: UserJWT; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      if (typeof window !== "undefined") {
        localStorage.setItem("authToken", action.payload.token);
        localStorage.setItem("authUser", JSON.stringify(action.payload.user));
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      if (typeof window !== "undefined") {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
      }
    },
    loadAuth: (state) => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("authToken");
        const userStr = localStorage.getItem("authUser");
        if (token && userStr) {
          state.token = token;
          try {
            state.user = JSON.parse(userStr);
            state.isAuthenticated = true;
          } catch (e) {
            state.user = null;
            state.isAuthenticated = false;
          }
        }
      }
    },
  },
});

export const { setCredentials, logout, loadAuth } = authSlice.actions;
export default authSlice.reducer;
