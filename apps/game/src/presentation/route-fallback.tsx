import type React from 'react'

import { Loader } from '@/presentation/components/loader'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import './route-fallback.sass'

/**
 * Named, because the build-time prerender refuses to write a document carrying
 * it: an unresolved `lazy` route renders this into all fourteen files with the
 * build green, and a loader is what a crawler would then index.
 */
export const ROUTE_FALLBACK_CLASS = 'route-fallback'

/**
 * Only ever seen on a cold load: a client-side navigation holds the current
 * screen up while the next chunk arrives, so what reaches this is the phone
 * that scanned the QR code and is downloading the app on a party's Wi-Fi.
 *
 * It replaces the shell for the same reason `ErrorScreen` does — the menu reads
 * a connection no page has reported yet.
 */
export const RouteFallback: React.FC = () => {
  const translate = useTranslate()

  return (
    <main className={ROUTE_FALLBACK_CLASS}>
      <Loader label={translate('loading')} />
    </main>
  )
}
