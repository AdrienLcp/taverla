import type React from 'react'
import { Children } from 'react'

/**
 * Wraps each run of text among a control's children in a `.control-label`
 * span, leaving icons and spinners as they are.
 *
 * A control centres its content as a flex container, and the text in one is an
 * anonymous flex item no selector reaches. `text-box` only trims a block
 * container, so a bare string kept its half-leading and the descender room an
 * uppercase label never uses, and sat visibly above the box's centre. The span
 * becomes a block as a flex item, which is what lets the stylesheet trim it.
 */
export const wrapLabelText = (children: React.ReactNode): React.ReactNode =>
  Children.map(children, (child) =>
    typeof child === 'string' || typeof child === 'number' ? (
      <span className='control-label'>{child}</span>
    ) : (
      child
    )
  )
