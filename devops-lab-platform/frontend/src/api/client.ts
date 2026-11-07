import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refresh_token = useAuthStore.getState().refreshToken;
        if (!refresh_token) {
          useAuthStore.getState().logout();
          return Promise.reject(error);
        }
        
        const { data } = await axios.post('/api/auth/refresh', { refresh_token });
        useAuthStore.getState().setTokens(data.access_token, data.refresh_token);
        
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return axios(originalRequest);
      } catch (err) {
        useAuthStore.getState().logout();
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Exchange the Bearer token for a one-time, 30-second WebSocket ticket
 * (POST /api/ws/ticket). Terminal tickets are pinned to one session id.
 * The long-lived JWT never appears in a WebSocket URL this way.
 */
export async function fetchWsTicket(scope: 'terminal' | 'events', sessionId?: string): Promise<string> {
  const { data } = await api.post('/ws/ticket', {
    scope,
    ...(sessionId ? { session_id: sessionId } : {}),
  });
  return data.ticket as string;
}
