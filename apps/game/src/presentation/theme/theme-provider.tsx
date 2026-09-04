import { type ReactNode, useEffect, useState } from 'react'

import { createSafeContext } from '@/helpers/contexts'
import { type ThemePreference, themeColorMediaFor } from '@/helpers/theme'
import {
  readStoredThemePreference,
  writeStoredThemePreference
} from '@/infrastructure/storage/preferences-storage'

type ThemeContextValue = {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

export const [ThemeContext, useTheme] =
  createSafeContext<ThemeContextValue>('ThemeProvider')

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [preference, setPreference] = useState<ThemePreference>(
    () => readStoredThemePreference() ?? 'system'
  )

  // `_tokens.sass` answers `prefers-color-scheme` on its own, so the attribute
  // is stamped only for an explicit choice. Stamping it unconditionally would
  // move the decision into JavaScript, which does not run until after the
  // first paint — the flash of the wrong theme comes from exactly that.
  useEffect(() => {
    if (preference === 'system') {
      delete document.documentElement.dataset.theme
    } else {
      document.documentElement.dataset.theme = preference
    }

    // The head script answers the same question on a cold load, and cannot
    // answer this one: a theme chosen from the menu happens long after it ran.
    for (const meta of document.querySelectorAll<HTMLMetaElement>(
      'meta[name="theme-color"][data-scheme]'
    )) {
      const scheme = meta.dataset.scheme

      if (scheme === 'light' || scheme === 'dark') {
        meta.media = themeColorMediaFor({ preference, scheme })
      }
    }
  }, [preference])

  const choosePreference = (next: ThemePreference): void => {
    setPreference(next)
    writeStoredThemePreference(next)
  }

  return (
    <ThemeContext value={{ preference, setPreference: choosePreference }}>
      {children}
    </ThemeContext>
  )
}
