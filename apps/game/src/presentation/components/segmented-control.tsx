import type React from 'react'
import {
  Label,
  RadioButton,
  RadioField,
  RadioGroup,
  type RadioGroupProps
} from 'react-aria-components'

import { composeClassName } from './compose-class-name'

import './segmented-control.sass'

type SegmentedControlOption = {
  label: string
  value: string
}

type SegmentedControlProps = Omit<
  RadioGroupProps,
  'children' | 'orientation'
> & {
  /** Shown above the segments; a radio group without one is unreachable by name. */
  label: string
  /** Rendered in order, one segment each. */
  options: readonly SegmentedControlOption[]
}

/**
 * A radio group wearing a segmented control's clothes. The alternative,
 * `ToggleButtonGroup`, models "several independent toggles that happen to be
 * limited to one" — a screen reader announces the difference, and this is a
 * choice among alternatives.
 *
 * `RadioField` + `RadioButton` rather than `Radio`, which react-aria deprecated
 * for the pair — the same split `Switch` already took here. The field is the
 * one that carries `value`, and the button is the one that carries hover, press
 * and focus, so `segment` goes on the button and the field is laid out away.
 */
export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  className,
  label,
  options,
  ...props
}) => (
  <RadioGroup
    {...props}
    className={composeClassName(className, 'segmented-control')}
    orientation='horizontal'
  >
    <Label>{label}</Label>
    <div className='segments'>
      {options.map((option) => (
        <RadioField
          className='segment-field'
          key={option.value}
          value={option.value}
        >
          <RadioButton className='segment'>{option.label}</RadioButton>
        </RadioField>
      ))}
    </div>
  </RadioGroup>
)
