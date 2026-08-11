import { useState } from 'react'
import {
  Dialog,
  DialogTrigger,
  Popover,
  Button as ReactAriaButton
} from 'react-aria-components'

import { isLocale, LOCALES, type Locale } from '@taverla/core/i18n/locale'

import {
  isThemePreference,
  THEME_PREFERENCES,
  type ThemePreference
} from '@/helpers/theme'
import { fetchHealth } from '@/infrastructure/api/taverla-api'
import { joinPath } from '@/infrastructure/router/navigation'
import { useConnection } from '@/presentation/connection/connection-provider'
import { useI18n } from '@/presentation/i18n/i18n-provider'
import type { TranslationKey } from '@/presentation/i18n/translation'
import { useTheme } from '@/presentation/theme/theme-provider'

import {
  ConnectionDot,
  ConnectionStatus,
  connectionStatusKey
} from './connection-status'
import { Link } from './link'
import { SegmentedControl } from './segmented-control'

import './app-menu.sass'

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
 * The one piece of chrome on every screen, including the ones a phone reaches
 * straight from a QR code: a player who never passes through the home page
 * still needs to switch language, and everyone needs a way out of a room.
 *
 * A healthy socket says nothing beyond the dot on the trigger. The state only
 * takes room on the screen once it is worth interrupting a game for.
 */
export const AppMenu = () => {
  const { locale, setLocale, translate } = useI18n()
  const { preference, setPreference } = useTheme()
  const connection = useConnection()
  const [build, setBuild] = useState<string | null>(null)

  const alert =
    connection === null || connection.status === 'open'
      ? ''
      : translate(connectionStatusKey(connection.status))

  // Asked for on the first open rather than at mount: nobody needs it during a
  // game, and a phone waking a sleeping instance would spend its first request
  // on this instead of on joining.
  const loadBuild = async (): Promise<void> => {
    const health = await fetchHealth()

    if (health.status === 'success') {
      setBuild(health.data.build)
    }
  }

  return (
    <div className='app-menu'>
      {/* Always mounted, empty when all is well: a live region that appears
          together with its first message is a message nobody hears. */}
      <p className='alert' role='status'>
        {alert}
      </p>

      <DialogTrigger
        onOpenChange={(isOpen) => {
          if (isOpen && build === null) {
            void loadBuild()
          }
        }}
      >
        <ReactAriaButton className='trigger'>
          {connection !== null && <ConnectionDot status={connection.status} />}
          {translate('menu.label')}
        </ReactAriaButton>

        <Popover className='app-menu-popover' placement='bottom end'>
          <Dialog aria-label={translate('menu.label')}>
            {({ close }) => (
              <>
                {connection !== null && (
                  <ConnectionStatus
                    clock={connection.clock}
                    status={connection.status}
                  />
                )}

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

                <Link href={joinPath} onPress={close} variant='outlined'>
                  {translate('menu.home')}
                </Link>

                {build !== null && (
                  <p className='build'>{translate('menu.build', { build })}</p>
                )}
              </>
            )}
          </Dialog>
        </Popover>
      </DialogTrigger>
    </div>
  )
}
