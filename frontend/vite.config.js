import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const BACKEND = 'http://localhost:8000'
const WS_BACKEND = 'ws://localhost:8000'

const httpProxy = (target = BACKEND) => ({ target, changeOrigin: true })
const wsProxy   = (target = WS_BACKEND) => ({ target, ws: true, changeOrigin: true })

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/auth':         httpProxy(),
      '/cdr':          httpProxy(),
      '/supervisor':   httpProxy(),
      '/gamification': httpProxy(),
      '/reports':      httpProxy(),
      '/kb':           httpProxy(),
      '/admin':        httpProxy(),
      '/health':       httpProxy(),
      '/ws':           wsProxy(),
    },
  },
})
