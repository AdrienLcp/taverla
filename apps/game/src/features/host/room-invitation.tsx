import { QRCodeSVG } from 'qrcode.react'
import type React from 'react'

import type { RoomCode } from '@taverla/protocol/identifiers'

import { playUrlFor } from '@/infrastructure/router/navigation'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import { CopyButton } from './copy-button'

type RoomInvitationProps = {
  /**
   * Read from the address bar rather than from a view, which is what lets the
   * console put the code up before the socket has answered.
   */
  roomCode: RoomCode
}

/**
 * What the room is reading, as opposed to what the host is deciding: the code
 * to say out loud, the square to scan, the address to type.
 */
export const RoomInvitation: React.FC<RoomInvitationProps> = ({ roomCode }) => {
  const translate = useTranslate()
  const joinUrl = playUrlFor(roomCode)

  return (
    <section className='invitation'>
      <div className='code'>
        <p className='room-code'>{roomCode}</p>
        <CopyButton value={roomCode} />
      </div>
      <div className='qr'>
        {/*
          Hidden rather than named. `qrcode.react` stamps `role="img"` on the
          square whether or not it was given a `title`, so an unnamed one is a
          graphic with no alternative — and the alternative is already on the
          screen twice: the line under it says what to do with the square, and
          the address below that is what the square encodes. A screen reader
          cannot point a camera at anything, so naming it would announce a
          shortcut its listener has no way to take, ahead of the address that
          is the way in.
        */}
        <QRCodeSVG
          aria-hidden='true'
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
  )
}
