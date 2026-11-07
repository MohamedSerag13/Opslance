import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // keep the heavy admin-only spreadsheet lib and the animation lib out
        // of the entry chunk so the landing page parses fast
        manualChunks: {
          xlsx: ['xlsx'],
          'framer-motion': ['framer-motion'],
        },
      },
    },
  },
  server: {
    // 80 keeps parity with the compose nginx port; override for local dev, e.g.
    // VITE_DEV_PORT=5173 VITE_API_TARGET=http://127.0.0.1:8123 npx vite
    port: Number(process.env.VITE_DEV_PORT) || 80,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        // compose service name by default; override for local dev, e.g.
        // VITE_API_TARGET=http://127.0.0.1:8123 npx vite
        target: process.env.VITE_API_TARGET || 'http://backend:8000',
        changeOrigin: true,
        // the leaderboard streams live updates over /api/ws/events
        ws: true
      }
    }
  },
  // `vite preview` (used by the Playwright E2E suite) needs the same routing
  preview: {
    port: Number(process.env.VITE_PREVIEW_PORT) || 4178,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://backend:8000',
        changeOrigin: true,
        ws: true
      }
    }
  }
})
