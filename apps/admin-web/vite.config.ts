import viteReact from '@vitejs/plugin-react'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  server: { port: 3000 },
  resolve: {
    tsconfigPaths: true
  },
  plugins: [tanstackStart(), viteReact()]
})
