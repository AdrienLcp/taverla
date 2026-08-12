import { QRCodeSVG } from 'qrcode.react'
import type React from 'react'

import type { ClientMessage } from '@taverla/protocol/client-message'
import type { RoomCode } from '@taverla/protocol/identifiers'
import type { HostRoomView } from '@taverla/protocol/room'

import { isShelvedGame } from '@taverla/core/room/shelved-game'

import { playUrlFor } from '@/infrastructure/router/navigation'
import { Scoreboard } from '@/presentation/components/scoreboard'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { gameDescriptionKey } from '@/presentation/i18n/translation'

import { CopyButton } from './copy-button'
import { GamePicker } from './game-picker'

type LobbyStageProps = {
  /** The socket is open. The picker sends a frame, so it does nothing without one. */
  isLive: boolean
  roomCode: RoomCode
  send: (message: ClientMessage) => boolean
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
  roomCode,
  send,
  view
}) => {
  const translate = useTranslate()
  const joinUrl = playUrlFor(view.code)

  return (
    <div className='stage lobby'>
      <section className='invitation'>
        <div className='code'>
          <p className='room-code'>{roomCode}</p>
          <CopyButton value={roomCode} />
        </div>
        <div className='qr'>
          <QRCodeSVG
            bgColor='transparent'
            fgColor='currentColor'
            marginSize={0}
            size={256}
            value={joinUrl}
          />
          <p className='invite'>{translate('host.invite.title')}</p>
          <p className='join-url'>{joinUrl}</p>
        </div>
      </section>

      <div className='host-side'>
        <section className='game-choice'>
          <GamePicker
            isDisabled={!isLive}
            onChange={(settings) => {
              send({ settings, type: 'host.updateSettings' })
            }}
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
            <Scoreboard
              onRemove={(playerId) => {
                send({ playerId, type: 'host.removePlayer' })
              }}
              players={view.players}
            />
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
 */
const GamePitch = ({ view }: { view: HostRoomView }) => {
  const translate = useTranslate()
  const game = view.settings.game

  return game !== null && isShelvedGame(game.kind) ? (
    <p className='pitch'>{translate(gameDescriptionKey(game.kind))}</p>
  ) : (
    <p className='prompt'>{translate('host.game.prompt')}</p>
  )
}
