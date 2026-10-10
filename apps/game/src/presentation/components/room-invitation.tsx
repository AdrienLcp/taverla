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

  return (
    <CodeAndSquare
      caption={translate('invite.title')}
      code={roomCode}
      codeCaption={translate('invite.typeIt')}
      isUnattended={isUnattended}
      url={playUrlFor(roomCode)}
    />
  )
}

type CodeAndSquareProps = {
  /** What to do with the square, under it. */
  caption: string
  /** Read aloud and typed — the short form of what the square encodes. */
  code: string
  /** What to do with the code, under it. Omitted where the code is not typed by anyone. */
  codeCaption?: string
  /** As on `RoomInvitation`: no copy control on a screen nobody is at. */
  isUnattended?: boolean
  /** What the square encodes, printed under it for whoever cannot scan. */
  url: string
}

/**
 * The composition every way into something takes on this product — a code to
 * say, a square to scan, an address to type — for the one case that is not a
 * room: a wall waiting to be told which room it shows.
 */
export const CodeAndSquare: React.FC<CodeAndSquareProps> = ({
  caption,
  code,
  codeCaption,
  isUnattended,
  url
}) => (
  <section className='room-invitation'>
    <div className='code'>
      <p className='room-code'>{code}</p>
      {codeCaption !== undefined && (
        <p className='code-caption'>{codeCaption}</p>
      )}
      {!isUnattended && <CopyButton value={code} />}
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
      <div className='qr-card'>
        <QRCodeSVG
          aria-hidden='true'
          bgColor='transparent'
          fgColor='currentColor'
          marginSize={0}
          size={256}
          value={url}
        />
      </div>
      <div className='qr-words'>
        <p className='invite'>{caption}</p>
        <JoinUrl url={url} />
      </div>
    </div>
  </section>
)

/**
 * Broken, when it must be, between the host and the path — never inside the
 * code at the end, which is the half somebody reads aloud.
 */
const JoinUrl: React.FC<{ url: string }> = ({ url }) => {
  const pathStart = url.indexOf('/', url.indexOf('//') + 2)

  return (
    <p className='join-url'>
      {url.slice(0, pathStart)}
      <wbr />
      {url.slice(pathStart)}
    </p>
  )
}
