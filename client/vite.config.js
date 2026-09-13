import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api/v1': process.env.LIFEMAXING_API_TARGET || 'http://localhost:5080',
      '/health': process.env.LIFEMAXING_API_TARGET || 'http://localhost:5080',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.js'],
    restoreMocks: true,
  },
})
