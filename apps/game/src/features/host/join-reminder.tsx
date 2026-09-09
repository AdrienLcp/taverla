import { QRCodeSVG } from 'qrcode.react'
import type React from 'react'

import type { RoomCode } from '@taverla/protocol/identifiers'

import { playUrlFor } from '@/infrastructure/router/navigation'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import './join-reminder.sass'

type JoinReminderProps = {
  roomCode: RoomCode
}

/**
 * A room takes players at any phase — nothing in `joinAsPlayer` looks at the
 * phase — so someone arriving at the seventh round takes a seat and plays the
 * eighth. The way in has to stay on the screen for that to be true in practice,
 * rather than only in the server.
 *
 * Small and in the corner: it is a reminder, not the invitation the lobby
 * makes, and the round on the rest of the screen is what the room is watching.
 */
export const JoinReminder: React.FC<JoinReminderProps> = ({ roomCode }) => {
  const translate = useTranslate()

  return (
    // The sentence names the landmark rather than only sitting inside it, so it
    // still says what these four characters are on a screen too narrow to draw
    // it.
    <aside aria-label={translate('invite.joinLate')} className='join-reminder'>
      {/* Hidden for the reason `RoomInvitation` gives, and the code beside it
          is what a listener can actually act on. */}
      <QRCodeSVG
        aria-hidden='true'
        bgColor='transparent'
        fgColor='currentColor'
        marginSize={0}
        size={64}
        value={playUrlFor(roomCode)}
      />
      <div className='words'>
        <p className='label'>{translate('invite.joinLate')}</p>
        <p className='code'>{roomCode}</p>
      </div>
    </aside>
  )
}
