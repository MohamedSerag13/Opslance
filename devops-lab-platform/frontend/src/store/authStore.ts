import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  group_id?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  mustResetPassword: boolean;
  setTokens: (token: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  setMustResetPassword: (value: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      mustResetPassword: false,
      setTokens: (token, refreshToken) => set({ token, refreshToken }),
      setUser: (user) => set({ user }),
      setMustResetPassword: (value) => set({ mustResetPassword: value }),
      logout: () => set({ user: null, token: null, refreshToken: null, mustResetPassword: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
