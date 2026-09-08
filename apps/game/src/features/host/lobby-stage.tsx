import type React from 'react'

import type { PlayerId, RoomCode } from '@taverla/protocol/identifiers'
import type { HostRoomView, RoomSettings } from '@taverla/protocol/room'

import type { HostPreferences } from '@taverla/core/room/host-preferences'
import { isShelvedGame } from '@taverla/core/room/shelved-game'

import { RoomInvitation } from '@/presentation/components/room-invitation'
import { Scoreboard } from '@/presentation/components/scoreboard'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { gameDescriptionKey, scoringKey } from '@/presentation/i18n/translation'

import { GamePicker } from './game-picker'

type LobbyStageProps = {
  /** The socket is open. The picker sends a frame, so it does nothing without one. */
  isLive: boolean
  /** The ✕ beside a name — the console's own seat included, which is why it is not a frame. */
  onRemovePlayer: (playerId: PlayerId) => void
  onSettingsChange: (settings: RoomSettings) => void
  /** What this host last left each game set to, so picking one restores it. */
  preferences: HostPreferences | null
  roomCode: RoomCode
  view: HostRoomView
}

/**
 * The room's front door, on the screen everyone is looking at: the code to read
 * aloud, the QR to scan, who has arrived so far — and what they are about to
 * play, which is the one decision the room is waiting on.
 *
 * The two columns are two audiences. The invitation is what the room is
 * reading; the game and the roster are the host's own.
 */
export const LobbyStage: React.FC<LobbyStageProps> = ({
  isLive,
  onRemovePlayer,
  onSettingsChange,
  preferences,
  roomCode,
  view
}) => {
  const translate = useTranslate()

  return (
    <div className='stage lobby'>
      <RoomInvitation roomCode={roomCode} />

      <div className='host-side'>
        <section className='game-choice'>
          <GamePicker
            isDisabled={!isLive}
            onChange={onSettingsChange}
            preferences={preferences}
            settings={view.settings}
          />
          <GamePitch view={view} />
        </section>

        <section className='roster'>
          <h2>
            {translate('host.players.title')} {view.players.length}
          </h2>
          {view.players.length === 0 ? (
            <p className='empty'>{translate('host.players.empty')}</p>
          ) : (
            <Scoreboard onRemove={onRemovePlayer} players={view.players} />
          )}
        </section>
      </div>
    </div>
  )
}

/**
 * The same pitch a game's own front door shows, under the control that chose
 * it. A room reached through that door arrives with it already answered; one
 * opened from the shelf's front page arrives with nothing chosen, and this is
 * where the host reads what each of them is before deciding.
 *
 * The pitch alone was half of it. Every phone in the room is told what the
 * round pays — `UpNext` prints it while the table fills up — and the one screen
 * that never was is the one whose job is to explain the game out loud: the
 * sentence was in the setup fold, which is collapsed at every width. So it is
 * here too, under the promise it is the terms of.
 */
const GamePitch = ({ view }: { view: HostRoomView }) => {
  const translate = useTranslate()
  const game = view.settings.game

  if (game === null || !isShelvedGame(game.kind)) {
    return <p className='prompt'>{translate('host.game.prompt')}</p>
  }

  return (
    <>
      <p className='pitch'>{translate(gameDescriptionKey(game.kind))}</p>
      <p className='scoring'>
        {translate(
          scoringKey({
            answerMode: view.settings.mode.kind,
            asksForAFilm:
              game.kind === 'blindtest' && game.source.kind === 'film',
            game: game.kind
          })
        )}
      </p>
    </>
  )
}
