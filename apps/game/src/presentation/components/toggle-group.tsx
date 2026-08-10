import type React from 'react'
import { useId } from 'react'
import {
  Label,
  ToggleButton,
  ToggleButtonGroup,
  type ToggleButtonGroupProps
} from 'react-aria-components'

import { composeClassName } from './compose-class-name'

import './toggle-group.sass'

type ToggleGroupOption = {
  label: string
  value: string
}

type ToggleGroupProps = Omit<
  ToggleButtonGroupProps,
  'children' | 'selectionMode'
> & {
  /** Shown above the segments; a group without one is unreachable by name. */
  label: string
  /** Rendered in order, one segment each. */
  options: readonly ToggleGroupOption[]
}

/**
 * `SegmentedControl`'s sibling, for a question with more than one answer. This
 * is the case `ToggleButtonGroup` was built for — several independent toggles —
 * where the segmented control deliberately uses a radio group instead, because
 * a screen reader announces the difference and one answer is not several.
 *
 * They wear the same look: `styles/_strip.sass` holds it, and both include it.
 */
export const ToggleGroup: React.FC<ToggleGroupProps> = ({
  className,
  label,
  options,
  ...props
}) => {
  // `RadioGroup` hands its `Label` an id through context and `ToggleButtonGroup`
  // does not, so the association is made here rather than assumed.
  const labelId = useId()

  return (
    <ToggleButtonGroup
      {...props}
      aria-labelledby={labelId}
      className={composeClassName(className, 'toggle-group')}
      selectionMode='multiple'
    >
      <Label id={labelId}>{label}</Label>
      <div className='segments'>
        {options.map((option) => (
          <ToggleButton
            className='segment'
            id={option.value}
            key={option.value}
          >
            {option.label}
          </ToggleButton>
        ))}
      </div>
    </ToggleButtonGroup>
  )
}
