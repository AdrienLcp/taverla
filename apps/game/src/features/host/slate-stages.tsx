import type React from 'react'
import { useState } from 'react'

import type { ClientMessage } from '@taverla/protocol/client-message'
import type {
  HostRoomView,
  HostRoundContent,
  PublicPlayer
} from '@taverla/protocol/room'
import { MAX_SLATE_ITEMS, SLATE_KEY_MAX_LENGTH } from '@taverla/protocol/slate'

import { slateContent, slateHostContent } from '@/helpers/round-content'
import { Button } from '@/presentation/components/button'
import { CheckIcon } from '@/presentation/components/check-icon'
import { Disclosure } from '@/presentation/components/disclosure'
import { Scoreboard } from '@/presentation/components/scoreboard'
import { TextField } from '@/presentation/components/text-field'
import { ToggleButton } from '@/presentation/components/toggle-button'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import './slate-stages.sass'

type SlateHostContent = Extract<HostRoundContent, { kind: 'slate' }>

type SlateStageProps = {
  /** The socket is open. Every control here sends a frame, so none of them work without it. */
  isLive: boolean
  send: (message: ClientMessage) => boolean
  view: HostRoomView
}

const nicknamesOf = (
  players: readonly PublicPlayer[],
  playerIds: readonly string[]
): string =>
  playerIds
    .map((playerId) => players.find((player) => player.id === playerId))
    .filter((player) => player !== undefined)
    .map((player) => player.nickname)
    .join(', ')

/**
 * The console while the sheets are open. It is the wall, so it shows how far
 * along everyone is and never a word of what they wrote — and the key the host
 * keeps is folded away, because opening it is opening it to the room.
 */
export const SlateWritingStage: React.FC<SlateStageProps> = ({
  isLive,
  send,
  view
}) => {
  const translate = useTranslate()
  const round = view.round
  const content = slateHostContent(view)
  const itemCount = slateContent(round)?.itemCount ?? 0

  if (round === null || content === null) {
    return null
  }

  return (
    <div className='stage slate-writing'>
      <div className='sheet-size'>
        <p className='now'>{translate('slate.wall.filling')}</p>
        <p className='count'>{itemCount}</p>
        <p className='count-label'>{translate('slate.items.label')}</p>
        <Button
          isDisabled={!isLive || itemCount >= MAX_SLATE_ITEMS}
          onPress={() => send({ roundId: round.id, type: 'host.addItem' })}
          size='small'
          variant='outlined'
        >
          {translate('slate.items.add')}
        </Button>
      </div>

      <div className='host-side'>
        <ul className='progress'>
          {view.players.map((player) => {
            const filled =
              content.progress.find((entry) => entry.playerId === player.id)
                ?.filledCount ?? 0

            return (
              <li
                key={player.id}
                style={{ '--filled': itemCount === 0 ? 0 : filled / itemCount }}
              >
                <span className='nickname'>{player.nickname}</span>
                <span className='tally'>
                  {translate('slate.progress', { count: itemCount, filled })}
                </span>
              </li>
            )
          })}
        </ul>

        <AnswerKey
          content={content}
          isLive={isLive}
          itemCount={itemCount}
          onSetKey={(itemIndex, key) =>
            send({ itemIndex, key, roundId: round.id, type: 'host.setItemKey' })
          }
        />
      </div>
    </div>
  )
}

