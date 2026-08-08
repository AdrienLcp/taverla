import { resolve } from 'node:path'

import optimizeLocales from '@react-aria/optimize-locales-plugin'
import babel from '@rolldown/plugin-babel'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const SERVER_ORIGIN = process.env.VITE_SERVER_ORIGIN ?? 'http://localhost:3100'

// Offset from the usual 5173 so this repo runs alongside the other dev servers
// on this machine.
const DEV_PORT = Number(process.env.VITE_DEV_PORT) || 5273

export default defineConfig({
  plugins: [
    react(),
    // The compiler rides on @rolldown/plugin-babel rather than `react({ babel })`:
    // plugin-react 6 moved to Oxc and no longer runs Babel itself. `@babel/core`
    // is pinned to 7 because the compiler cannot parse Babel 8's AST for a
    // destructured parameter with a default — it bails per-function, silently,
    // and the build stays green.
    babel({ presets: [reactCompilerPreset()] }),
    { ...optimizeLocales.vite({ locales: ['en-US', 'fr-FR'] }), enforce: 'pre' }
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
      '/api': { changeOrigin: true, target: SERVER_ORIGIN },
      '/ws': { target: SERVER_ORIGIN.replace(/^http/, 'ws'), ws: true }
    },
    strictPort: true
  }
})
