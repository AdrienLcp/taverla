import type React from 'react'
import {
  composeRenderProps,
  Button as ReactAriaButton,
  type ButtonProps as ReactAriaButtonProps
} from 'react-aria-components'

import { composeClassName } from './compose-class-name'
import { Spinner } from './spinner'

import './button.sass'

type ButtonProps = ReactAriaButtonProps & {
  /**
   * Physical size (default: `'medium'`):
   * - `'small'` — an action beside something, never under it
   * - `'medium'` — the default control size
   * - `'large'` — meant to be hit with a thumb, or read across a room
   */
  size?: 'small' | 'medium' | 'large'
  /**
   * Visual weight (default: `'filled'`):
   * - `'filled'` — the accent action, one per screen
   * - `'outlined'` — a secondary action of equal standing
   * - `'ghost'` — a tertiary action that should not compete
   */
  variant?: 'filled' | 'outlined' | 'ghost'
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  size = 'medium',
  variant = 'filled',
  ...props
}) => (
  <ReactAriaButton
    {...props}
    className={composeClassName(className, 'button', variant, size)}
  >
    {composeRenderProps(children, (resolved, { isPending }) => (
      <>
        {resolved}
        {isPending && <Spinner />}
      </>
    ))}
  </ReactAriaButton>
)
