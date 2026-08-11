import { defineConfig } from 'tsdown'

/**
 * Production runs the output of this, not `tsx`. The workspace packages are
 * inlined because they are published as TypeScript source — `@taverla/core` in
 * `node_modules` is a symlink to `.ts` files Node cannot load — so leaving them
 * external would build something that only starts under a TypeScript loader.
 * Everything else stays external: Render installs it anyway.
 */
export default defineConfig({
  deps: { alwaysBundle: [/^@taverla\//] },
  entry: 'src/index.ts',
  format: 'esm',
  platform: 'node',
  target: 'node24'
})
