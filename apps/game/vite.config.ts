import { createRequire } from 'node:module'
import { resolve } from 'node:path'

import optimizeLocales from '@react-aria/optimize-locales-plugin'
import babel from '@rolldown/plugin-babel'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * The React Compiler cannot parse Babel 8's AST for a destructured parameter
 * with a default — `({ isInvalid = false }) => …` — and bails on that function
 * alone, silently, with the build green. A range that drifts is what put the
 * design system's `TextField` through unoptimized for two dependency bumps, so
 * the pin refuses to be lifted quietly rather than being written down twice.
 * `docs/component-shape.md` has the measurement.
 */
const { version: babelVersion } = createRequire(import.meta.url)(
  '@babel/core/package.json'
)

if (!babelVersion.startsWith('7.')) {
  throw new Error(
    `@babel/core ${babelVersion}: the React Compiler needs 7.x here — see docs/component-shape.md`
  )
}

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
  plugins: [
    react(),
    // The compiler rides on @rolldown/plugin-babel rather than `react({ babel })`:
    // plugin-react 6 moved to Oxc and no longer runs Babel itself.
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
