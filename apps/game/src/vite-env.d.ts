/// <reference types="vite/client" />

/**
 * Passing a CSS custom property through `style` is the one legitimate use of
 * that prop here — see `.claude/rules/css-variables.md`. React's own
 * `CSSProperties` has no room for arbitrary names, and widening it is what keeps
 * the alternative from being a cast.
 */
declare module 'react' {
  interface CSSProperties {
    [customProperty: `--${string}`]: string | number | undefined
  }
}

export {}