const AnswerKey: React.FC<{
  content: SlateHostContent
  /** The socket is open. */
  isLive: boolean
  itemCount: number
  /** Sent when a field is left, with what it holds — empty clears the note. */
  onSetKey: (itemIndex: number, key: string) => void
}> = ({ content, isLive, itemCount, onSetKey }) => {
  const translate = useTranslate()
  const [drafts, setDrafts] = useState<Readonly<Record<number, string>>>({})
  const noted = content.keys.filter((key) => key !== null).length

  return (
    <Disclosure
      className='answer-key'
      label={translate('slate.key.label')}
      summary={translate('slate.key.summary', { count: noted })}
    >
      <ol className='keys'>
        {Array.from({ length: itemCount }, (_, index) => index + 1).map(
          (itemNumber) => {
            const index = itemNumber - 1
            const saved = content.keys[index] ?? ''

            return (
              <li key={itemNumber}>
                <TextField
                  autoComplete='off'
                  isDisabled={!isLive}
                  label={translate('slate.key.field', { index: itemNumber })}
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
          }
        )}
      </ol>
    </Disclosure>
  )
}

/**
 * The papers marked on the wall, one number at a time: the number, the key the
 * host noted if they choose to show it, every distinct answer with who wrote
 * it, and one press per answer. The standings beside it move with each press.
 */
export const SlateCorrectionStage: React.FC<SlateStageProps> = ({
  isLive,
  send,
  view
}) => {
  const translate = useTranslate()
  const [shownKeyIndex, setShownKeyIndex] = useState<number | null>(null)
  const round = view.round
  const content = slateHostContent(view)
  const itemIndex = slateContent(round)?.currentItemIndex ?? null
  const itemCount = slateContent(round)?.itemCount ?? 0

  if (
    round === null ||
    content === null ||
    content.correction === null ||
    itemIndex === null
  ) {
    return null
  }

  const { blankPlayerIds, groups } = content.correction
  const key = content.keys[itemIndex] ?? null

  return (
    <div
      className='stage slate-correcting'
      style={{ '--standings-rows': view.players.length }}
    >
      <section className='item'>
        <header>
          <p aria-hidden className='number'>
            {itemIndex + 1}
          </p>
          <div className='naming'>
            <h2 className='of'>
              {translate('slate.itemOf', {
                count: itemCount,
                index: itemIndex + 1
              })}
            </h2>
            {key !== null &&
              (shownKeyIndex === itemIndex ? (
                <p className='key'>
                  <span className='key-title'>
                    {translate('slate.correct.key.title')}
                  </span>
                  <span className='key-text'>{key}</span>
                </p>
              ) : (
                <Button
                  onPress={() => setShownKeyIndex(itemIndex)}
                  size='small'
                  variant='underlined'
                >
                  {translate('slate.correct.key.reveal')}
                </Button>
              ))}
          </div>
        </header>

        {groups.length === 0 ? (
          <p className='nobody'>{translate('slate.correct.nobody')}</p>
        ) : (
          <ul className='groups'>
            {groups.map((group) => (
              <li
                className={group.isCorrect === false ? 'group missed' : 'group'}
                key={group.key}
              >
                <div className='said'>
                  <span className='text'>{group.text}</span>
                  <span className='writers'>
                    {nicknamesOf(view.players, group.playerIds)}
                  </span>
                </div>
                <ToggleButton
                  isDisabled={!isLive}
                  isSelected={group.isCorrect === true}
                  onChange={(isCorrect) =>
                    send({
                      groupKey: group.key,
                      itemIndex,
                      roundId: round.id,
                      type: 'host.judgeGroup',
                      verdict: { isCorrect, kind: 'single' }
                    })
                  }
                >
                  <CheckIcon />
                  {translate('slate.correct.judge')}
                </ToggleButton>
              </li>
            ))}
          </ul>
        )}

        {blankPlayerIds.length > 0 && (
          <p className='blanks'>
            {translate('slate.correct.blanks', {
              names: nicknamesOf(view.players, blankPlayerIds)
            })}
          </p>
        )}
      </section>

      <Scoreboard players={view.players} />
    </div>
  )
}

/** Previous and next through the papers, and the scores once the last number is marked. */
export const SlateCorrectionActions: React.FC<SlateStageProps> = ({
  isLive,
  send,
  view
}) => {
  const translate = useTranslate()
  const round = view.round
  const content = slateContent(round)
  const itemIndex = content?.currentItemIndex ?? null

  if (round === null || content === null || itemIndex === null) {
    return null
  }

  const isLast = itemIndex >= content.itemCount - 1

  return (
    <div className='slate-correction-actions'>
      <Button
        isDisabled={!isLive || itemIndex === 0}
        onPress={() =>
          send({
            itemIndex: itemIndex - 1,
            roundId: round.id,
            type: 'host.showItem'
          })
        }
        variant='outlined'
      >
        {translate('slate.correct.previous')}
      </Button>
      {isLast ? (
        <Button
          isDisabled={!isLive}
          onPress={() => send({ roundId: round.id, type: 'host.reveal' })}
        >
          {translate('slate.correct.finish')}
        </Button>
      ) : (
        <Button
          isDisabled={!isLive}
          onPress={() =>
            send({
              itemIndex: itemIndex + 1,
              roundId: round.id,
              type: 'host.showItem'
            })
          }
        >
          {translate('slate.correct.next')}
        </Button>
      )}
    </div>
  )
}

/** The one thing to press while the sheets are open. */
export const SlateWritingActions: React.FC<SlateStageProps> = ({
  isLive,
  send,
  view
}) => {
  const translate = useTranslate()
  const round = view.round

  if (round === null || view.phase !== 'playing') {
    return null
  }

  return (
    <Button
      isDisabled={!isLive}
      onPress={() => send({ roundId: round.id, type: 'host.collectSheets' })}
    >
      {translate('slate.wall.collect')}
    </Button>
  )
}
