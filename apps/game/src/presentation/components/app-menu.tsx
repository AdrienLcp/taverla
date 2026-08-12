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
import { creditsPath, joinPath } from '@/infrastructure/router/navigation'
import { useConnection } from '@/presentation/connection/connection-provider'
import { useRoomExits } from '@/presentation/exits/room-exits-provider'
import { useI18n, useTranslate } from '@/presentation/i18n/i18n-provider'
import { LANGUAGE_NAMES } from '@/presentation/i18n/language-names'
import type { PlainTranslationKey } from '@/presentation/i18n/translation'
import { useTheme } from '@/presentation/theme/theme-provider'

import { Button } from './button'
import {
  ConnectionDot,
  ConnectionStatus,
  connectionStatusKey
} from './connection-status'
import { Link } from './link'
import { SegmentedControl } from './segmented-control'
import { TextLink } from './text-link'

import './app-menu.sass'

/**
 * The ways out of a room, in the one piece of chrome that is on every screen at
 * every phase. A stage carries the action the room is waiting on and nothing
 * else, so an exit that must be reachable mid-round lives here instead — behind
 * a popover, where it cannot be pressed by a thumb aiming at the game.
 *
 * Closing asks twice, because it is the only one that cannot be undone: the
 * code stops resolving, so a phone cannot reload its way back in.
 */
const RoomExit = ({ onDone }: { onDone: () => void }) => {
  const { closeRoom, endGame, leaveSeat } = useRoomExits()
  const [isConfirmingClose, setIsConfirmingClose] = useState(false)
  const connection = useConnection()
  const translate = useTranslate()
  // Every exit here but the plain navigation sends a frame, and a frame written
  // to a socket that is not open is dropped with nothing to show for it.
  const isLive = connection?.status === 'open'

  // Leaving the room is what pressing this *means* on a screen that holds a
  // seat, and saying so is the only way the roster on the big screen can be
  // true rather than true in ten minutes. A closing socket cannot carry it: a
  // phone that locks its screen closes one too, and that seat has to come back.
  if (closeRoom === null) {
    return (
      <div className='exits'>
        <Link
          href={joinPath}
          onPress={() => {
            leaveSeat?.()
            onDone()
          }}
          variant='outlined'
        >
          {translate(leaveSeat === null ? 'menu.home' : 'menu.leaveRoom')}
        </Link>
      </div>
    )
  }

  return (
    <div className='exits'>
      {endGame !== null && (
        <Button
          isDisabled={!isLive}
          onPress={() => {
            endGame()
            onDone()
          }}
          variant='outlined'
        >
          {translate('host.endGame')}
        </Button>
      )}

      {isConfirmingClose ? (
        <>
          <p className='warning'>{translate('host.closeRoom.warning')}</p>
          <Link
            href={joinPath}
            onPress={() => {
              closeRoom()
              onDone()
            }}
          >
            {translate('host.closeRoom.confirm')}
          </Link>
        </>
      ) : (
        <Button
          isDisabled={!isLive}
          onPress={() => {
            setIsConfirmingClose(true)
          }}
          variant='outlined'
        >
          {translate('host.closeRoom.label')}
        </Button>
      )}
    </div>
  )
}

const THEME_KEYS: Record<ThemePreference, PlainTranslationKey> = {
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

                <RoomExit onDone={close} />

                {/*
                  The credit itself is a page. CC BY-SA §3(a)(2) names a link to
                  a resource holding the required information as a reasonable
                  way to satisfy attribution, and the list it asks for is longer
                  than what anybody should meet while opening this to switch
                  language mid-game.
                */}
                <p className='credit'>
                  <TextLink href={creditsPath} onPress={close}>
                    {translate('credits.title')}
                  </TextLink>
                </p>

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
