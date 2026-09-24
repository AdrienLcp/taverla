import type React from 'react'
import { useEffect, useEffectEvent, useState } from 'react'
import { ListBox, ListBoxItem } from 'react-aria-components'

import type { RoundView } from '@taverla/protocol/room'
import {
  SLATE_ANSWER_MAX_LENGTH,
  type SlateLine
} from '@taverla/protocol/slate'

import { slateContent } from '@/helpers/round-content'
import { Button } from '@/presentation/components/button'
import { Disclosure } from '@/presentation/components/disclosure'
import { TextField } from '@/presentation/components/text-field'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import './slate-sheet.sass'

const SAVE_DELAY_MS = 600

const EMPTY_LINE: SlateLine = { answer: null, verdict: null }

const numbersUpTo = (count: number): number[] =>
  Array.from({ length: count }, (_, index) => index + 1)

const firstEmptyIndex = (sheet: readonly SlateLine[]): number =>
  Math.max(
    0,
    sheet.findIndex((line) => line.answer === null)
  )

type SlateSheetProps = {
  /** `false` from the socket means the frame was never written. */
  onWrite: (itemIndex: number, answer: string) => boolean
  round: RoundView
}

/**
 * The writing half: one large field for the number in the player's hand, and a
 * grid of every number that is both how to get to another one and how much of
 * the sheet is done. Nothing here is submitted — each line saves itself, which
 * is what lets a locked screen or a reload come back to the whole sheet.
 */
export const SlateSheet: React.FC<SlateSheetProps> = ({ onWrite, round }) => {
  const translate = useTranslate()
  const content = slateContent(round)
  const sheet = content?.yourSheet ?? []
  const itemCount = content?.itemCount ?? 0
  const [current, setCurrent] = useState(() => firstEmptyIndex(sheet))
  const [drafts, setDrafts] = useState<Readonly<Record<number, string>>>({})

  const answerAt = (index: number): string =>
    drafts[index] ?? sheet[index]?.answer ?? ''

  const save = (index: number) => {
    const draft = drafts[index]

    if (draft !== undefined && draft.trim() !== (sheet[index]?.answer ?? '')) {
      onWrite(index, draft.trim())
    }
  }

  const draft = drafts[current]
  const saveCurrent = useEffectEvent(() => save(current))

  useEffect(() => {
    if (draft === undefined) {
      return
    }

    const timer = setTimeout(saveCurrent, SAVE_DELAY_MS)

    return () => clearTimeout(timer)
  }, [draft])

  const goTo = (index: number) => {
    if (index < 0 || index >= itemCount || index === current) {
      return
    }

    save(current)
    setCurrent(index)
  }

  if (content === null) {
    return null
  }

  const shown = Math.min(current, itemCount - 1)
  const number = shown + 1

  return (
    <section className='slate-sheet'>
      <div className='writing'>
        <p aria-hidden className='number'>
          {number}
        </p>
        <TextField
          autoComplete='off'
          className='answer'
          enterKeyHint={shown < itemCount - 1 ? 'next' : 'done'}
          label={translate('slate.sheet.field', { index: number })}
          maxLength={SLATE_ANSWER_MAX_LENGTH}
          onBlur={() => save(shown)}
          onChange={(next) => {
            setDrafts((previous) => ({ ...previous, [shown]: next }))
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              goTo(shown + 1)
            }
          }}
          value={answerAt(shown)}
        />
        <div className='stepper'>
          <Button
            isDisabled={shown === 0}
            onPress={() => goTo(shown - 1)}
            size='small'
            variant='outlined'
          >
            {translate('slate.sheet.previous')}
          </Button>
          <Button
            isDisabled={shown === itemCount - 1}
            onPress={() => goTo(shown + 1)}
            size='small'
            variant='outlined'
          >
            {translate('slate.sheet.next')}
          </Button>
        </div>
        <p className='saved'>{translate('slate.sheet.saved')}</p>
      </div>

      <ListBox
        aria-label={translate('slate.sheet.grid')}
        className='tiles'
        disallowEmptySelection
        layout='grid'
        onSelectionChange={(keys) => {
          if (keys !== 'all') {
            const [key] = keys

            if (typeof key === 'number') {
              goTo(key)
            }
          }
        }}
        selectedKeys={[shown]}
        selectionMode='single'
      >
        {numbersUpTo(itemCount).map((itemNumber) => {
          const answer = answerAt(itemNumber - 1).trim()
          const name =
            answer === ''
              ? translate('slate.sheet.tile.empty', { index: itemNumber })
              : translate('slate.sheet.tile.filled', {
                  answer,
                  index: itemNumber
                })

          return (
            <ListBoxItem
              aria-label={name}
              className={answer === '' ? 'tile' : 'tile filled'}
              id={itemNumber - 1}
              key={itemNumber}
              textValue={name}
            >
              {itemNumber}
            </ListBoxItem>
          )
        })}
      </ListBox>
    </section>
  )
}

type SlateMarkingProps = {
  round: RoundView
}

/**
 * The correcting half, on the screen of somebody whose paper is on the wall:
 * the number being marked, what they wrote for it, and what the innkeeper made
 * of it. The rest of the sheet is a press away and read-only — it has already
 * been collected.
 */
export const SlateMarking: React.FC<SlateMarkingProps> = ({ round }) => {
  const translate = useTranslate()
  const content = slateContent(round)

  if (content === null || content.currentItemIndex === null) {
    return null
  }

  const sheet = content.yourSheet ?? []
  const index = content.currentItemIndex
  const line = sheet[index]

  return (
    <section className='slate-marking'>
      <p className='framing'>
        {translate('slate.itemOf', {
          count: content.itemCount,
          index: index + 1
        })}
      </p>
      <p aria-hidden className='number'>
        {index + 1}
      </p>
      <div className='yours'>
        <p className='framing'>{translate('slate.yourAnswer')}</p>
        {line?.answer == null ? (
          <p className='answer blank'>{translate('slate.sheet.blank')}</p>
        ) : (
          <p className='answer'>{line.answer}</p>
        )}
      </div>
      {/* A blank is never a group on the wall, so it is never waited on. */}
      {(line?.answer != null || line?.verdict != null) && (
        <p className={`verdict ${verdictClass(line.verdict)}`}>
          {translate(verdictKey(line.verdict))}
        </p>
      )}

      <Disclosure
        className='whole-sheet'
        label={translate('slate.yourSheet')}
        summary={translate('slate.items.summary', { count: content.itemCount })}
      >
        <ol className='lines'>
          {numbersUpTo(sheet.length).map((itemNumber) => {
            const entry = sheet[itemNumber - 1] ?? EMPTY_LINE

            return (
              <li
                aria-current={itemNumber === index + 1 ? 'true' : undefined}
                className={verdictClass(entry.verdict)}
                key={itemNumber}
              >
                <span className='index'>{itemNumber}</span>
                <span className='text'>
                  {entry.answer ?? translate('slate.sheet.blank')}
                </span>
                {entry.verdict !== null && (
                  <span className='mark'>
                    {translate(verdictKey(entry.verdict))}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </Disclosure>
    </section>
  )
}

const verdictClass = (verdict: boolean | null): string =>
  verdict === null ? 'pending' : verdict ? 'right' : 'wrong'

const verdictKey = (
  verdict: boolean | null
): `slate.verdict.${'pending' | 'right' | 'wrong'}` =>
  verdict === null
    ? 'slate.verdict.pending'
    : verdict
      ? 'slate.verdict.right'
      : 'slate.verdict.wrong'
