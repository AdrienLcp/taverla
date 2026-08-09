import { useEffect, useState } from 'react'

import { copyToClipboard } from '@/infrastructure/env'
import { Button } from '@/presentation/components/button'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import type { TranslationKey } from '@/presentation/i18n/translation'

/** Long enough to be read from where the host is standing, gone before the next glance. */
const CONFIRMATION_MS = 2_000

type CopyState = 'copied' | 'failed' | 'idle'

const COPY_KEYS: Record<CopyState, TranslationKey> = {
  copied: 'host.copied',
  failed: 'host.copyFailed',
  idle: 'host.copyCode'
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
 */
export const CopyButton = ({ value }: CopyButtonProps) => {
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
      className='copy-button'
      onPress={() => {
        void copy()
      }}
      variant='outlined'
    >
      {translate(COPY_KEYS[state])}
    </Button>
  )
}
