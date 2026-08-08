import type { ReactNode } from 'react'
import {
  Button as ReactAriaButton,
  type ButtonProps as ReactAriaButtonProps
} from 'react-aria-components'

import './button.sass'

type ButtonProps = {
  children: ReactNode
  /** Extra classes; the variant and size classes are always applied. */
  className?: string
  isDisabled?: boolean
  /** Renders the pending state and blocks presses. */
  isPending?: boolean
  onPress?: ReactAriaButtonProps['onPress']
  /**
   * Physical size (default: `'medium'`):
   * - `'medium'` — the default control size
   * - `'large'` — meant to be hit with a thumb, or read across a room
   */
  size?: 'medium' | 'large'
  /** Defaults to `'button'`; set `'submit'` inside a `<form>`. */
  type?: 'button' | 'submit'
  /**
   * Visual weight (default: `'filled'`):
   * - `'filled'` — the accent action, one per screen
   * - `'outlined'` — a secondary action of equal standing
   * - `'ghost'` — a tertiary action that should not compete
   */
  variant?: 'filled' | 'outlined' | 'ghost'
}

export const Button = ({
  children,
  className,
  isDisabled = false,
  isPending = false,
  onPress,
  size = 'medium',
  type = 'button',
  variant = 'filled'
}: ButtonProps) => (
  <ReactAriaButton
    className={['button', variant, size, className].filter(Boolean).join(' ')}
    isDisabled={isDisabled || isPending}
    isPending={isPending}
    onPress={onPress}
    type={type}
  >
    {children}
  </ReactAriaButton>
)
