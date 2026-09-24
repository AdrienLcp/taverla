import type React from 'react'
import { useEffect, useEffectEvent, useState } from 'react'
import { ListBox, ListBoxItem } from 'react-aria-components'

import type { RoundView } from '@taverla/protocol/room'
import {
  SLATE_ANSWER_MAX_LENGTH,
  type SlateItemState,
  type SlateLine
} from '@taverla/protocol/slate'

import { slateContent } from '@/helpers/round-content'
import { slateItemIndexes, slateItemName } from '@/helpers/slate-labels'
import { Button } from '@/presentation/components/button'
import { Disclosure } from '@/presentation/components/disclosure'
import { LockIcon } from '@/presentation/components/lock-icon'
import { TextField } from '@/presentation/components/text-field'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import './slate-sheet.sass'

const SAVE_DELAY_MS = 600

const EMPTY_LINE: SlateLine = { answer: null, verdict: null }

type Labels = readonly (string | null)[]

const openIndexesOf = (itemStates: readonly SlateItemState[]): number[] =>
  itemStates.flatMap((state, index) => (state === 'open' ? [index] : []))

const firstEmptyOpenIndex = ({
  itemStates,
  sheet
}: {
  itemStates: readonly SlateItemState[]
  sheet: readonly SlateLine[]
}): number => {
  const open = openIndexesOf(itemStates)

  return open.find((index) => sheet[index]?.answer == null) ?? open[0] ?? 0
}

type SlateSheetProps = {
  labels: Labels
  /** `false` from the socket means the frame was never written. */
  onWrite: (itemIndex: number, answer: string) => boolean
  round: RoundView
}

/**
 * The writing half: one large field for the item in the player's hand, and a
 * grid of every item that is both how to get to another one and how much of
 * the sheet is done. Nothing here is submitted — each line saves itself, which
 * is what lets a locked screen or a reload come back to the whole sheet. An
 * item the innkeeper has collected is locked in the grid and skipped by the
 * stepper, and the field moves off it if it was the one in hand.
 */
export const SlateSheet: React.FC<SlateSheetProps> = ({
  labels,
  onWrite,
  round
}) => {
  const translate = useTranslate()
  const content = slateContent(round)
  const sheet = content?.yourSheet ?? []
  const itemStates = content?.itemStates ?? []
  const [current, setCurrent] = useState(() =>
    firstEmptyOpenIndex({ itemStates, sheet })
  )
  const [drafts, setDrafts] = useState<Readonly<Record<number, string>>>({})

  const open = openIndexesOf(itemStates)
  const shown = open.includes(current)
    ? current
    : (open.find((index) => index > current) ?? open.at(-1) ?? null)

  const answerAt = (index: number): string =>
    drafts[index] ?? sheet[index]?.answer ?? ''

  const save = (index: number) => {
    const draft = drafts[index]

    if (
      itemStates[index] === 'open' &&
      draft !== undefined &&
      draft.trim() !== (sheet[index]?.answer ?? '')
    ) {
      onWrite(index, draft.trim())
    }
  }

  const draft = shown === null ? undefined : drafts[shown]
  const saveShown = useEffectEvent(() => {
    if (shown !== null) {
      save(shown)
    }
  })

  useEffect(() => {
    if (draft === undefined) {
      return
    }

    const timer = setTimeout(saveShown, SAVE_DELAY_MS)

    return () => clearTimeout(timer)
  }, [draft])

  if (content === null || shown === null) {
    return null
  }

  const goTo = (index: number | undefined) => {
    if (index === undefined || index === shown || !open.includes(index)) {
      return
    }

    save(shown)
    setCurrent(index)
  }

  const previousOpen = open.findLast((index) => index < shown)
  const nextOpen = open.find((index) => index > shown)
  const shownName = slateItemName({ itemIndex: shown, labels })
  const spokenName = (itemIndex: number): string =>
    labels[itemIndex] ?? translate('slate.item', { index: itemIndex + 1 })
  const hasLongLabel = itemStates.some(
    (_, itemIndex) => !slateItemName({ itemIndex, labels }).isShort
  )

  return (
    <section className='slate-sheet'>
      <div className='writing'>
        <p aria-hidden className={shownName.isShort ? 'label' : 'label long'}>
          {shownName.label}
        </p>
        <TextField
          autoComplete='off'
          className='answer'
          enterKeyHint={nextOpen === undefined ? 'done' : 'next'}
          label={translate('slate.sheet.field', { item: spokenName(shown) })}
          maxLength={SLATE_ANSWER_MAX_LENGTH}
          onBlur={() => save(shown)}
          onChange={(next) => {
            setDrafts((previous) => ({ ...previous, [shown]: next }))
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              goTo(nextOpen)
            }
          }}
          value={answerAt(shown)}
        />
        <div className='stepper'>
          <Button
            isDisabled={previousOpen === undefined}
            onPress={() => goTo(previousOpen)}
            size='small'
            variant='outlined'
          >
            {translate('slate.sheet.previous')}
          </Button>
          <Button
            isDisabled={nextOpen === undefined}
            onPress={() => goTo(nextOpen)}
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
        className={hasLongLabel ? 'tiles long' : 'tiles'}
        disabledKeys={itemStates.flatMap((state, index) =>
          state === 'open' ? [] : [index]
        )}
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
        {slateItemIndexes(itemStates.length).map((itemIndex) => {
          const state = itemStates[itemIndex] ?? 'open'
          const answer = answerAt(itemIndex).trim()
          const item = spokenName(itemIndex)
          const { isShort, label } = slateItemName({ itemIndex, labels })
          const name =
            state !== 'open'
              ? translate('slate.sheet.tile.locked', { item })
              : answer === ''
                ? translate('slate.sheet.tile.empty', { item })
                : translate('slate.sheet.tile.filled', { answer, item })

          return (
            <ListBoxItem
              aria-label={name}
              className={answer === '' ? 'tile' : 'tile filled'}
              id={itemIndex}
              key={itemIndex}
              textValue={name}
            >
              <span className={isShort ? 'text' : 'text long'}>{label}</span>
              {state !== 'open' && <LockIcon />}
            </ListBoxItem>
          )
        })}
      </ListBox>
    </section>
  )
}

