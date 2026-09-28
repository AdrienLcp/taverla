import { useEffect } from 'react'

import { type IndexedPage, PAGE_HEADS } from '@/presentation/head/document-head'
import { useI18n } from '@/presentation/i18n/i18n-provider'

/**
 * The tab, after an in-app navigation. The served document already carries the
 * right title — that is the half a crawler and a link unfurl read, and it is
 * written at build time — but a client-side navigation replaces no head at all,
 * so without this a screen that walked from the home page to the quiz keeps the
 * first title it was served for the life of the tab.
 *
 * Every screen owes one. A room and the not-found page are served by the SPA
 * fallback rather than by a prerendered document, so what they inherit is the
 * *English* home page's title however the app is set — which is what a French
 * screen read for as long as this took a page instead of a string.
 */
export const useDocumentTitle = (title: string): void => {
  useEffect(() => {
    document.title = title
  }, [title])
}

/**
 * The title a crawler was served, said again after a client-side navigation.
 * The locale comes from the provider rather than from the URL that served the
 * page, so changing language on the spot changes the tab with it.
 */
export const useIndexedPageTitle = (page: IndexedPage): void => {
  const { locale } = useI18n()

  useDocumentTitle(PAGE_HEADS[locale][page].title)
}
