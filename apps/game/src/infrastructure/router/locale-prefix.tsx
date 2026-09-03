import { useLayoutEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'

import {
  localeInPath,
  localizedPathFor
} from '@/infrastructure/router/navigation'
import { useI18n } from '@/presentation/i18n/i18n-provider'

/**
 * Sends a page whose URL names no language to the one this device reads in. `/`
 * arrives here as the front door — the URL `hreflang="x-default"` points at, so
 * it has to answer with a language rather than with nothing — and every other
 * path arrives as a link written back when the languages shared one URL.
 */
export const NegotiatedLocaleRedirect = () => {
  const { locale } = useI18n()
  const { pathname } = useLocation()

  return <Navigate replace to={localizedPathFor({ locale, pathname })} />
}

/**
 * Wraps every page that names its language, and makes the URL the one that
 * decides: a first segment that is not a locale is a URL from before this stage
 * and takes the negotiated prefix instead of rendering.
 *
 * `useLocation` rather than `useParams`, because a layout route with no path of
 * its own has matched no parameter yet and would read the segment as absent —
 * which here is indistinguishable from a redirect that has to happen, and loops.
 */
export const LocalePrefixedRoutes = () => {
  const { pathname } = useLocation()
  const localeInUrl = localeInPath(pathname)
  const { locale, setLocale } = useI18n()

  // Going back across `/fr` → `/en` moves the URL without passing through the
  // control that moved it, so the URL is followed rather than trusted to agree.
  // Before paint, or the language the reader just left shows for a frame.
  useLayoutEffect(() => {
    if (localeInUrl !== null && localeInUrl !== locale) {
      setLocale(localeInUrl)
    }
  }, [locale, localeInUrl, setLocale])

  if (localeInUrl === null) {
    return <NegotiatedLocaleRedirect />
  }

  return <Outlet />
}
