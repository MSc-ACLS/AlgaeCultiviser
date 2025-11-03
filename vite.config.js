import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/AlgaeCultiviser/',
  server: {
    proxy: {
      // proxy all requests under /mirco/api to the remote host
      '/mirco/api': {
        target: 'https://acls.ulozezoz.myhostpoint.ch',
        changeOrigin: true,
        secure: true,
        // optionally rewrite the path if your target expects a different base
        // rewrite: (path) => path.replace(/^\/mirco\/api/, '/mirco/api')
      },
    },
  }
})