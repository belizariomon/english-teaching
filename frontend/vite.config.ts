import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/english-teaching/',
  server: {
    proxy: {
      '/api': {
        target: 'https://english-teaching-03d2.onrender.com',
        changeOrigin: true,
      },
    },
  },
})
