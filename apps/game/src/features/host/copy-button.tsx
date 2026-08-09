import { useEffect, useState } from 'react'

import { copyToClipboard } from '@/infrastructure/env'
import { Button } from '@/presentation/components/button'
import { CheckIcon } from '@/presentation/components/check-icon'
import { CopyIcon } from '@/presentation/components/copy-icon'
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
 *
 * The word stays beside the glyph rather than giving way to it. Both a child
 * and a grandparent are expected here, and a bare icon asks them to already
 * know what it means.
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
