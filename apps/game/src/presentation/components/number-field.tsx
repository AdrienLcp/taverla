import { composeClassName } from '@adrienlcp/react-aria'
import type React from 'react'
import {
  Group,
  Input,
  Label,
  Button as ReactAriaButton,
  NumberField as ReactAriaNumberField,
  type NumberFieldProps as ReactAriaNumberFieldProps
} from 'react-aria-components'

import { MinusIcon } from './minus-icon'
import { PlusIcon } from './plus-icon'

import './number-field.sass'

type NumberFieldProps = ReactAriaNumberFieldProps & {
  label: string
}

/**
 * A whole number with a step either side, for a setting too wide for a strip:
 * typed on a keyboard, stepped with a thumb. The steps carry no label of their
 * own: react-aria names them *increase* and *decrease* in the active locale.
 */
export const NumberField: React.FC<NumberFieldProps> = ({
  className,
  label,
  ...props
}) => (
  <ReactAriaNumberField
    {...props}
    className={composeClassName(className, 'number-field')}
  >
    <Label>{label}</Label>
    <Group className='steps'>
      <ReactAriaButton className='step' slot='decrement'>
        <MinusIcon />
      </ReactAriaButton>
      <Input inputMode='numeric' />
      <ReactAriaButton className='step' slot='increment'>
        <PlusIcon />
      </ReactAriaButton>
    </Group>
  </ReactAriaNumberField>
)
