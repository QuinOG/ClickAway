import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    include: ["@emotion/is-prop-valid"],
  },
  server: {
    // The backend sets the session as an httpOnly, SameSite=Lax cookie. Proxying
    // /api through the Vite dev server keeps the browser's view of frontend + API
    // as a single origin in development too, so the cookie behaves the same way
    // it will in production (where Express serves both from one origin) instead
    // of needing SameSite=None + Secure just to survive local http://localhost dev.
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_PROXY_TARGET || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
