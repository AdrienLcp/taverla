import type React from 'react'
import {
  Link as ReactAriaLink,
  type LinkProps as ReactAriaLinkProps
} from 'react-aria-components'

import { composeClassName } from './compose-class-name'

import './link.sass'

type LinkProps = ReactAriaLinkProps & {
  /** Same scale as `Button` (default: `'medium'`). */
  size?: 'medium' | 'large'
  /** Same weights as `Button` (default: `'filled'`). */
  variant?: 'filled' | 'outlined' | 'ghost'
}

/**
 * A navigation shaped like a control. Client-side routing comes from the
 * react-aria `RouterProvider` mounted in `app-shell.tsx`; without it an `href`
 * would reload the whole page and drop the socket.
 *
 * Prose keeps a plain `<a>`, which `globals.sass` already styles — this is for
 * a navigation that carries a screen's action.
 */
export const Link: React.FC<LinkProps> = ({
  className,
  size = 'medium',
  variant = 'filled',
  ...props
}) => (
  <ReactAriaLink
    {...props}
    className={composeClassName(className, 'link', variant, size)}
  />
)
