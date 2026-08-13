import { Loader } from '@/presentation/components/loader'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import './route-fallback.sass'

/**
 * Only ever seen on a cold load: a client-side navigation holds the current
 * screen up while the next chunk arrives, so what reaches this is the phone
 * that scanned the QR code and is downloading the app on a party's Wi-Fi.
 *
 * It replaces the shell for the same reason `ErrorScreen` does — the menu reads
 * a connection no page has reported yet.
 */
export const RouteFallback = () => {
  const translate = useTranslate()

  return (
    <main className='route-fallback'>
      <Loader label={translate('loading')} />
    </main>
  )
}
