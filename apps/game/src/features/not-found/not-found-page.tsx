import { homePathFor } from '@/infrastructure/router/navigation'
import { Link } from '@/presentation/components/link'
import { DocumentTitle } from '@/presentation/head/document-title'
import { useI18n, useTranslate } from '@/presentation/i18n/i18n-provider'

import './not-found-page.sass'

/**
 * Rendered in place, never navigated to, so the URL survives: a mistyped room
 * code stays visible and correctable in the address bar.
 */
export const NotFoundPage: React.FC = () => {
  const { locale } = useI18n()
  const translate = useTranslate()

  return (
    <main className='not-found-page'>
      <DocumentTitle>{translate('notFound.documentTitle')}</DocumentTitle>
      <h1>{translate('notFound.title')}</h1>
      <p>{translate('notFound.description')}</p>
      <Link href={homePathFor(locale)} variant='outlined'>
        {translate('navigation.back')}
      </Link>
    </main>
  )
}
