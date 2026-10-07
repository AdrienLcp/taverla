import type React from 'react'
import { useEffect, useEffectEvent, useState } from 'react'
import { useNavigate } from 'react-router'

import type { OpenWallPairingResponse } from '@taverla/protocol/http'

import {
  openWallPairing,
  pollWallPairing
} from '@/infrastructure/api/taverla-api'
import { pairWallUrlFor, wallPathFor } from '@/infrastructure/router/navigation'
import { writeHostToken } from '@/infrastructure/storage/session-storage'
import { Button } from '@/presentation/components/button'
import { CodeAndSquare } from '@/presentation/components/room-invitation'
import { DocumentTitle } from '@/presentation/head/document-title'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { usePhaseField } from '@/presentation/theme/use-phase-field'
import { useIdleChrome } from '@/presentation/use-idle-chrome'

import './wall-pairing-page.sass'
import { Main } from '@/presentation/components/main'

/**
 * Often enough that the wall changes while the host is still looking up from
 * the press that paired it, rarely enough that a screen left waiting all
 * evening costs the server nothing worth counting.
 */
const POLL_INTERVAL_MS = 1_500

type Pairing =
  | { status: 'failed' }
  | { status: 'opening' }
  | ({ status: 'waiting' } & OpenWallPairingResponse)

/**
 * A screen asking to be told which table it shows. It holds nothing yet, so
 * everything on it is safe for the whole room to read: the code pairs only
 * with a device that already holds the room's token, and that device is the
 * one that confirms.
 */
export const WallPairingPage: React.FC = () => {
  const [attempt, setAttempt] = useState(0)

  // A code that stopped pairing — expired, or collected elsewhere — is replaced
  // by starting over, which is what a fresh key gives the screen below.
  return (
    <PairingScreen
      key={attempt}
      onStale={() => setAttempt((previous) => previous + 1)}
    />
  )
}

const PairingScreen: React.FC<{ onStale: () => void }> = ({ onStale }) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const [pairing, setPairing] = useState<Pairing>({ status: 'opening' })
  const startOver = useEffectEvent(onStale)

  usePhaseField('lobby')
  useIdleChrome(pairing.status === 'waiting')

  useEffect(() => {
    const controller = new AbortController()

    const open = async (): Promise<void> => {
      const opened = await openWallPairing({ signal: controller.signal })

      if (!controller.signal.aborted) {
        setPairing(
          opened.status === 'success'
            ? { ...opened.data, status: 'waiting' }
            : { status: 'failed' }
        )
      }
    }

    void open()

    return () => {
      controller.abort()
    }
  }, [])

  const pairingCode = pairing.status === 'waiting' ? pairing.pairingCode : null
  const secret = pairing.status === 'waiting' ? pairing.secret : null

  useEffect(() => {
    if (pairingCode === null || secret === null) {
      return
    }

    const controller = new AbortController()
    let timer: number | undefined

    // The next poll waits for this one's answer, so a slow link or a waking
    // instance never has two in flight to resolve out of order.
    const pollLater = (): void => {
      timer = window.setTimeout(() => {
        void poll()
      }, POLL_INTERVAL_MS)
    }

    const poll = async (): Promise<void> => {
      const polled = await pollWallPairing({
        pairingCode,
        secret,
        signal: controller.signal
      })

      if (controller.signal.aborted) {
        return
      }

      // Refused means the code is gone — expired, or collected by a tab that
      // is not this one — so the screen asks for another rather than showing
      // one that pairs nothing. Unreachable says nothing about the code.
      if (polled.status === 'failure') {
        if (polled.error === 'rejected') {
          startOver()
        } else {
          pollLater()
        }

        return
      }

      if (polled.data.status === 'paired') {
        writeHostToken({
          hostToken: polled.data.hostToken,
          roomCode: polled.data.roomCode
        })
        void navigate(wallPathFor(polled.data.roomCode), { replace: true })

        return
      }

      pollLater()
    }

    pollLater()

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [navigate, pairingCode, secret])

  if (pairing.status === 'failed') {
    return (
      <Main className='wall-pairing-page failed'>
        <DocumentTitle>{translate('wall.pairing.documentTitle')}</DocumentTitle>
        <h1>{translate('wall.pairing.failed')}</h1>
        <Button onPress={onStale} variant='outlined'>
          {translate('wall.pairing.retry')}
        </Button>
      </Main>
    )
  }

  return (
    <Main className='wall-pairing-page'>
      <DocumentTitle>{translate('wall.pairing.documentTitle')}</DocumentTitle>
      <h1>{translate('wall.pairing.title')}</h1>
      {pairing.status === 'waiting' && (
        <CodeAndSquare
          caption={translate('wall.pairing.caption')}
          code={pairing.pairingCode}
          isUnattended
          url={pairWallUrlFor(pairing.pairingCode)}
        />
      )}
    </Main>
  )
}
