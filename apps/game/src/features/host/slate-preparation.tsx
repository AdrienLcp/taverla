import type React from 'react'

import type { SlateSettings } from '@taverla/protocol/game'
import type { RoomSettings } from '@taverla/protocol/room'
import { MAX_SLATE_ITEMS, MIN_SLATE_ITEMS } from '@taverla/protocol/slate'

import { Disclosure } from '@/presentation/components/disclosure'
import { NumberField } from '@/presentation/components/number-field'
import { useTranslate } from '@/presentation/i18n/i18n-provider'

import { SlateKeyEditor } from './slate-key-editor'
import { SlateLabelsEditor } from './slate-labels-editor'

type SlatePreparationProps = {
  game: SlateSettings
  isLive: boolean
  onChange: (settings: RoomSettings) => void
  /** Files one key on this tab; the room hears of it only when the sheets open. */
  onPrepareKey: (itemIndex: number, key: string) => void
  /** The answer key as this host prepared it, by item index. */
  preparedKeys: readonly (string | null)[]
  settings: RoomSettings
}

/**
 * The sheet, set up before anyone sits down. It lived in the setup fold, which
 * is collapsed at every width and summarised by a count, so a host read the
 * lobby as having nothing to prepare and opened the sheets to find the key.
 * Folded here too, under a summary of what is ready, because open it pushed
 * the launch below a 1280×800 screen.
 */
export const SlatePreparation: React.FC<SlatePreparationProps> = ({
  game,
  isLive,
  onChange,
  onPrepareKey,
  preparedKeys,
  settings
}) => {
  const translate = useTranslate()
  const named = game.labels
    .slice(0, game.itemCount)
    .filter((label) => label !== null).length
  const noted = preparedKeys
    .slice(0, game.itemCount)
    .filter((key) => key !== null).length
  const summary = [
    translate('slate.items.summary', { count: game.itemCount }),
    named === 0
      ? translate('slate.labels.none')
      : translate('slate.labels.some', { count: named }),
    translate('slate.prepare.keys', { count: noted })
  ].join(' · ')

  return (
    <Disclosure
      className='slate-preparation'
      label={translate('slate.prepare.title')}
      summary={summary}
    >
      <NumberField
        className='item-count'
        isDisabled={!isLive}
        label={translate('slate.items.label')}
        maxValue={MAX_SLATE_ITEMS}
        minValue={MIN_SLATE_ITEMS}
        onChange={(itemCount) => {
          if (Number.isInteger(itemCount)) {
            onChange({ ...settings, game: { ...game, itemCount } })
          }
        }}
        value={game.itemCount}
      />
      <SlateLabelsEditor
        isDisabled={!isLive}
        itemCount={game.itemCount}
        labels={game.labels}
        onChange={(labels) => {
          onChange({ ...settings, game: { ...game, labels } })
        }}
      />
      <SlateKeyEditor
        hint={translate('slate.key.hint')}
        isDisabled={false}
        itemCount={game.itemCount}
        keys={preparedKeys}
        labels={game.labels}
        onSetKey={onPrepareKey}
      />
    </Disclosure>
  )
}
