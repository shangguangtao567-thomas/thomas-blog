import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // For GitHub Pages: set base to repo name if not using custom domain
  // e.g. base: '/thomas-blog/'
  // Leave as '/' if using custom domain or username.github.io repo
  base: '/',
})
