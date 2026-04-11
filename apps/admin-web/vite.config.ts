import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: true
  },
  resolve: {
    tsconfigPaths: true
  },
  plugins: [viteReact()]
})
