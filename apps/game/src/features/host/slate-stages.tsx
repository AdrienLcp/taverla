import type React from 'react'
import { useId, useRef } from 'react'
import { Button as ReactAriaButton } from 'react-aria-components'

import type { ClientMessage } from '@taverla/protocol/client-message'
import type { HostRoomView, PublicPlayer } from '@taverla/protocol/room'
import { MAX_SLATE_ITEMS, type SlateItemState } from '@taverla/protocol/slate'

import { slateContent, slateHostContent } from '@/helpers/round-content'
import {
  type SlateItemName,
  slateItemIndexes,
  slateItemName,
  slateLabelsOf
} from '@/helpers/slate-labels'
import { Button } from '@/presentation/components/button'
import { CheckIcon, LockIcon } from '@/presentation/components/icons'
import { Pawn } from '@/presentation/components/pawn'
import { ToggleButton } from '@/presentation/components/toggle-button'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import type { StageControls } from './room-stage'
import { SlateKeyEditor } from './slate-key-editor'
import { SlateLabelsEditor } from './slate-labels-editor'
import { Standings } from './standings'
import { useFittedGrid } from './use-fitted-grid'
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

type ItemPieceProps = {
  /** How many sheets have something on this item; read only while it is open. */
  filled: number
  name: SlateItemName
  /** `null` on the wall, where the piece is printed and nothing presses it. */
  onPress: (() => void) | null
  /** Disabled while the socket is down: every press sends a frame. */
  isDisabled: boolean
  /** The press's whole outcome, spoken — the verb printed on the piece names no item. */
  pressLabel: string
  seatCount: number
  state: SlateItemState
}

/**
 * One item as a piece of the box: a paper card while it is written on, a
 * saffron token once collected and owed to the wall, an empty socket once
 * marked. On the console the whole piece is the press.
 */
const ItemPiece: React.FC<ItemPieceProps> = ({
  filled,
  isDisabled,
  name,
  onPress,
  pressLabel,
  seatCount,
  state
}) => {
  const translate = useTranslate()
  const face = (
    <>
      <span
        aria-hidden
        className={name.isShort ? 'label' : 'label long'}
        title={name.label}
      >
        {name.label}
      </span>
      {state === 'open' ? (
        <span
          className='filling'
          style={{ '--filled': seatCount === 0 ? 0 : filled / seatCount }}
        >
          {translate('slate.board.state.open', { count: seatCount, filled })}
        </span>
      ) : state === 'closed' && onPress !== null ? (
        <span className='state'>
          <LockIcon />
        </span>
      ) : (
        <span className='state'>
          {state === 'closed' ? <LockIcon /> : <CheckIcon />}
          {translate(
            state === 'closed'
              ? 'slate.board.state.closed'
              : 'slate.board.state.marked'
          )}
        </span>
      )}
      {onPress !== null && state !== 'marked' && (
        <span aria-hidden className='verb'>
          {translate(
            state === 'open' ? 'slate.board.close' : 'slate.board.show'
          )}
        </span>
      )}
    </>
  )

  return onPress === null ? (
    <div className='face'>{face}</div>
  ) : (
    <ReactAriaButton
      aria-label={pressLabel}
      className='face'
      isDisabled={isDisabled}
      onPress={onPress}
    >
      {face}
    </ReactAriaButton>
  )
}

