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

/**
 * Persisted to localStorage deliberately: closing the tab must not drop an
 * in-progress exam attempt or force a re-login mid-lab. Trade-off: tokens
 * survive the browser session. Mitigations server-side — short-lived access
 * tokens (30 min), refresh-token revocation on logout (Redis denylist), and
 * the brute-force throttle. The access token never appears in WebSocket
 * URLs: WS connections exchange it for a one-time 30s ticket first.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      mustResetPassword: false,
      setTokens: (token, refreshToken) => set({ token, refreshToken }),
      setUser: (user) => set({ user }),
      setMustResetPassword: (value) => set({ mustResetPassword: value }),
      logout: () => {
        // Best-effort server-side revocation (refresh-token denylist) before
        // the local state is cleared. Fire-and-forget: logging out must never
        // block on the network or surface an error.
        const { refreshToken } = get();
        if (refreshToken) {
          void fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          }).catch(() => {});
        }
        set({ user: null, token: null, refreshToken: null, mustResetPassword: false });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
