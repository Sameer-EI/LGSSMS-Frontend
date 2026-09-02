import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import removeConsole from 'vite-plugin-remove-console'

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(),removeConsole()],
  build: {
    minify: 'esbuild',
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : []
    }
  }
}))