/** How much taller than wide a piece is: the numeral, its count and its verb. */
const ITEM_ASPECT = 1.06

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
  const sheetsTitleId = useId()
  const itemsGrid = useRef<HTMLOListElement>(null)
  const round = view.round
  const content = slateHostContent(view)
  const roundContent = slateContent(round)
  const game = view.settings.game

  useFittedGrid({
    aspect: ITEM_ASPECT,
    count: roundContent?.itemCount ?? 0,
    grid: itemsGrid
  })

  if (round === null || content === null || roundContent === null) {
    return null
  }

  const isDisabled = controls === null || !controls.isLive
  const { itemCount, itemStates } = roundContent
  const hasOpenItem = itemStates.includes('open')
  const labels = slateLabelsOf(view.settings)
  const spokenName = (itemIndex: number): string =>
    labels[itemIndex] ?? translate('slate.item', { index: itemIndex + 1 })
  const pressOf = (itemIndex: number, state: SlateItemState) =>
    controls === null
      ? null
      : () =>
          controls.send(
            state === 'open'
              ? { itemIndex, roundId: round.id, type: 'host.closeItem' }
              : { itemIndex, roundId: round.id, type: 'host.showItem' }
          )

  return (
    <div
      className='stage slate-writing'
      style={{ '--items': itemCount, '--sheets': view.players.length }}
    >
      <section className='item-board'>
        <header>
          <h2 className='now'>
            {translate(
              hasOpenItem ? 'slate.wall.filling' : 'slate.wall.allCollected'
            )}
          </h2>
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
        </header>

        <ol
          aria-label={translate('slate.items.label')}
          className='items'
          ref={itemsGrid}
        >
          {slateItemIndexes(itemCount).map((itemIndex) => {
            const state = itemStates[itemIndex] ?? 'open'

            return (
              <li className={`item ${state}`} key={`${round.id}:${itemIndex}`}>
                <ItemPiece
                  filled={content.filledCounts[itemIndex] ?? 0}
                  isDisabled={isDisabled}
                  name={slateItemName({ itemIndex, labels })}
                  onPress={pressOf(itemIndex, state)}
                  pressLabel={translate(
                    state === 'open'
                      ? 'slate.board.closeItem'
                      : 'slate.board.markItem',
                    { item: spokenName(itemIndex) }
                  )}
                  seatCount={view.players.length}
                  state={state}
                />
              </li>
            )
          })}
        </ol>
      </section>

      <div className='host-side'>
        <section aria-labelledby={sheetsTitleId} className='sheets'>
          <h2 className='sheets-title' id={sheetsTitleId}>
            {translate('slate.board.sheets')}
          </h2>
          <ul className='progress'>
            {view.players.map((player, seat) => {
              const filled =
                content.progress.find((entry) => entry.playerId === player.id)
                  ?.filledCount ?? 0

              return (
                <li
                  key={player.id}
                  style={{
                    '--filled': itemCount === 0 ? 0 : filled / itemCount
                  }}
                >
                  <Pawn seat={seat} />
                  <span className='nickname'>{player.nickname}</span>
                  <span className='tally'>
                    {translate('slate.progress', {
                      count: itemCount,
                      filled
                    })}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>

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

const groupClassName = (isCorrect: boolean | null): string =>
  isCorrect === true
    ? 'group right'
    : isCorrect === false
      ? 'group missed'
      : 'group'

/**
 * The papers marked in front of the room, one item at a time: its token, the
 * key the host noted printed on a card once they show it, every distinct
 * answer with the pawns of who wrote it, and one press per answer. The
 * standings beside it move with each press. The wall draws the marks and not
 * the presses.
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
  const seatOf = (playerId: string): number =>
    view.players.findIndex((player) => player.id === playerId)

  return (
    <div
      className='stage slate-correcting'
      style={{
        '--groups': Math.max(
          groups.length + (blankPlayerIds.length > 0 ? 1 : 0),
          1
        ),
        '--standings-rows': view.players.length
      }}
    >
      <section className='marking'>
        <header>
          <p aria-hidden className={name.isShort ? 'token' : 'token long'}>
            <span className='token-label'>{name.label}</span>
          </p>
          <div className='naming'>
            <h2 className='of'>
              {translate('slate.itemOf', {
                count: itemCount,
                index: itemIndex + 1
              })}
            </h2>

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
                  variant='outlined'
                >
                  {translate('slate.correct.key.reveal')}
                </Button>
              )
            )}
          </div>
        </header>

        {groups.length === 0 && (
          <p className='nobody'>{translate('slate.correct.nobody')}</p>
        )}
        {groups.length + blankPlayerIds.length > 0 && (
          <ul className='groups'>
            {groups.map((group) => (
              <li className={groupClassName(group.isCorrect)} key={group.key}>
                <div className='said'>
                  <span className='text'>{group.text}</span>
                  <span className='writers'>
                    <span aria-hidden className='pawns'>
                      {group.playerIds.map((playerId) => (
                        <Pawn key={playerId} seat={seatOf(playerId)} />
                      ))}
                    </span>
                    <span className='names'>
                      {nicknamesOf(view.players, group.playerIds)}
                    </span>
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
                    size='small'
                  >
                    <CheckIcon />
                    {translate('slate.correct.judge')}
                  </ToggleButton>
                )}
              </li>
            ))}
            {blankPlayerIds.length > 0 && (
              <li className='group blank'>
                <span className='writers'>
                  <span aria-hidden className='pawns'>
                    {blankPlayerIds.map((playerId) => (
                      <Pawn key={playerId} seat={seatOf(playerId)} />
                    ))}
                  </span>
                  <span className='names'>
                    {translate('slate.correct.blanks', {
                      names: nicknamesOf(view.players, blankPlayerIds)
                    })}
                  </span>
                </span>
              </li>
            )}
          </ul>
        )}
      </section>

      <Standings players={view.players} youId={null} />
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
