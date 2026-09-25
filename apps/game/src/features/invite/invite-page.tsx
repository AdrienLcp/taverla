import type React from 'react'
import { useEffect, useState } from 'react'

import { roomExists } from '@/infrastructure/api/taverla-api'
import {
  homePathFor,
  useRoomCodeParam
} from '@/infrastructure/router/navigation'
import { Link } from '@/presentation/components/link'
import { RoomInvitation } from '@/presentation/components/room-invitation'
import { useDocumentTitle } from '@/presentation/head/use-document-title'
import { useI18n, useTranslate } from '@/presentation/i18n/i18n-provider'
import { usePhaseField } from '@/presentation/theme/use-phase-field'
import { useIdleChrome } from '@/presentation/use-idle-chrome'

import './invite-page.sass'

/**
 * The invitation on a screen with nothing else on it, for the machine wired to
 * the projector — which is usually not the machine running the room.
 *
 * **It opens no socket and holds no seat.** The code comes from the address bar
 * and the address from this origin, which is rung 1 of the waiting ladder and
 * already what lets a console draw the invitation before its first snapshot. A
 * laptop at an event has no room to join and nothing to be granted: this page
 * draws what the room is already showing, and that is the whole of its
 * authority.
 *
 * The field is the lobby's, because that is what the room is in whenever
 * somebody is still arriving — and it is the token default, so a first paint
 * before React runs is already the right colour.
 *
 * **It is the only screen in the product nobody is at**, and both of the things
 * that makes it draw differently follow from that one fact rather than from the
 * hardware. The invitation carries no control, because the code four metres
 * from the nearest hand cannot be copied anywhere. And the chrome goes quiet on
 * its own: the menu is where a wall's ground and its one line of text are
 * chosen, and the machine wired to the projector is often not the one running
 * the room — so hiding it outright would leave somebody at an unfamiliar
 * keyboard with a light field in a dark room and no way to say so.
 *
 * The room that resolves to nothing is the exception both times. That screen is
 * read by somebody at a keyboard, and its way home is the only thing on it.
 */
export const InvitePage: React.FC = () => {
  const { locale } = useI18n()
  const roomCode = useRoomCodeParam()
  const translate = useTranslate()
  const [isMissing, setIsMissing] = useState(false)
  const isWall = roomCode !== null && !isMissing

  usePhaseField('lobby')
  useDocumentTitle(translate('invite.documentTitle'))
  useIdleChrome(isWall)

  // After the paint, never before it: a projector showing nothing while a
  // request settles is the failure this page exists to avoid. Only a room the
  // server *answered for* and denied takes the invitation down — an unreachable
  // server says nothing about the code, and blanking a wall on a dropped
  // request would be the same fault wearing a different hat.
  useEffect(() => {
    if (roomCode === null) {
      return
    }

    let isCurrent = true

    const check = async (): Promise<void> => {
      const found = await roomExists(roomCode)

      if (isCurrent && found.status === 'success' && !found.data) {
        setIsMissing(true)
      }
    }

    void check()

    return () => {
      isCurrent = false
    }
  }, [roomCode])

  if (!isWall) {
    return (
      <main className='invite-page missing'>
        <h1>{translate('invite.unknown.title')}</h1>
        <p>{translate('invite.unknown.description')}</p>
        <Link href={homePathFor(locale)} variant='outlined'>
          {translate('navigation.back')}
        </Link>
      </main>
    )
  }

  return (
    <main className='invite-page'>
      <RoomInvitation isUnattended roomCode={roomCode} />
    </main>
  )
}
