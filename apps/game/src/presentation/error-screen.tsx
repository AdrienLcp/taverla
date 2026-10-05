import type React from 'react'
import { useRouteError } from 'react-router'

import { reloadPage } from '@/infrastructure/browser'
import { reportUnrenderedError } from '@/infrastructure/diagnostics'
import { homePathFor } from '@/infrastructure/router/navigation'
import { Button } from '@/presentation/components/button'
import { Link } from '@/presentation/components/link'
import { useI18n, useTranslate } from '@/presentation/i18n/i18n-provider'

import './error-screen.sass'

/**
 * The root route's boundary, so anything that throws below it — a render, a
 * lazy chunk, a router loader — lands here instead of on a white page.
 *
 * It replaces the shell rather than sitting inside it: the menu reads a
 * connection a broken screen may no longer have, and a fallback that renders
 * chrome it cannot trust is a second crash waiting to happen.
 *
 * **Reload, not retry.** The most likely way to reach this screen is a lazy
 * chunk that no longer exists because the site redeployed under an open tab,
 * and re-rendering asks for the same missing file. A "try again" that cannot
 * work is worse than one button that does.
 */
export const ErrorScreen: React.FC = () => {
  const { locale } = useI18n()
  const translate = useTranslate()
  const error = useRouteError()

  reportUnrenderedError(error)

  return (
    <main className='error-screen'>
      <h1>{translate('error.screen.title')}</h1>
      <p>{translate('error.screen.description')}</p>
      <div className='ways-out'>
        <Button onPress={reloadPage} size='large'>
          {translate('error.screen.reload')}
        </Button>
        <Link href={homePathFor(locale)} variant='underlined'>
          {translate('menu.home')}
        </Link>
      </div>
    </main>
  )
}
