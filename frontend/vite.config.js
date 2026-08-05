import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/video': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/comments': {
        target: 'http://localhost',
        changeOrigin: true,
      },
    },
  },
})
