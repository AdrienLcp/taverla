import { resolve } from 'node:path'

import { metricTwins } from '@adrienlcp/styles/metric-twins'
import { themePreferencePlugin } from '@adrienlcp/theme-preference/vite'
import optimizeLocales from '@react-aria/optimize-locales-plugin'
import react from '@vitejs/plugin-react'
import fontaine from 'fontaine/postcss'
import { defineConfig } from 'vite'

import { API_PREFIX, SOCKET_PREFIX } from '@taverla/protocol/routes'

import { shellHeadPlugin } from './scripts/shell-head.ts'
import { themeStore } from './src/presentation/theme/theme-store.ts'

const SERVER_ORIGIN = process.env.VITE_SERVER_ORIGIN ?? 'http://localhost:3100'

// Offset from the usual 5173 so this repo runs alongside the other dev servers
// on this machine.
const DEV_PORT = Number(process.env.VITE_DEV_PORT) || 5273

export default defineConfig({
  build: {
    // Read by `scripts/prerender.ts`, which needs to know the stylesheet each
    // page's chunk carries before it can inline it.
    manifest: true
  },
  css: {
    postcss: {
      plugins: [
        fontaine({
          fallbacks: ['Arial'],
          resolvePath: (path) => new URL(`./public${path}`, import.meta.url)
        }),
        metricTwins()
      ]
    }
  },
  plugins: [
    react({ compiler: { logDiagnostics: true } }),
    {
      ...optimizeLocales.vite({ locales: ['en-US', 'fr-FR'] }),
      enforce: 'pre'
    },
    shellHeadPlugin(),
    themePreferencePlugin(themeStore)
  ],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src')
    }
  },
  server: {
    // Phones join over the LAN by scanning the QR code, so the dev server has
    // to answer on the machine's network address, not just loopback.
    host: true,
    port: DEV_PORT,
    // Same-origin in dev, which is what lets the QR code encode
    // `location.origin` and keeps CORS out of the picture entirely.
    proxy: {
      [API_PREFIX]: { changeOrigin: true, target: SERVER_ORIGIN },
      [SOCKET_PREFIX]: {
        target: SERVER_ORIGIN.replace(/^http/, 'ws'),
        ws: true
      }
    },
    strictPort: true
  }
})
