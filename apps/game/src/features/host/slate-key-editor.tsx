import type React from 'react'
import { useState } from 'react'

import { SLATE_KEY_MAX_LENGTH } from '@taverla/protocol/slate'

import { Disclosure } from '@/presentation/components/disclosure'
import { TextField } from '@/presentation/components/text-field'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import './slate-key-editor.sass'

type SlateKeyEditorProps = {
  /** Said under the fold's title, where the key is kept matters in the lobby. */
  hint?: string
  isDisabled: boolean
  itemCount: number
  /** One per item index, `null` where nothing is noted. */
  keys: readonly (string | null)[]
  labels: readonly (string | null)[]
  /** Sent when a field is left, with what it holds — empty clears the note. */
  onSetKey: (itemIndex: number, key: string) => void
}

/**
 * The host's answer key, folded because the console is the wall: one box per
 * item, each saved when it is left.
 */
export const SlateKeyEditor: React.FC<SlateKeyEditorProps> = ({
  hint,
  isDisabled,
  itemCount,
  keys,
  labels,
  onSetKey
}) => {
  const translate = useTranslate()
  const [drafts, setDrafts] = useState<Readonly<Record<number, string>>>({})
  const noted = keys.slice(0, itemCount).filter((key) => key !== null).length

  return (
    <Disclosure
      className='answer-key'
      label={translate('slate.key.label')}
      summary={translate('slate.key.summary', { count: noted })}
    >
      {hint !== undefined && <p className='hint'>{hint}</p>}
      <ol className='keys'>
        {Array.from({ length: itemCount }, (_, index) => {
          const saved = keys[index] ?? ''

          return (
            <li key={String(index)}>
              <TextField
                autoComplete='off'
                isDisabled={isDisabled}
                label={translate('slate.key.field', {
                  item:
                    labels[index] ??
                    translate('slate.item', { index: index + 1 })
                })}
                maxLength={SLATE_KEY_MAX_LENGTH}
                onBlur={() => {
                  const draft = drafts[index]

                  if (draft !== undefined && draft.trim() !== saved) {
                    onSetKey(index, draft.trim())
                  }
                }}
                onChange={(next) => {
                  setDrafts((previous) => ({ ...previous, [index]: next }))
                }}
                value={drafts[index] ?? saved}
              />
            </li>
          )
        })}
      </ol>
    </Disclosure>
  )
}
