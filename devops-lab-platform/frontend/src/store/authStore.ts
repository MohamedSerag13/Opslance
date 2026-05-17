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
  setTokens: (token: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      setTokens: (token, refreshToken) => set({ token, refreshToken }),
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, token: null, refreshToken: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
