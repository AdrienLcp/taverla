import {
  FieldError,
  Input,
  Label,
  TextField as ReactAriaTextField,
  Text
} from 'react-aria-components'

import './text-field.sass'

type TextFieldProps = {
  autoComplete?: string
  /** Forces the on-screen keyboard's letter case. `'characters'` for a room code. */
  autoCapitalize?: 'off' | 'characters'
  /** Guidance shown under the input, replaced by `errorMessage` when there is one. */
  description?: string
  errorMessage?: string
  /** Renders the field in an invalid state; pair it with `errorMessage`. */
  isInvalid?: boolean
  label: string
  maxLength?: number
  name?: string
  onChange: (value: string) => void
  /** Set `'numeric'` or `'text'` to pick the phone keyboard the field opens. */
  inputMode?: 'text' | 'numeric'
  value: string
}

export const TextField = ({
  autoCapitalize,
  autoComplete,
  description,
  errorMessage,
  inputMode,
  isInvalid = false,
  label,
  maxLength,
  name,
  onChange,
  value
}: TextFieldProps) => (
  <ReactAriaTextField
    autoComplete={autoComplete}
    className='text-field'
    isInvalid={isInvalid}
    name={name}
    onChange={onChange}
    value={value}
  >
    <Label>{label}</Label>
    <Input
      autoCapitalize={autoCapitalize}
      inputMode={inputMode}
      maxLength={maxLength}
      spellCheck={false}
    />
    {description !== undefined && !isInvalid && (
      <Text slot='description'>{description}</Text>
    )}
    <FieldError>{errorMessage}</FieldError>
  </ReactAriaTextField>
)
