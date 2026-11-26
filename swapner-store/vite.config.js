import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const proxy = { '/api': 'http://localhost:3001', '/uploads': 'http://localhost:3001' }

export default defineConfig({
  base: './',
  plugins: [react()],
  // any domain / tunnel host is allowed (dev and preview)
  server: { host: true, allowedHosts: true, proxy },
  preview: { host: true, allowedHosts: true, proxy },
})
