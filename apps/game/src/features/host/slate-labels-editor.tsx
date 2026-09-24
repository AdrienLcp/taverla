import type React from 'react'
import { useState } from 'react'

import {
  duplicateSlateLabelIndex,
  SLATE_LABEL_MAX_LENGTH
} from '@taverla/protocol/slate'

import { withSlateLabel } from '@/helpers/slate-labels'
import { Disclosure } from '@/presentation/components/disclosure'
import { TextField } from '@/presentation/components/text-field'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import './slate-labels-editor.sass'

type SlateLabelsEditorProps = {
  isDisabled: boolean
  /** Every item the sheet holds now, the ones added while it is open included. */
  itemCount: number
  labels: readonly (string | null)[]
  /** Sent only with a set the server would take: no two items drawn alike. */
  onChange: (labels: (string | null)[]) => void
}

/**
 * Numbers until the host says otherwise: folded, with one box per item that
 * shows the number it keeps while empty. A box is sent when it is left, and
 * held back with a reason when what it says is already on another item.
 */
export const SlateLabelsEditor: React.FC<SlateLabelsEditorProps> = ({
  isDisabled,
  itemCount,
  labels,
  onChange
}) => {
  const translate = useTranslate()
  const [drafts, setDrafts] = useState<Readonly<Record<number, string>>>({})
  const [refusedIndex, setRefusedIndex] = useState<number | null>(null)
  const named = labels
    .slice(0, itemCount)
    .filter((label) => label !== null).length

  const commit = (itemIndex: number) => {
    const draft = drafts[itemIndex]

    if (draft === undefined) {
      return
    }

    const next = withSlateLabel({
      itemCount,
      itemIndex,
      label: draft,
      labels
    })

    if (duplicateSlateLabelIndex(next) !== null) {
      setRefusedIndex(itemIndex)

      return
    }

    setRefusedIndex(null)

    if (
      next.length !== labels.length ||
      next.some((entry, index) => entry !== (labels[index] ?? null))
    ) {
      onChange(next)
    }
  }

  return (
    <Disclosure
      className='slate-labels-editor'
      label={translate('slate.labels.label')}
      summary={
        named === 0
          ? translate('slate.labels.none')
          : translate('slate.labels.some', { count: named })
      }
    >
      <p className='hint'>{translate('slate.labels.hint')}</p>
      <ol className='labels'>
        {Array.from({ length: itemCount }, (_, itemIndex) => {
          const number = String(itemIndex + 1)

          return (
            <li key={number}>
              <TextField
                autoComplete='off'
                errorMessage={translate('slate.labels.duplicate')}
                isDisabled={isDisabled}
                isInvalid={refusedIndex === itemIndex}
                label={translate('slate.item', { index: itemIndex + 1 })}
                maxLength={SLATE_LABEL_MAX_LENGTH}
                onBlur={() => commit(itemIndex)}
                onChange={(next) => {
                  setDrafts((previous) => ({ ...previous, [itemIndex]: next }))

                  if (refusedIndex === itemIndex) {
                    setRefusedIndex(null)
                  }
                }}
                placeholder={number}
                value={drafts[itemIndex] ?? labels[itemIndex] ?? ''}
              />
            </li>
          )
        })}
      </ol>
    </Disclosure>
  )
}
