import { useState } from 'react'
import {
  Dialog,
  DialogTrigger,
  Popover,
  Button as ReactAriaButton
} from 'react-aria-components'

import { LOCALES } from '@taverla/protocol/locale'

import { isLocale } from '@taverla/core/i18n/locale'

import {
  isThemePreference,
  THEME_PREFERENCES,
  type ThemePreference
} from '@/helpers/theme'
import { fetchHealth } from '@/infrastructure/api/taverla-api'
import { joinPath } from '@/infrastructure/router/navigation'
import { useConnection } from '@/presentation/connection/connection-provider'
import { useI18n } from '@/presentation/i18n/i18n-provider'
import { LANGUAGE_NAMES } from '@/presentation/i18n/language-names'
import type { PlainTranslationKey } from '@/presentation/i18n/translation'
import { useTheme } from '@/presentation/theme/theme-provider'

import {
  ConnectionDot,
  ConnectionStatus,
  connectionStatusKey
} from './connection-status'
import { Link } from './link'
import { SegmentedControl } from './segmented-control'
import { TextLink } from './text-link'

import './app-menu.sass'

const THEME_KEYS: Record<ThemePreference, PlainTranslationKey> = {
  dark: 'preferences.theme.dark',
  light: 'preferences.theme.light',
  system: 'preferences.theme.system'
}

const LICENCE = {
  name: 'CC BY-SA 4.0',
  url: 'https://creativecommons.org/licenses/by-sa/4.0/'
}

/**
 * CC BY-SA asks that the credit travel with the work, and the questions ship
 * bundled with the server rather than being fetched from anyone — so nothing
 * else in the product would ever name them. It sits in the menu because that is
 * the one piece of chrome on every screen, and because a credit belongs in the
 * small print rather than on the reveal, where it would take the loudest moment
 * of the round ten times a game to say the same thing.
 *
 * One entry per language, because the bank is written in each rather than
 * translated from one into the other, and the two halves have different authors.
 * Both are named whatever the room is playing: the credit is for the data that
 * shipped, not for the rows a given evening happened to draw.
 *
 * It mirrors the `attributions` header of `question-bank.json`, which is the
 * machine-readable copy that travels with the data itself.
 */
const QUESTION_CREDITS = [
  {
    author: 'Philippe Bresoux',
    source: 'OpenQuizzDB',
    sourceUrl: 'https://www.openquizzdb.org'
  },
  {
    author: 'PIXELTAIL GAMES LLC',
    source: 'Open Trivia DB',
    sourceUrl: 'https://opentdb.com'
  }
]

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
                    label: LANGUAGE_NAMES[value],
                    value
                  }))}
                  value={locale}
                />

                <SegmentedControl
                  label={translate('preferences.theme.label')}
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

                {QUESTION_CREDITS.map((credit) => (
                  <p className='credit' key={credit.source}>
                    {translate('menu.questions', { author: credit.author })}{' '}
                    <TextLink href={credit.sourceUrl} target='_blank'>
                      {credit.source}
                    </TextLink>
                    {translate('menu.questionsLicence')}{' '}
                    <span className='fragment'>
                      <TextLink href={LICENCE.url} target='_blank'>
                        {LICENCE.name}
                      </TextLink>
                    </span>
                  </p>
                ))}

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