type SlateOnTheWallProps = {
  /**
   * `true` while the reader still has items to write: a band above the sheet
   * rather than the whole screen, so the pen never leaves the hand.
   */
  isCompact: boolean
  labels: Labels
  round: RoundView
}

/**
 * The item on the wall, on the screen of somebody whose paper it is: its label,
 * what they wrote for it, and what the innkeeper made of it.
 */
export const SlateOnTheWall: React.FC<SlateOnTheWallProps> = ({
  isCompact,
  labels,
  round
}) => {
  const translate = useTranslate()
  const content = slateContent(round)

  if (content === null || content.currentItemIndex === null) {
    return null
  }

  const index = content.currentItemIndex
  const line = content.yourSheet?.[index] ?? EMPTY_LINE
  const name = slateItemName({ itemIndex: index, labels })

  return (
    <section
      aria-live='polite'
      className={isCompact ? 'slate-on-the-wall compact' : 'slate-on-the-wall'}
    >
      <p aria-hidden className={name.isShort ? 'label' : 'label long'}>
        {name.label}
      </p>
      <div className='yours'>
        <p className='framing'>
          {isCompact
            ? translate('slate.marking.now')
            : translate('slate.itemOf', {
                count: content.itemCount,
                index: index + 1
              })}
        </p>
        {line.answer === null ? (
          <p className='answer blank'>{translate('slate.sheet.blank')}</p>
        ) : (
          <p className='answer'>{line.answer}</p>
        )}
      </div>
      {/* A blank is never a group on the wall, so it is never waited on. */}
      {(line.answer !== null || line.verdict !== null) && (
        <p className={`verdict ${verdictClass(line.verdict)}`}>
          {translate(verdictKey(line.verdict))}
        </p>
      )}
    </section>
  )
}

/** Every line of the reader's sheet, read-only, with the verdicts given so far. */
export const SlateWholeSheet: React.FC<{
  labels: Labels
  round: RoundView
}> = ({ labels, round }) => {
  const translate = useTranslate()
  const content = slateContent(round)

  if (content === null) {
    return null
  }

  const sheet = content.yourSheet ?? []

  return (
    <Disclosure
      className='slate-whole-sheet'
      label={translate('slate.yourSheet')}
      summary={translate('slate.items.summary', { count: content.itemCount })}
    >
      <ol className='lines'>
        {slateItemIndexes(content.itemCount).map((itemIndex) => {
          const entry = sheet[itemIndex] ?? EMPTY_LINE

          return (
            <li
              aria-current={
                itemIndex === content.currentItemIndex ? 'true' : undefined
              }
              className={verdictClass(entry.verdict)}
              key={itemIndex}
            >
              <span className='index'>
                {slateItemName({ itemIndex, labels }).label}
              </span>
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
