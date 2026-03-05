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
  // GitHub Pages sub-path deployment: base must match the repo name
  // Change to '/' if using a custom domain or username.github.io repo
  base: '/thomas-blog/',
})
