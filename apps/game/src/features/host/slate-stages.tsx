import type React from 'react'

import type { ClientMessage } from '@taverla/protocol/client-message'
import type { HostRoomView, PublicPlayer } from '@taverla/protocol/room'
import { MAX_SLATE_ITEMS, type SlateItemState } from '@taverla/protocol/slate'

import { slateContent, slateHostContent } from '@/helpers/round-content'
import {
  slateItemIndexes,
  slateItemName,
  slateLabelsOf
} from '@/helpers/slate-labels'
import { Button } from '@/presentation/components/button'
import { CheckIcon } from '@/presentation/components/check-icon'
import { LockIcon } from '@/presentation/components/lock-icon'
import { Scoreboard } from '@/presentation/components/scoreboard'
import { ToggleButton } from '@/presentation/components/toggle-button'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import type { StageControls } from './room-stage'
import { SlateKeyEditor } from './slate-key-editor'
import { SlateLabelsEditor } from './slate-labels-editor'
import type { SlateWall } from './use-slate-wall'

import './slate-stages.sass'

type SlateStageProps = {
  /** The socket is open. Every control here sends a frame, so none of them work without it. */
  isLive: boolean
  send: (message: ClientMessage) => boolean
  view: HostRoomView
  wall: SlateWall
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

const closedIndexesOf = (itemStates: readonly SlateItemState[]): number[] =>
  itemStates.flatMap((state, index) => (state === 'open' ? [] : [index]))

type SlateBoardProps = {
  /** `null` on the wall, which shows the board and moves nothing on it. */
  controls: StageControls | null
  view: HostRoomView
}

/**
 * The room's screen while the sheets are open. It shows how far along everyone
 * is and never a word of what they wrote: every item with how many sheets have
 * it, closed one at a time as the room is done with it.
 */
export const SlateWritingStage: React.FC<SlateBoardProps> = ({
  controls,
  view
}) => {
  const translate = useTranslate()
  const round = view.round
  const content = slateHostContent(view)
  const roundContent = slateContent(round)
  const game = view.settings.game

  if (round === null || content === null || roundContent === null) {
    return null
  }

  const isDisabled = controls === null || !controls.isLive
  const { itemCount, itemStates } = roundContent
  const hasOpenItem = itemStates.includes('open')
  const labels = slateLabelsOf(view.settings)
  const spokenName = (itemIndex: number): string =>
    labels[itemIndex] ?? translate('slate.item', { index: itemIndex + 1 })

  return (
    <div className='stage slate-writing'>
      <section className='item-board'>
        <header>
          <h2 className='now'>
            {translate(
              hasOpenItem ? 'slate.wall.filling' : 'slate.wall.allCollected'
            )}
          </h2>
          <div className='size'>
            <p className='count-label'>
              {translate('slate.items.summary', { count: itemCount })}
            </p>
            {controls !== null && (
              <Button
                isDisabled={isDisabled || itemCount >= MAX_SLATE_ITEMS}
                onPress={() =>
                  controls.send({ roundId: round.id, type: 'host.addItem' })
                }
                size='small'
                variant='outlined'
              >
                {translate('slate.items.add')}
              </Button>
            )}
          </div>
        </header>

        <ol aria-label={translate('slate.items.label')} className='items'>
          {slateItemIndexes(itemCount).map((itemIndex) => {
            const state = itemStates[itemIndex] ?? 'open'
            const name = slateItemName({ itemIndex, labels })

            return (
              <li className={`item ${state}`} key={`${round.id}:${itemIndex}`}>
                <span
                  aria-hidden
                  className={name.isShort ? 'label' : 'label long'}
                  title={name.label}
                >
                  {name.label}
                </span>
                <span className='state'>
                  {state === 'open' ? (
                    translate('slate.board.state.open', {
                      count: view.players.length,
                      filled: content.filledCounts[itemIndex] ?? 0
                    })
                  ) : (
                    <>
                      {state === 'closed' ? <LockIcon /> : <CheckIcon />}
                      {translate(
                        state === 'closed'
                          ? 'slate.board.state.closed'
                          : 'slate.board.state.marked'
                      )}
                    </>
                  )}
                </span>
                {controls !== null &&
                  (state === 'open' ? (
                    <Button
                      aria-label={translate('slate.board.closeItem', {
                        item: spokenName(itemIndex)
                      })}
                      isDisabled={isDisabled}
                      onPress={() =>
                        controls.send({
                          itemIndex,
                          roundId: round.id,
                          type: 'host.closeItem'
                        })
                      }
                      size='small'
                      variant='outlined'
                    >
                      {translate('slate.board.close')}
                    </Button>
                  ) : (
                    <Button
                      aria-label={translate('slate.board.markItem', {
                        item: spokenName(itemIndex)
                      })}
                      isDisabled={isDisabled}
                      onPress={() =>
                        controls.send({
                          itemIndex,
                          roundId: round.id,
                          type: 'host.showItem'
                        })
                      }
                      size='small'
                      variant='outlined'
                    >
                      {translate('slate.board.show')}
                    </Button>
                  ))}
              </li>
            )
          })}
        </ol>
      </section>

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

        {controls !== null && (
          <SlateKeyEditor
            isDisabled={isDisabled}
            itemCount={itemCount}
            keys={content.keys}
            labels={labels}
            onSetKey={(itemIndex, key) => {
              controls.onRememberSlateKey(itemIndex, key)
              controls.send({
                itemIndex,
                key,
                roundId: round.id,
                type: 'host.setItemKey'
              })
            }}
          />
        )}

        {controls !== null && game?.kind === 'slate' && (
          <SlateLabelsEditor
            isDisabled={isDisabled}
            itemCount={itemCount}
            labels={game.labels}
            onChange={(next) => {
              controls.onSettingsChange({
                ...view.settings,
                game: { ...game, labels: next }
              })
            }}
          />
        )}
      </div>
    </div>
  )
}

/**
 * The papers marked in front of the room, one item at a time: its label, the
 * key the host noted if they choose to show it, every distinct answer with who
 * wrote it, and one press per answer. The standings beside it move with each
 * press. The wall draws the marks and not the presses.
 */
export const SlateCorrectionStage: React.FC<SlateBoardProps> = ({
  controls,
  view
}) => {
  const translate = useTranslate()
  const round = view.round
  const content = slateHostContent(view)
  const roundContent = slateContent(round)
  const itemIndex = roundContent?.currentItemIndex ?? null
  const itemCount = roundContent?.itemCount ?? 0

  if (
    round === null ||
    content === null ||
    content.correction === null ||
    itemIndex === null
  ) {
    return null
  }

  const isDisabled = controls === null || !controls.isLive
  const { blankPlayerIds, groups } = content.correction
  const key = content.keys[itemIndex] ?? null
  const revealedKey = roundContent?.revealedKeys[itemIndex] ?? null
  const name = slateItemName({
    itemIndex,
    labels: slateLabelsOf(view.settings)
  })

  return (
    <div
      className='stage slate-correcting'
      style={{ '--standings-rows': view.players.length }}
    >
      <section className='item'>
        <header>
          <p aria-hidden className={name.isShort ? 'label' : 'label long'}>
            {name.label}
          </p>
          <div className='naming'>
            <h2 className='of'>
              {translate('slate.itemOf', {
                count: itemCount,
                index: itemIndex + 1
              })}
            </h2>
          </div>
        </header>

        {revealedKey !== null ? (
          <p className='key' key={itemIndex}>
            <span className='key-title'>
              {translate('slate.correct.key.title')}
            </span>
            <span className='key-text'>{revealedKey}</span>
          </p>
        ) : (
          controls !== null &&
          key !== null && (
            <Button
              className='reveal-key'
              isDisabled={isDisabled}
              onPress={() =>
                controls.send({
                  itemIndex,
                  roundId: round.id,
                  type: 'host.revealItemKey'
                })
              }
              size='large'
              variant='outlined'
            >
              {translate('slate.correct.key.reveal')}
            </Button>
          )
        )}

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
                {controls === null ? (
                  group.isCorrect === true && (
                    <span className='mark'>
                      <CheckIcon />
                      <span className='mark-label'>
                        {translate('slate.correct.judge')}
                      </span>
                    </span>
                  )
                ) : (
                  <ToggleButton
                    isDisabled={isDisabled}
                    isSelected={group.isCorrect === true}
                    onChange={(isCorrect) =>
                      controls.send({
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
                )}
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

/**
 * Through the closed items, and on to whatever comes after the last of them:
 * the rest of the sheets while any item is open, the scores once none is.
 */
export const SlateCorrectionActions: React.FC<SlateStageProps> = ({
  isLive,
  send,
  view,
  wall
}) => {
  const translate = useTranslate()
  const round = view.round
  const content = slateContent(round)
  const itemIndex = content?.currentItemIndex ?? null

  if (round === null || content === null || itemIndex === null) {
    return null
  }

  const closed = closedIndexesOf(content.itemStates)
  const previous = closed.findLast((index) => index < itemIndex)
  const next = closed.find((index) => index > itemIndex)
  const hasOpenItem = content.itemStates.includes('open')

  const primary =
    next !== undefined ? (
      <Button
        isDisabled={!isLive}
        onPress={() =>
          send({ itemIndex: next, roundId: round.id, type: 'host.showItem' })
        }
      >
        {translate('slate.correct.next')}
      </Button>
    ) : hasOpenItem ? (
      <Button
        isDisabled={!isLive}
        onPress={() => send({ roundId: round.id, type: 'host.collectSheets' })}
      >
        {translate('slate.wall.collectRest')}
      </Button>
    ) : (
      <Button
        isDisabled={!isLive}
        onPress={() => send({ roundId: round.id, type: 'host.reveal' })}
      >
        {translate('slate.correct.finish')}
      </Button>
    )

  return (
    <div className='slate-actions'>
      <Button
        isDisabled={!isLive || previous === undefined}
        onPress={() => {
          if (previous !== undefined) {
            send({
              itemIndex: previous,
              roundId: round.id,
              type: 'host.showItem'
            })
          }
        }}
        variant='outlined'
      >
        {translate('slate.correct.previous')}
      </Button>
      {primary}
      <Button
        className='aside'
        onPress={wall.showSheets}
        size='small'
        variant='underlined'
      >
        {translate(hasOpenItem ? 'slate.wall.toSheets' : 'slate.wall.toList')}
      </Button>
    </div>
  )
}

/** Collecting what is left, and the way back to the item on the wall. */
export const SlateWritingActions: React.FC<SlateStageProps> = ({
  isLive,
  send,
  view,
  wall
}) => {
  const translate = useTranslate()
  const round = view.round
  const content = slateContent(round)

  if (round === null || content === null || view.phase !== 'playing') {
    return null
  }

  const hasOpenItem = content.itemStates.includes('open')
  const hasClosedItem = content.currentItemIndex !== null

  return (
    <div className='slate-actions'>
      {hasOpenItem && (
        <Button
          isDisabled={!isLive}
          onPress={() =>
            send({ roundId: round.id, type: 'host.collectSheets' })
          }
        >
          {translate(
            hasClosedItem ? 'slate.wall.collectRest' : 'slate.wall.collect'
          )}
        </Button>
      )}
      {hasClosedItem && (
        <Button
          onPress={wall.showWall}
          variant={hasOpenItem ? 'outlined' : 'filled'}
        >
          {translate('slate.wall.toWall')}
        </Button>
      )}
    </div>
  )
}
