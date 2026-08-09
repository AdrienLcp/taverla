import type React from 'react'
import {
  FieldError,
  Input,
  Label,
  TextField as ReactAriaTextField,
  type TextFieldProps as ReactAriaTextFieldProps,
  Text
} from 'react-aria-components'

import { composeClassName } from './compose-class-name'

import './text-field.sass'

type TextFieldProps = ReactAriaTextFieldProps & {
  /** Forces the on-screen keyboard's letter case. `'characters'` for a room code. */
  autoCapitalize?: 'off' | 'characters'
  /** Guidance shown under the input, replaced by `errorMessage` when there is one. */
  description?: string
  errorMessage?: string
  label: string
  placeholder?: string
}

export const TextField: React.FC<TextFieldProps> = ({
  autoCapitalize,
  className,
  description,
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
      placeholder={placeholder}
      spellCheck={false}
    />
    {description !== undefined && !isInvalid && (
      <Text slot='description'>{description}</Text>
    )}
    <FieldError>{errorMessage}</FieldError>
  </ReactAriaTextField>
)
