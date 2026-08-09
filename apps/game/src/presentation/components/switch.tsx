import type React from 'react'
import {
  Switch as ReactAriaSwitch,
  type SwitchProps as ReactAriaSwitchProps
} from 'react-aria-components'

import { composeClassName } from './compose-class-name'

import './switch.sass'

type SwitchProps = Omit<ReactAriaSwitchProps, 'children'> & {
  /** Rendered beside the track; a switch without one is unreachable by name. */
  label: string
}

export const Switch: React.FC<SwitchProps> = ({
  className,
  label,
  ...props
}) => (
  <ReactAriaSwitch {...props} className={composeClassName(className, 'switch')}>
    <span className='track'>
      <span className='thumb' />
    </span>
    {label}
  </ReactAriaSwitch>
)
