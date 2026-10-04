import { composeClassName } from '@adrienlcp/react-aria'
import type React from 'react'
import {
  Label,
  RadioButton,
  RadioField,
  RadioGroup,
  type RadioGroupProps
} from 'react-aria-components'

import { CheckIcon } from './check-icon'

import './box-shelf.sass'

type BoxShelfOption = {
  /** One short line under the name, printed on the box's lid. */
  description: string
  label: string
  /** The colour of the box's spine, as a CSS colour — usually a `var()`. */
  spine: string
  value: string
}

type BoxShelfProps = Omit<RadioGroupProps, 'children' | 'orientation'> & {
  /** Shown above the boxes; a radio group without one is unreachable by name. */
  label: string
  /** Rendered in order, one box each. */
  options: readonly BoxShelfOption[]
}

/**
 * A radio group drawn as boxes on a shelf: the chosen one is pulled forward
 * out of the row. The same semantics as `SegmentedControl`, for a choice whose
 * options each need a line of their own.
 */
export const BoxShelf: React.FC<BoxShelfProps> = ({
  className,
  label,
  options,
  ...props
}) => (
  <RadioGroup
    {...props}
    className={composeClassName(className, 'box-shelf')}
    orientation='horizontal'
  >
    <Label>{label}</Label>
    <div className='boxes'>
      {options.map((option) => (
        <RadioField
          className='box-field'
          key={option.value}
          value={option.value}
        >
          <RadioButton className='box' style={{ '--spine': option.spine }}>
            <span className='band' />
            <span className='lid'>
              <span className='name'>{option.label}</span>
              <span className='description'>{option.description}</span>
            </span>
            <span className='tick'>
              <CheckIcon />
            </span>
          </RadioButton>
        </RadioField>
      ))}
    </div>
  </RadioGroup>
)
