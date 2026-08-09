import { isLocale, LOCALES, type Locale } from '@taverla/core/i18n/locale'

import {
  isThemePreference,
  THEME_PREFERENCES,
  type ThemePreference
} from '@/helpers/theme'
import { useI18n } from '@/presentation/i18n/i18n-provider'
import type { TranslationKey } from '@/presentation/i18n/translation'
import { useTheme } from '@/presentation/theme/theme-provider'

import { SegmentedControl } from './segmented-control'

import './preferences-bar.sass'

/**
 * A language is named in its own language and never translated — someone who
 * landed on a UI they cannot read has only the word itself to navigate by.
 */
const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  fr: 'Français'
}

const THEME_KEYS: Record<ThemePreference, TranslationKey> = {
  dark: 'preferences.theme.dark',
  light: 'preferences.theme.light',
  system: 'preferences.theme.system'
}

/**
 * Sits on every screen, including the ones a phone reaches straight from the
 * QR code: a player who never passes through the home page still needs to be
 * able to switch language.
 */
export const PreferencesBar = () => {
  const { locale, setLocale, translate } = useI18n()
  const { preference, setPreference } = useTheme()

  return (
    <footer className='preferences-bar'>
      <SegmentedControl
        label={translate('preferences.language')}
        onChange={(next) => {
          if (isLocale(next)) {
            setLocale(next)
          }
        }}
        options={LOCALES.map((value) => ({
          label: LOCALE_LABELS[value],
          value
        }))}
        value={locale}
      />
      <SegmentedControl
        label={translate('preferences.theme')}
        onChange={(next) => {
          if (isThemePreference(next)) {
            setPreference(next)
          }
        }}
        options={THEME_PREFERENCES.map((value) => ({
          label: translate(THEME_KEYS[value]),
          value
        }))}
        value={preference}
      />
    </footer>
  )
}
