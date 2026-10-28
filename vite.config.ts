import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Reporta Viña',
        short_name: 'Reporta Viña',
        description: 'Reporta baches, veredas rotas y obras inconclusas en Viña del Mar',
        lang: 'es-CL',
        theme_color: '#0b5394',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})
