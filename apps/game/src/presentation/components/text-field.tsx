import { composeClassName } from '@adrienlcp/react'
import type React from 'react'
import {
  FieldError,
  Input,
  Label,
  TextField as ReactAriaTextField,
  type TextFieldProps as ReactAriaTextFieldProps,
  Text
} from 'react-aria-components'

import './text-field.sass'

type TextFieldProps = ReactAriaTextFieldProps & {
  /** Forces the on-screen keyboard's letter case. `'characters'` for a room code. */
  autoCapitalize?: 'off' | 'characters'
  /** Guidance shown under the input, replaced by `errorMessage` when there is one. */
  description?: string
  /**
   * What the on-screen keyboard's action key says and does. `'send'` on a
   * single-field form, which already submits on Enter — that key is then the
   * whole submit affordance, and the button below it can be under the keyboard
   * without costing anyone the round. `'next'` on a field whose Enter moves
   * to the following one rather than submitting anything.
   */
  enterKeyHint?: 'done' | 'go' | 'next' | 'send'
  errorMessage?: string
  label: string
  placeholder?: string
}

export const TextField: React.FC<TextFieldProps> = ({
  autoCapitalize,
  className,
  description,
  enterKeyHint,
  errorMessage,
  isInvalid = false,
  label,
  placeholder,
  ...props
}) => (
  <ReactAriaTextField
    {...props}
    className={composeClassName(className, 'text-field')}
    isInvalid={isInvalid}
  >
    <Label>{label}</Label>
    <Input
      autoCapitalize={autoCapitalize}
      enterKeyHint={enterKeyHint}
      placeholder={placeholder}
      spellCheck={false}
    />
    {description !== undefined && !isInvalid && (
      <Text slot='description'>{description}</Text>
    )}
    <FieldError>{errorMessage}</FieldError>
  </ReactAriaTextField>
)
