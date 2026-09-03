import { useEffect } from 'react'

import { type IndexedPage, PAGE_HEADS } from '@/presentation/head/document-head'
import { useI18n } from '@/presentation/i18n/i18n-provider'

/**
 * The tab, after an in-app navigation. The served document already carries the
 * right title — that is the half a crawler and a link unfurl read, and it is
 * written at build time — but a client-side navigation replaces no head at all,
 * so without this a phone that walked from the home page to Le Fake keeps the
 * first title it was served for the life of the tab. Changing language on the
 * spot is the same move, which is why the locale is read from the provider
 * rather than from the URL that served the page.
 */
export const useDocumentTitle = (page: IndexedPage): void => {
  const { locale } = useI18n()
  const { title } = PAGE_HEADS[locale][page]

  useEffect(() => {
    document.title = title
  }, [title])
}
