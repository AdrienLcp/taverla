import type React from 'react'

import type { PlayerId, RoomCode } from '@taverla/protocol/identifiers'
import type { HostRoomView } from '@taverla/protocol/room'

import { isShelvedGame } from '@taverla/core/room/shelved-game'

import { EmptySockets } from '@/presentation/components/empty-sockets'
import { RoomInvitation } from '@/presentation/components/room-invitation'
import { Scoreboard } from '@/presentation/components/scoreboard'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import {
  gameDescriptionKey,
  gameNameKey,
  scoringKey
} from '@/presentation/i18n/translation'

import { GamePicker } from './game-picker'
import { HostSeat } from './host-seat'
import type { StageControls } from './room-stage'
import { SlatePreparation } from './slate-preparation'

/** As many pawns as a box holds: the roster shows an empty socket for each one still in it. */
type LobbyStageProps = {
  /** `null` on the wall, which shows who has arrived and what they will play. */
  controls: StageControls | null
  roomCode: RoomCode
  view: HostRoomView
  /** The seat this console took; `null` on the wall and on an unseated console. */
  youId: PlayerId | null
}

/**
 * The room's front door, on the screen everyone is looking at: the code to read
 * aloud, the QR to scan, who has arrived so far — and what they are about to
 * play, which is the one decision the room is waiting on.
 *
 * The two columns are two audiences. The invitation is what the room is
 * reading; the game and the roster are the host's own — and on the wall they
 * are the room's too, read rather than set.
 */
export const LobbyStage: React.FC<LobbyStageProps> = ({
  controls,
  roomCode,
  view,
  youId
}) => {
  const translate = useTranslate()

  return (
    <div className='stage lobby'>
      <RoomInvitation isUnattended={controls === null} roomCode={roomCode} />

      <div className='host-side'>
        <section className='game-choice'>
          {controls === null && view.settings.game !== null && (
            <h2 className='game-name'>
              {translate(gameNameKey(view.settings.game.kind))}
            </h2>
          )}
          {controls !== null && (
            <GamePicker
              isDisabled={!controls.isLive}
              onChange={controls.onSettingsChange}
              preferences={controls.preferences}
              settings={view.settings}
            />
          )}
          <GamePitch isUnattended={controls === null} view={view} />
        </section>

        {controls !== null && view.settings.game?.kind === 'slate' && (
          <SlatePreparation
            game={view.settings.game}
            isLive={controls.isLive}
            onChange={controls.onSettingsChange}
            onPrepareKey={controls.onRememberSlateKey}
            preparedKeys={controls.preparedSlateKeys}
            settings={view.settings}
          />
        )}

        <section className='roster'>
          <h2>
            {translate('host.players.title')} {view.players.length}
          </h2>
          {view.players.length === 0 ? (
            <p className='empty'>{translate('host.players.empty')}</p>
          ) : (
            <Scoreboard
              hasPawns
              onRemove={controls?.onRemovePlayer}
              players={view.players}
              youId={youId}
            />
          )}
          <EmptySockets seated={view.players.length} />

          {/*
            Inside the count rather than beside it, because taking a seat is
            joining that list — and in a room of one it is what the launch is
            refusing for, which it spent its whole life saying from behind a
            collapsed disclosure three sections below the button it unblocks.
            Every later phase keeps it there, where it is a setting rather than
            the way in.
          */}
          {controls !== null && (
            <HostSeat onTakeSeat={controls.onTakeSeat} view={view} />
          )}
        </section>
      </div>
    </div>
  )
}

/**
 * What the chosen game is and what a round of it pays. On the console the lids
 * of the shelf carry the promise, so only the wall — which has no shelf — adds
 * the pitch a game's own front door shows.
 *
 * The pitch alone was half of it. Every player in the room is told what the
 * round pays — `UpNext` prints it while the table fills up — and the one screen
 * that never was is the one whose job is to explain the game out loud: the
 * sentence was in the setup fold, which is collapsed at every width. So it is
 * here too, under the promise it is the terms of.
 */
const GamePitch: React.FC<{ isUnattended: boolean; view: HostRoomView }> = ({
  isUnattended,
  view
}) => {
  const translate = useTranslate()
  const game = view.settings.game

  if (game === null || !isShelvedGame(game.kind)) {
    return (
      <p className='prompt'>
        {translate(isUnattended ? 'player.choosingGame' : 'host.game.prompt')}
      </p>
    )
  }

  return (
    <>
      {isUnattended && (
        <p className='pitch'>{translate(gameDescriptionKey(game.kind))}</p>
      )}
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
