import type React from 'react'
import {
  Link as ReactAriaLink,
  type LinkProps as ReactAriaLinkProps
} from 'react-aria-components'

import { type ControlAppearance, controlClassName } from './control-appearance'

import './link.sass'

type LinkProps = ReactAriaLinkProps & ControlAppearance

/**
 * A navigation shaped like a control. Client-side routing comes from the
 * react-aria `RouterProvider` mounted in `app-shell.tsx`; without it an `href`
 * would reload the whole page and drop the socket.
 *
 * A link inside a sentence is `TextLink`, not a variant of this one. There is
 * no plain `<a>` in the product.
 */
export const Link: React.FC<LinkProps> = ({
  className,
  size,
  variant,
  ...props
}) => (
  <ReactAriaLink
    {...props}
    className={controlClassName({
      className,
      rootClassName: 'link',
      size,
      variant
    })}
  />
)
