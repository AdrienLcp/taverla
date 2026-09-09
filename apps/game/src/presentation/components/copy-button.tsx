import type React from 'react'
import { useEffect, useState } from 'react'

import { copyToClipboard } from '@/infrastructure/env'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import type { PlainTranslationKey } from '@/presentation/i18n/translation'

import { Button } from './button'
import { CheckIcon } from './check-icon'
import { CopyIcon } from './copy-icon'

/** Long enough to be read from where the host is standing, gone before the next glance. */
const CONFIRMATION_MS = 2_000

type CopyState = 'copied' | 'failed' | 'idle'

const COPY_KEYS: Record<CopyState, PlainTranslationKey> = {
  copied: 'invite.copied',
  failed: 'invite.copyFailed',
  idle: 'invite.copyCode'
}

type CopyButtonProps = {
  /** What lands in the clipboard. */
  value: string
}

/**
 * The label is the whole feedback, which is why it is the button's own text
 * rather than a note beside it: a control that renames itself to "Copied" is
 * announced to a screen reader on the press it just took, and takes no room on
 * the screen when it has nothing to say.
 *
 * The word stays beside the glyph rather than giving way to it. Both a child
 * and a grandparent are expected here, and a bare icon asks them to already
 * know what it means.
 *
 * It says *the code* rather than *this*, because the room code is the only
 * thing in the product anybody copies — a generic label would be the wrapper
 * pretending to a reach it does not have.
 */
export const CopyButton: React.FC<CopyButtonProps> = ({ value }) => {
  const translate = useTranslate()
  const [state, setState] = useState<CopyState>('idle')

  useEffect(() => {
    if (state === 'idle') {
      return
    }

    const timer = window.setTimeout(() => {
      setState('idle')
    }, CONFIRMATION_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [state])

  const copy = async (): Promise<void> => {
    setState((await copyToClipboard(value)) ? 'copied' : 'failed')
  }

  return (
    <Button
      onPress={() => {
        void copy()
      }}
      size='small'
      variant='outlined'
    >
      {state === 'copied' ? <CheckIcon /> : <CopyIcon />}
      {translate(COPY_KEYS[state])}
    </Button>
  )
}
