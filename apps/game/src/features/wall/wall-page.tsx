import type React from 'react'
import { useEffect, useEffectEvent } from 'react'

import type { RoomCode } from '@taverla/protocol/identifiers'

import { JoinReminder } from '@/features/host/join-reminder'
import { RoomStage } from '@/features/host/room-stage'
import { useRoundAudio } from '@/features/host/round-audio'
import { useSlateWall } from '@/features/host/use-slate-wall'
import { NotFoundPage } from '@/features/not-found/not-found-page'
import { useWallConnection } from '@/infrastructure/messaging/use-wall-connection'
import {
  hostFromWallPathFor,
  paths,
  useRoomCodeParam
} from '@/infrastructure/router/navigation'
import { unlockBuzzCue, useBuzzCue } from '@/presentation/audio/buzz-cue'
import { useVolume } from '@/presentation/audio/volume-provider'
import { Button } from '@/presentation/components/button'
import { ConnectionRefused } from '@/presentation/components/connection-refused'
import { Link } from '@/presentation/components/link'
import { useReportConnection } from '@/presentation/connection/connection-provider'
import { useRoomDocumentTitle } from '@/presentation/head/use-room-document-title'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { useReportRoomActions } from '@/presentation/room-actions/room-actions-provider'
import { useMarkingField } from '@/presentation/theme/use-marking-field'
import { usePhaseField } from '@/presentation/theme/use-phase-field'
import { useIdleChrome } from '@/presentation/use-idle-chrome'
import { useScreenAwake } from '@/presentation/use-screen-awake'

import { useAbsentFor } from './use-absent-for'
import { asRoomScreenView } from './wall-view'

import '@/features/host/host-console-page.sass'
import './wall-page.sass'

/**
 * Long enough for a lid closing and reopening, or a phone's screen locking and
 * waking, to come and go without the wall saying anything about it.
 */
const HOST_AWAY_GRACE_MS = 5_000

export const WallPage: React.FC = () => {
  const roomCode = useRoomCodeParam()

  return roomCode === null ? <NotFoundPage /> : <Wall roomCode={roomCode} />
}

/**
 * The room on the screen everyone reads, with nobody at it: the same stage the
 * console draws, without a single control and without the answer, which the
 * server never sends here. It is also the room's speaker, which is the one
 * thing it has to ask a hand for.
 */
const Wall: React.FC<{ roomCode: RoomCode }> = ({ roomCode }) => {
  const translate = useTranslate()
  const { clock, error, status, view: wallView } = useWallConnection(roomCode)
  const view = wallView === null ? null : asRoomScreenView(wallView)
  const { volume } = useVolume()
  const slateWall = useSlateWall(view)
  const isRefused = status === 'refused'
  const isHostAway = useAbsentFor({
    graceMs: HOST_AWAY_GRACE_MS,
    isAbsent: view !== null && !view.isHostConnected
  })

  useReportConnection({ clock, status })
  useRoomDocumentTitle(view?.settings.game?.kind ?? null)
  usePhaseField(view?.phase ?? null)
  useMarkingField(view?.phase === 'playing' && slateWall.isOnWall)
  useScreenAwake(!isRefused)
  useIdleChrome(!isRefused)

  const { canPlay, refusal, unlock } = useRoundAudio({ clock, view, volume })

  useBuzzCue(view?.round?.activeBuzz?.atServerTime ?? null)
  useReportRoomActions({
    closeRoom: null,
    endGame: null,
    leaveSeat: null,
    playsSound: true,
    refusedNickname: null,
    rename: null,
    seatNickname: null
  })

  const armAudio = () => {
    unlock()
    unlockBuzzCue()
  }

  // Tried once without a press, because a screen reached by a click inside
  // this tab already carries the browser's permission to play. When it does
  // not, the offer in the header stays until somebody presses it.
  const tryArmingUnasked = useEffectEvent(armAudio)

  useEffect(() => {
    tryArmingUnasked()
  }, [])

  if (isRefused) {
    return (
      <main className='host-console-page wall-page'>
        <div className='stage solo'>
          <ConnectionRefused error={error}>
            {error?.code === 'wall_not_paired' && (
              <Link href={paths.wallPairing} size='large' variant='filled'>
                {translate('wall.pairAgain')}
              </Link>
            )}
          </ConnectionRefused>
        </div>
      </main>
    )
  }

  return (
    <main className='host-console-page wall-page'>
      <header>
        {view?.round != null && view.phase !== 'finished' && (
          <p className='round-index'>
            {view.settings.roundCount === null
              ? translate('round.indexOpen', { index: view.round.index })
              : translate('round.index', {
                  index: view.round.index,
                  total: view.settings.roundCount
                })}
          </p>
        )}
        {!canPlay && (
          <Button
            className='sound-offer'
            onPress={armAudio}
            size='small'
            variant='outlined'
          >
            {translate('wall.sound')}
          </Button>
        )}
        {view !== null && view.phase !== 'lobby' && (
          <JoinReminder roomCode={roomCode} />
        )}
      </header>

      {isHostAway && (
        <aside className='host-away'>
          <p>{translate('wall.hostAway.title')}</p>
          <Link
            href={hostFromWallPathFor(roomCode)}
            size='small'
            variant='outlined'
          >
            {translate('wall.hostAway.takeOver')}
          </Link>
        </aside>
      )}

      <RoomStage
        canPlay={canPlay}
        clock={clock}
        controls={null}
        isSpeaker
        onUnlockAudio={armAudio}
        refusal={refusal}
        roomCode={roomCode}
        slateWall={slateWall}
        view={view}
      />
    </main>
  )
}
