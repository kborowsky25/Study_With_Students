import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // The Flask API (api/index.py) runs on 5001, as macOS reserves 5000 for AirPlay.
    // API_URL points the proxy elsewhere, e.g. a second checkout running its own API.
    proxy: {
      '/api': { target: process.env.API_URL || 'http://127.0.0.1:5001', changeOrigin: true },
    },
  },
})
