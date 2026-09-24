import type React from 'react'
import {
  ToggleButton as ReactAriaToggleButton,
  type ToggleButtonProps as ReactAriaToggleButtonProps
} from 'react-aria-components'

import { type ControlSize, controlClassName } from './control-appearance'

import './toggle-button.sass'

type ToggleButtonProps = ReactAriaToggleButtonProps & {
  /** `'medium'` by default. The look is fixed: ruled while off, filled while on. */
  size?: ControlSize
}

/**
 * One press that stays pressed. It wears the two materials an action already
 * has — outlined off, filled on — so the state reads from across a room
 * without a second vocabulary.
 */
export const ToggleButton: React.FC<ToggleButtonProps> = ({
  className,
  size,
  ...props
}) => (
  <ReactAriaToggleButton
    {...props}
    className={controlClassName({
      className,
      rootClassName: 'toggle-button',
      size,
      variant: 'outlined'
    })}
  />
)
