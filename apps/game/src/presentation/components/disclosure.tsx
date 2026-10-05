import { composeClassName } from '@adrienlcp/react-aria'
import type React from 'react'
import {
  DisclosurePanel,
  Heading,
  Button as ReactAriaButton,
  Disclosure as ReactAriaDisclosure,
  type DisclosureProps as ReactAriaDisclosureProps
} from 'react-aria-components'

import { ChevronIcon } from './icons'

import './disclosure.sass'

type DisclosureProps = Omit<ReactAriaDisclosureProps, 'children'> & {
  children: React.ReactNode
  /** A glyph printed before the label; decorative, the label stays the name. */
  icon?: React.ReactNode
  /** Names the section, in the trigger. */
  label: string
  /**
   * What the panel holds right now, read without opening it. It is what makes
   * the collapse honest: a section nobody can see the state of is a section
   * nobody knows to open.
   */
  summary: string
}

/**
 * A section the reader opens. The trigger is a ruled row rather than a block,
 * because a bordered control beside the one action on the screen reads as a
 * second one — see the three materials in `DESIGN.md`.
 */
export const Disclosure: React.FC<DisclosureProps> = ({
  children,
  className,
  icon,
  label,
  summary,
  ...props
}) => (
  <ReactAriaDisclosure
    {...props}
    className={composeClassName(className, 'disclosure')}
  >
    <Heading level={2}>
      <ReactAriaButton className='trigger' slot='trigger'>
        <span className='naming'>
          <span className='name'>
            {icon}
            {label}
          </span>
          <span className='summary'>{summary}</span>
        </span>
        <ChevronIcon className='chevron' />
      </ReactAriaButton>
    </Heading>
    {/*
      The inner element is what the animation needs: a grid row cannot collapse
      a box that sets its own padding, so the panel owns the row and this owns
      the layout.
    */}
    <DisclosurePanel className='panel'>
      <div className='panel-content'>{children}</div>
    </DisclosurePanel>
  </ReactAriaDisclosure>
)
