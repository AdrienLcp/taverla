import { composeClassName } from '@adrienlcp/react'
import type React from 'react'
import {
  Link as ReactAriaLink,
  type LinkProps as ReactAriaLinkProps
} from 'react-aria-components'

import './text-link.sass'

type TextLinkProps = ReactAriaLinkProps

/**
 * A link inside a sentence, which is the one navigation in the product that is
 * not a control: it has no ground, no edge, no size and no case of its own, and
 * it inherits whatever type the sentence around it is set in.
 *
 * Deliberately not a fourth `Link` variant. Every variant there answers "which
 * material is this control made of", and this one would have had to answer "it
 * is not one" — a stylesheet that spends itself undoing the mixin above it is a
 * variant on the wrong axis. Keeping it separate is also what makes `size` and
 * `variant` unavailable here, which is the type saying the true thing.
 */
export const TextLink: React.FC<TextLinkProps> = ({
  className,
  rel,
  target,
  ...props
}) => (
  <ReactAriaLink
    {...props}
    className={composeClassName(className, 'text-link')}
    // A page opened in a new tab is handed a `window.opener` it can use to
    // redirect the tab it came from. Browsers imply this now; a link that says
    // so does not depend on which browser the room brought.
    rel={target === '_blank' ? (rel ?? 'noopener noreferrer') : rel}
    target={target}
  />
)
