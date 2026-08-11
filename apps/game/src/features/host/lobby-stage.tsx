import { QRCodeSVG } from 'qrcode.react'
import type React from 'react'

import type { RoomCode } from '@taverla/protocol/identifiers'
import type { HostRoomView } from '@taverla/protocol/room'

import { playUrlFor } from '@/infrastructure/router/navigation'
import { Scoreboard } from '@/presentation/components/scoreboard'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import { CopyButton } from './copy-button'

type LobbyStageProps = {
  roomCode: RoomCode
  view: HostRoomView
}

/**
 * The room's front door, on the screen everyone is looking at: the code to read
 * aloud, the QR to scan, and who has arrived so far.
 */
export const LobbyStage: React.FC<LobbyStageProps> = ({ roomCode, view }) => {
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

      <section className='roster'>
        <h2>
          {translate('host.players.title')} {view.players.length}
        </h2>
        {view.players.length === 0 ? (
          <p className='empty'>{translate('host.players.empty')}</p>
        ) : (
          <Scoreboard players={view.players} />
        )}
      </section>
    </div>
  )
}
