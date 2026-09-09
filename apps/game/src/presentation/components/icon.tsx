import type React from 'react'

type IconProps = React.SVGProps<SVGSVGElement> & {
  /** The geometry, drawn on a 24-unit grid. Nothing else — stroke and size are the family's. */
  children: React.ReactNode
}

/**
 * The one place the icon family is defined, so a glyph cannot arrive in someone
 * else's weight.
 *
 * It is sized in `em` and drawn at 3.5 units on a 24-unit grid, which puts its
 * stroke on the stem weight of Archivo 900 beside it — the label is the
 * heaviest thing in this world and a library's 2-unit hairline reads as a
 * different product next to it. Butt caps and miter joins for the same reason
 * the rest of the product has hard edges: nothing here is round but the buzzer.
 *
 * Decorative by default. A glyph carrying meaning on its own is a glyph whose
 * control is missing its name.
 */
export const Icon: React.FC<IconProps> = ({ children, ...props }) => (
  <svg
    aria-hidden='true'
    fill='none'
    focusable='false'
    height='1.25em'
    stroke='currentColor'
    strokeLinecap='butt'
    strokeLinejoin='miter'
    strokeWidth={3.5}
    viewBox='0 0 24 24'
    width='1.25em'
    {...props}
  >
    {children}
  </svg>
)
