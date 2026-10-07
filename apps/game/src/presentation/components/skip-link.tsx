import type React from 'react'

import { focusMain, MAIN_HREF } from '@/presentation/components/main'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import './skip-link.sass'

/**
 * The first stop of the keyboard on every page, hidden until it is focused. A
 * plain anchor, so it works before the app boots; once it has, the click is
 * kept from the router, which would take the fragment for a navigation.
 */
export const SkipLink: React.FC = () => {
  const translate = useTranslate()

  return (
    <a
      className='skip-link'
      href={MAIN_HREF}
      onClick={(event) => {
        event.preventDefault()
        focusMain()
      }}
    >
      {translate('navigation.skipToContent')}
    </a>
  )
}
