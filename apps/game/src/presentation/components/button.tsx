import type React from 'react'
import {
  composeRenderProps,
  Button as ReactAriaButton,
  type ButtonProps as ReactAriaButtonProps
} from 'react-aria-components'

import { type ControlAppearance, controlClassName } from './control-appearance'
import { Spinner } from './spinner'

import './button.sass'

type ButtonProps = ReactAriaButtonProps & ControlAppearance

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  size,
  variant,
  ...props
}) => (
  <ReactAriaButton
    {...props}
    className={controlClassName({
      className,
      rootClassName: 'button',
      size,
      variant
    })}
  >
    {composeRenderProps(children, (resolved, { isPending }) => (
      <>
        {resolved}
        {isPending && <Spinner />}
      </>
    ))}
  </ReactAriaButton>
)
