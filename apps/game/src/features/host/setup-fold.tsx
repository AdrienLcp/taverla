import type React from 'react'

import type { HostRoomView, RoomSettings } from '@taverla/protocol/room'
import type { TrackSource } from '@taverla/protocol/track'

import type { HostPreferences } from '@taverla/core/room/host-preferences'
import { isRoundInPlay } from '@taverla/core/room/room-phase'
import {
  type SettingsSummaryPart,
  settingsSummary
} from '@taverla/core/room/settings-summary'

import { Disclosure } from '@/presentation/components/disclosure'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import {
  answerModeLabelKey,
  gameNameKey
} from '@/presentation/i18n/translation'

import { GamePicker } from './game-picker'
import { HostSeat } from './host-seat'
import { PlaylistPicker, sourceKindKey } from './playlist-picker'
import { SettingsPanel } from './settings-panel'

type SetupFoldProps = {
  /** What the picker is showing, which the launch has not committed yet. */
  draftSource: TrackSource | null
  /** The socket is open. Everything inside sends a frame, so none of it works without it. */
  isLive: boolean
  /** Must be stable — the picker reports upward from an effect. */
  onDraftSource: (source: TrackSource | null) => void
  onSettingsChange: (settings: RoomSettings) => void
  onTakeSeat: (nickname: string) => void
  /** What this host last left each game set to, so picking one restores it. */
  preferences: HostPreferences | null
  /** The nickname the host is playing under, or `null` while they only run the room. */
  seatNickname: string | null
  view: HostRoomView
}

/**
 * How the evening is played, beside the volume rather than inside the lobby:
 * the countdown, the round count, the answer window and the playlist all land
 * on the round after the one on screen, and a host who has to end the game to
 * reach them is a host who does not change them.
 *
 * The seat is the one thing still kept to the lobby, because taking it reopens
 * the socket and a re-seat mid-round would drop the answer being typed.
 */
export const SetupFold: React.FC<SetupFoldProps> = ({
  draftSource,
  isLive,
  onDraftSource,
  onSettingsChange,
  onTakeSeat,
  preferences,
  seatNickname,
  view
}) => {
  const translate = useTranslate()
  const game = view.settings.game
  const isInLobby = view.phase === 'lobby'
  const roundInPlay = isRoundInPlay(view.phase)

  const summaryPart = (part: SettingsSummaryPart): string => {
    switch (part.kind) {
      case 'game':
        return translate(gameNameKey(part.game))
      case 'source':
        return translate(sourceKindKey(part.source))
      case 'answerMode':
        return translate(answerModeLabelKey(part.mode))
      case 'roundCount':
        return part.count === null
          ? translate('host.roundCount.openSummary')
          : translate('host.roundCount.summary', { count: part.count })
    }
  }

  return (
    <Disclosure
      className='setup-fold'
      label={translate('host.setup.label')}
      summary={settingsSummary({ draftSource, settings: view.settings })
        .map(summaryPart)
        .join(' · ')}
    >
      {roundInPlay && (
        <p className='held'>{translate('host.setup.roundInPlay')}</p>
      )}
      {/*
        Above everything it decides, including whether the picker applies — but
        only once the game is no longer the decision the room is waiting on. In
        the lobby it is the stage's, beside the QR code.

        A round on screen is one arm of `round.content`, so a game switched
        under it would leave the screens rendering the other; the server refuses
        that, and the control says so first.
      */}
      {!isInLobby && (
        <GamePicker
          isDisabled={!isLive || roundInPlay}
          onChange={onSettingsChange}
          preferences={preferences}
          settings={view.settings}
        />
      )}
      {game?.kind === 'blindtest' && (
        <PlaylistPicker onDraftChange={onDraftSource} settings={game} />
      )}
      <SettingsPanel
        isLive={isLive}
        isRoundInPlay={roundInPlay}
        onChange={onSettingsChange}
        settings={view.settings}
      />
      {/*
        Not offered in buzzer mode: that round needs someone reading the answer
        to judge it, and a judge who is also answering is not one.
      */}
      {isInLobby && view.settings.mode.kind !== 'buzzer' && (
        <HostSeat onTakeSeat={onTakeSeat} takenAs={seatNickname} />
      )}
    </Disclosure>
  )
}
