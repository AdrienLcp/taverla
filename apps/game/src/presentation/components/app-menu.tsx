import { useState } from 'react'
import {
  Dialog,
  DialogTrigger,
  Form,
  Popover,
  Button as ReactAriaButton
} from 'react-aria-components'

import {
  NICKNAME_MAX_LENGTH,
  type RoomCode
} from '@taverla/protocol/identifiers'
import { LOCALES } from '@taverla/protocol/locale'

import { isLocale } from '@taverla/core/i18n/locale'

import {
  isThemePreference,
  THEME_PREFERENCES,
  type ThemePreference
} from '@/helpers/theme'
import { fetchHealth } from '@/infrastructure/api/taverla-api'
import {
  creditsPath,
  joinPath,
  useRoomCodeParam
} from '@/infrastructure/router/navigation'
import { readHostToken } from '@/infrastructure/storage/session-storage'
import { useConnection } from '@/presentation/connection/connection-provider'
import { useI18n, useTranslate } from '@/presentation/i18n/i18n-provider'
import { LANGUAGE_NAMES } from '@/presentation/i18n/language-names'
import {
  type PlainTranslationKey,
  protocolErrorKey
} from '@/presentation/i18n/translation'
import {
  useIsInsideRoom,
  useRoomActions
} from '@/presentation/room-actions/room-actions-provider'
import { useTheme } from '@/presentation/theme/theme-provider'

import { Button } from './button'
import {
  ConnectionDot,
  ConnectionStatus,
  connectionStatusKey
} from './connection-status'
import { Disclosure } from './disclosure'
import { Link } from './link'
import { SegmentedControl } from './segmented-control'
import { TextField } from './text-field'
import { TextLink } from './text-link'

import './app-menu.sass'

/**
 * The room's own secret, on the one screen that holds it. Hidden until it is
 * asked for: this menu opens on a console that is often a television, and a code
 * the room can read over the host's shoulder is a room the room can take.
 */
const RoomRecovery = ({ roomCode }: { roomCode: RoomCode }) => {
  const [isRevealed, setIsRevealed] = useState(false)
  const translate = useTranslate()
  const hostToken = readHostToken(roomCode)

  // A console that took the room over on the grace window alone runs it without
  // ever learning the token, and has nothing here to show.
  if (hostToken === null) {
    return null
  }

  return isRevealed ? (
    <div className='recovery'>
      <p className='token'>{hostToken}</p>
      <p className='hint'>{translate('host.recovery.hint')}</p>
    </div>
  ) : (
    <div className='recovery'>
      <Button
        onPress={() => {
          setIsRevealed(true)
        }}
        variant='outlined'
      >
        {translate('host.recovery.reveal')}
      </Button>
    </div>
  )
}

/**
 * The name this screen is playing under. A device that has played before never
 * passes through the join form, so what that form used to show has to live
 * somewhere on every screen at every phase — and the row carries the name
 * itself, which leaves the panel for the rarer half of the job.
 */
const SeatName = () => {
  const { refusedNickname, rename, seatNickname } = useRoomActions()
  const translate = useTranslate()
  const [draft, setDraft] = useState<string | null>(null)

  if (rename === null || seatNickname === null) {
    return null
  }

  // Empty rather than filled with the name the row above already carries. A
  // prefilled field printed it twice in four lines, and editing two characters
  // of your own name is not what changing it means.
  const value = draft ?? ''
  const next = value.trim()
  // The refusal belongs to the name it was given for, so any other draft
  // submits again — a controlled `isInvalid` outliving its reason leaves the
  // field's native validity false and the press a silent no-op.
  const isRefused = next === refusedNickname

  return (
    <Disclosure
      className='seat-name'
      label={translate('menu.nickname.label')}
      summary={seatNickname}
    >
      <Form
        onSubmit={(event) => {
          event.preventDefault()
          rename(next)
        }}
      >
        <TextField
          autoComplete='nickname'
          enterKeyHint='done'
          errorMessage={
            isRefused
              ? translate(protocolErrorKey('nickname_taken'))
              : undefined
          }
          isInvalid={isRefused}
          label={translate('menu.nickname.field')}
          maxLength={NICKNAME_MAX_LENGTH}
          name='nickname'
          onChange={setDraft}
          value={value}
        />
        {/*
          `small`, and beside the field rather than under the width of the
          popover: a 52px block here is the same shape as the exit below it, and
          changing a label is not a peer of leaving the room.
        */}
        <Button
          isDisabled={next.length === 0 || next === seatNickname}
          size='small'
          type='submit'
          variant='outlined'
        >
          {translate('menu.nickname.action')}
        </Button>
      </Form>
    </Disclosure>
  )
}

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
  const { closeRoom, endGame, leaveSeat } = useRoomActions()
  const [isConfirmingClose, setIsConfirmingClose] = useState(false)
  const connection = useConnection()
  const roomCode = useRoomCodeParam()
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
    <>
      {roomCode !== null && <RoomRecovery roomCode={roomCode} />}

      <div className='exits'>
        {/*
          Widest scope last, and this is the only screen that shows more than
          one of them: a host who took a seat can give it back without giving up
          the room, which is what makes the three separate scopes worth having.
        */}
        {leaveSeat !== null && (
          <Button
            isDisabled={!isLive}
            onPress={() => {
              leaveSeat()
              onDone()
            }}
            variant='outlined'
          >
            {translate('host.seat.leave')}
          </Button>
        )}

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
    </>
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
  const isInsideRoom = useIsInsideRoom()
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

                <SeatName />

                <RoomExit onDone={close} />

                {/*
                  The credit itself is a page. CC BY-SA §3(a)(2) names a link to
                  a resource holding the required information as a reasonable
                  way to satisfy attribution, and the list it asks for is longer
                  than what anybody should meet while opening this to switch
                  language mid-game.

                  A front-door concern, and offered only there: following it out
                  of a room unmounts the page and closes its socket, which the
                  server reads as a screen that dropped off — a host would leave
                  the round frozen on every phone to go and read a licence. The
                  route stays, so a shared link and a reload still resolve.
                */}
                {!isInsideRoom && (
                  <p className='credit'>
                    <TextLink href={creditsPath} onPress={close}>
                      {translate('credits.title')}
                    </TextLink>
                  </p>
                )}

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
