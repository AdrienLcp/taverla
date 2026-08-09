import { joinPath } from '@/infrastructure/router/navigation'
import { Link } from '@/presentation/components/link'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import './not-found-page.sass'

/**
 * Rendered in place, never navigated to, so the URL survives: a mistyped room
 * code stays visible and correctable in the address bar.
 */
export const NotFoundPage = () => {
  const translate = useTranslate()

  return (
    <main className='not-found-page'>
      <h1>{translate('notFound.title')}</h1>
      <p>{translate('notFound.description')}</p>
      <Link href={joinPath} variant='outlined'>
        {translate('notFound.back')}
      </Link>
    </main>
  )
}
