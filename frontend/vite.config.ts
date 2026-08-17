import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  // La app vive bajo /v2 mientras convive con el sistema actual.
  base: '/v2/',
  build: {
    // Sale directo a public/v2 para que Express la sirva sin cambios de deploy.
    outDir: path.resolve(import.meta.dirname, '../public/v2'),
    emptyOutDir: true,
    rolldownOptions: {
      output: {
        // Recharts pesa más que toda la app junta. Separarlo evita que el
        // login —que no dibuja ni un gráfico— tenga que descargarlo.
        codeSplitting: {
          groups: [{ name: 'graficos', test: /node_modules[\\/](recharts|d3-|victory-)/ }],
        },
      },
    },
  },
  server: {
    // En desarrollo, /api va al Express real (puerto 3000 por defecto).
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})
