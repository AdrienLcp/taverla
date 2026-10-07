import { classNames } from '@adrienlcp/react'
import type React from 'react'
import {
  Separator as ReactAriaSeparator,
  type SeparatorProps as ReactAriaSeparatorProps
} from 'react-aria-components'

import './separator.sass'

type SeparatorProps = ReactAriaSeparatorProps & {
  /**
   * Sits on the rule, punched through it. Decorative on purpose: the boundary
   * is what carries the meaning, and a screen reader announcing "or" between
   * two headed sections adds noise rather than sense.
   */
  label?: string
}

/**
 * `className` here is a plain string, not react-aria render props, so this is
 * one of the few wrappers that composes with `classNames` rather than
 * `composeClassName`.
 */
export const Separator: React.FC<SeparatorProps> = ({
  className,
  label,
  ...props
}) => {
  const rule = (
    <ReactAriaSeparator
      {...props}
      className={classNames('separator', className)}
    />
  )

  return label === undefined ? (
    rule
  ) : (
    <div className='labelled-separator'>
      {rule}
      <span aria-hidden='true'>{label}</span>
    </div>
  )
}
