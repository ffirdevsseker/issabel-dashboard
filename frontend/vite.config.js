import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const BACKEND = 'http://localhost:5000'
const WS_BACKEND = 'ws://localhost:5000'

const httpProxy = (target = BACKEND) => ({ target, changeOrigin: true })
const wsProxy   = (target = WS_BACKEND) => ({ target, ws: true, changeOrigin: true })

// Tarayıcı navigasyonu (Accept: text/html) ise SPA'ya bırak, API isteğiyse backend'e gönder
const spaAwareProxy = (target = BACKEND) => ({
  target,
  changeOrigin: true,
  bypass: (req) => {
    if (req.headers.accept?.includes('text/html')) return '/index.html'
  },
})

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
      '/gamification': httpProxy(),
      '/reports':      httpProxy(),
      '/kb':           httpProxy(),
      '/health':       httpProxy(),
      '/dashboard':    httpProxy(),
      '/admin':        spaAwareProxy(),
      '/supervisor':   spaAwareProxy(),
      '/staff':        httpProxy(),
      '/ws':           wsProxy(),
    },
  },
})
