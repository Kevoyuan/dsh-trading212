import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: 'src/app',
  base: '/trading212/',
  build: {
    outDir: '../../lib/ui',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 4173,
  },
})
