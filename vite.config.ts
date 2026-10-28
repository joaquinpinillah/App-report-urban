import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// En GitHub Pages la app vive en /App-report-urban/; en local, en la raíz.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'VeredaViva',
        short_name: 'VeredaViva',
        description: 'Reporta baches, veredas rotas y obras inconclusas en Viña del Mar',
        lang: 'es-CL',
        theme_color: '#0b5394',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: base,
        scope: base,
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})
