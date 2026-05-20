import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(process.env.NO_SSL ? [] : [basicSsl()]),
  ],
  base: '/18xxBroker/',
  server: {
    proxy: {
      '/18xx-games-api': {
        target: 'https://18xx.games',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/18xx-games-api/, '/api'),
      },
    },
  },
})
