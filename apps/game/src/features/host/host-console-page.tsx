import { QRCodeSVG } from 'qrcode.react'

import type { RoomCode } from '@blindtest/protocol/identifiers'

import { NotFoundPage } from '@/features/not-found/not-found-page'
import { useHostConnection } from '@/infrastructure/messaging/use-host-connection'
import {
  playUrlFor,
  useRoomCodeParam
} from '@/infrastructure/router/navigation'
import { Button } from '@/presentation/components/button'
import { ConnectionStatus } from '@/presentation/components/connection-status'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { protocolErrorKey } from '@/presentation/i18n/translation'

import './host-console-page.sass'

export const HostConsolePage = () => {
  const roomCode = useRoomCodeParam()

  // The socket hook must not be called with a code the server would refuse, and
  // hooks cannot be conditional — so the guard lives above the component that
  // owns them.
  return roomCode === null ? (
    <NotFoundPage />
  ) : (
    <HostConsole roomCode={roomCode} />
  )
}

const HostConsole = ({ roomCode }: { roomCode: RoomCode }) => {
  const translate = useTranslate()
  const { clock, error, send, status, view } = useHostConnection(roomCode)
  const joinUrl = playUrlFor(roomCode)
  const players = view?.players ?? []

  return (
    <main className='host-console-page'>
      <header>
        <div>
          <p className='eyebrow'>{translate('host.roomCode')}</p>
          <p className='room-code'>{roomCode}</p>
        </div>
        <ConnectionStatus clock={clock} status={status} />
      </header>

      <div className='stage'>
        <section className='invite'>
          <h2>{translate('host.invite.title')}</h2>
          <div className='qr'>
            <QRCodeSVG
              bgColor='#ffffff'
              fgColor='#08080e'
              size={220}
              value={joinUrl}
            />
          </div>
          <p className='join-url'>{joinUrl}</p>
        </section>

        <section className='roster'>
          <h2>
            {translate('host.players.title')}{' '}
            <span className='count'>{players.length}</span>
          </h2>
          {players.length === 0 ? (
            <p className='empty'>{translate('host.players.empty')}</p>
          ) : (
            <ul>
              {players.map((player) => (
                <li
                  className={player.isConnected ? 'connected' : 'away'}
                  key={player.id}
                >
                  <span className='nickname'>{player.nickname}</span>
                  <span className='score'>{player.score}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <footer>
        {error !== null && (
          <p className='error' role='alert'>
            {translate(protocolErrorKey(error.code))}
          </p>
        )}
        <Button
          isDisabled={players.length === 0}
          onPress={() => {
            send({ type: 'host.startRound' })
          }}
          size='large'
        >
          {translate('host.startGame')}
        </Button>
      </footer>
    </main>
  )
}
