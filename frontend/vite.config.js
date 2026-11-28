import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Dev: requests to /api/* are proxied to the backend (default http://localhost:3000),
// because the backend has no CORS yet. Override with VITE_PROXY_TARGET.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: { proxy: { '/api': { target: env.VITE_PROXY_TARGET || 'http://localhost:3000', changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, '') } } },
  }
})
