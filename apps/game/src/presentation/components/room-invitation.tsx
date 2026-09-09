import { QRCodeSVG } from 'qrcode.react'
import type React from 'react'

import type { RoomCode } from '@taverla/protocol/identifiers'

import { playUrlFor } from '@/infrastructure/router/navigation'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import { CopyButton } from './copy-button'

import './room-invitation.sass'

type RoomInvitationProps = {
  /**
   * A screen nobody is at: a wall, a projector, a television across the room.
   * It carries the invitation and no control, because the code cannot be taken
   * anywhere from four metres away and a button there would be the only thing
   * on the screen that is not the invitation.
   *
   * The other four stages are all screens somebody is holding or standing at,
   * and on those the code is copied to be sent somewhere.
   */
  isUnattended?: boolean
  /**
   * Read from the address bar rather than from a view, which is what lets a
   * screen put the code up before the socket has answered — and what lets the
   * poster page carry the invitation with no socket at all.
   */
  roomCode: RoomCode
}

/**
 * What the room is reading, as opposed to what any one screen is deciding: the
 * code to say out loud, the square to scan, the address to type.
 *
 * It belongs to the shell rather than to the host, because the way into a room
 * cannot live only on the screen running it — that screen is allowed to be a
 * phone, and then the invitation is in one hand and nobody else's.
 *
 * **The size is the stage's, not the component's.** `--invitation-code-size`
 * and `--invitation-qr-max-width` are the two seams: a console reads its code
 * from four metres, a popover has 280px to spend, and a projector has a wall.
 * The default is the sentence the console's comment already made — as large as
 * its own column allows — because `container-type` is declared here, so a
 * container unit written by any stage resolves against this box wherever it is
 * rendered.
 */
export const RoomInvitation: React.FC<RoomInvitationProps> = ({
  isUnattended,
  roomCode
}) => {
  const translate = useTranslate()
  const joinUrl = playUrlFor(roomCode)

  return (
    <section className='room-invitation'>
      <div className='code'>
        <p className='room-code'>{roomCode}</p>
        {!isUnattended && <CopyButton value={roomCode} />}
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
        <p className='invite'>{translate('invite.title')}</p>
        <p className='join-url'>{joinUrl}</p>
      </div>
    </section>
  )
}
