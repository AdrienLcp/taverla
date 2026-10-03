import type React from 'react'
import { useState } from 'react'

import type { RoomCode } from '@taverla/protocol/identifiers'

import { pairWall } from '@/infrastructure/api/taverla-api'
import {
  homePathFor,
  hostPathFor,
  usePairingCodeParam
} from '@/infrastructure/router/navigation'
import {
  readHeldRooms,
  readHostToken
} from '@/infrastructure/storage/session-storage'
import { Button } from '@/presentation/components/button'
import { Link } from '@/presentation/components/link'
import { DocumentTitle } from '@/presentation/head/document-title'
import { useI18n, useTranslate } from '@/presentation/i18n/i18n-provider'
import { usePhaseField } from '@/presentation/theme/use-phase-field'

import './pair-wall-page.sass'

type Pairing =
  | { status: 'failed' }
  | { status: 'idle' }
  | { roomCode: RoomCode; status: 'paired' }
  | { status: 'pairing' }

/**
 * Where the square on a waiting wall leads. Whoever scans it lands here, and
 * only a device holding a table's token has anything to press: that token is
 * what the wall is handed, so a player who scanned it by mistake is shown why
 * nothing happens rather than a button that fails.
 */
export const PairWallPage: React.FC = () => {
  const { locale } = useI18n()
  const translate = useTranslate()
  const pairingCode = usePairingCodeParam()
  const [hosted] = useState(() =>
    readHeldRooms().filter((room) => room.role === 'host')
  )
  const [pairing, setPairing] = useState<Pairing>({ status: 'idle' })

  usePhaseField('lobby')

  const pair = async (roomCode: RoomCode): Promise<void> => {
    const hostToken = readHostToken(roomCode)

    if (pairingCode === null || hostToken === null) {
      setPairing({ status: 'failed' })

      return
    }

    setPairing({ status: 'pairing' })

    const paired = await pairWall({ hostToken, pairingCode, roomCode })

    setPairing(
      paired.status === 'success'
        ? { roomCode, status: 'paired' }
        : { status: 'failed' }
    )
  }

  if (pairing.status === 'paired') {
    return (
      <main className='pair-wall-page'>
        <DocumentTitle>{translate('wall.pair.documentTitle')}</DocumentTitle>
        <h1>{translate('wall.pair.done')}</h1>
        <Link
          href={hostPathFor(pairing.roomCode)}
          size='large'
          variant='filled'
        >
          {translate('wall.pair.backToTable')}
        </Link>
      </main>
    )
  }

  if (pairingCode === null || hosted.length === 0) {
    return (
      <main className='pair-wall-page'>
        <DocumentTitle>{translate('wall.pair.documentTitle')}</DocumentTitle>
        <h1>{translate('wall.pair.nothingHeld.title')}</h1>
        <p>{translate('wall.pair.nothingHeld.description')}</p>
        <Link href={homePathFor(locale)} variant='outlined'>
          {translate('navigation.back')}
        </Link>
      </main>
    )
  }

  return (
    <main className='pair-wall-page'>
      <DocumentTitle>{translate('wall.pair.documentTitle')}</DocumentTitle>
      <h1>{translate('wall.pair.title')}</h1>
      <p>{translate('wall.pair.description', { code: pairingCode })}</p>

      <div className='tables'>
        {hosted.map(({ roomCode }) => (
          <Button
            isDisabled={pairing.status === 'pairing'}
            key={roomCode}
            onPress={() => {
              void pair(roomCode)
            }}
            size='large'
            variant={hosted.length === 1 ? 'filled' : 'outlined'}
          >
            {translate('wall.pair.show', { room: roomCode })}
          </Button>
        ))}
      </div>

      {pairing.status === 'failed' && (
        <p className='error' role='alert'>
          {translate('wall.pair.failed')}
        </p>
      )}
    </main>
  )
}
