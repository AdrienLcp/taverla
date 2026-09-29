import { composeClassName } from '@adrienlcp/react'
import type React from 'react'
import {
  SwitchButton,
  SwitchField,
  type SwitchFieldProps,
  Text
} from 'react-aria-components'

import './switch.sass'

type SwitchProps = Omit<SwitchFieldProps, 'children'> & {
  /**
   * The reason for the setting, set under the label and announced as the
   * input's description. Omit it where the label already says everything.
   */
  description?: string
  /** Rendered beside the track; a switch without one is unreachable by name. */
  label: string
}

export const Switch: React.FC<SwitchProps> = ({
  className,
  description,
  label,
  ...props
}) => (
  <SwitchField {...props} className={composeClassName(className, 'switch')}>
    <SwitchButton className='switch-button'>
      <span className='track'>
        <span className='thumb' />
      </span>
      {label}
    </SwitchButton>
    {description !== undefined && (
      <Text className='description' elementType='p' slot='description'>
        {description}
      </Text>
    )}
  </SwitchField>
)
