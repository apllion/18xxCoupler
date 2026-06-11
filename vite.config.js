/* eslint-disable no-undef */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

import { execSync } from 'child_process'

const gitHash = (() => { try { return execSync('git rev-parse --short HEAD').toString().trim() } catch { return 'dev' } })()

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.1.0'),
    __BUILD_ID__: JSON.stringify(gitHash),
  },
  plugins: [
    react(),
    tailwindcss(),
    ...(process.env.NO_SSL ? [] : [basicSsl()]),
  ],
  base: '/18xxCoupler/',
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
