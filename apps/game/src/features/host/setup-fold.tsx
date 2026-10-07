import type React from 'react'

import type { HostRoomView, RoomSettings } from '@taverla/protocol/room'
import type { TrackSource } from '@taverla/protocol/track'

import type { HostPreferences } from '@taverla/core/room/host-preferences'
import { isRoundInPlay } from '@taverla/core/room/room-phase'

import { useVolume } from '@/presentation/audio/volume-provider'
import { Disclosure } from '@/presentation/components/disclosure'
import { Slider } from '@/presentation/components/slider'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import { useRoomActions } from '@/presentation/room-actions/room-actions-provider'

import { GamePicker } from './game-picker'
import { HostSeat } from './host-seat'
import { PlaylistPicker } from './playlist-picker'
import { SettingsPanel } from './settings-panel'
import { useSettingsSummary } from './use-settings-summary'

type SetupFoldProps = {
  /** What the picker is showing, which the launch has not committed yet. */
  draftSource: TrackSource | null
  /** The socket is open. Everything inside sends a frame, so none of it works without it. */
  isLive: boolean
  /** Must be stable — the picker reports upward from an effect. */
  onDraftSource: (source: TrackSource | null) => void
  /** Files one key of the slate's answer key on this tab. */
  onRememberSlateKey: (itemIndex: number, key: string) => void
  onSettingsChange: (settings: RoomSettings) => void
  onTakeSeat: (nickname: string) => void
  /** What this host last left each game set to, so picking one restores it. */
  preferences: HostPreferences | null
  /** The slate's answer key as typed on this tab, never sent before the sheet opens. */
  preparedSlateKeys: readonly (string | null)[]
  view: HostRoomView
}

/**
 * How the evening is played, rather than inside the lobby: the countdown, the
 * round count, the answer window and the playlist all land on the round after
 * the one on screen, and a host who has to end the game to reach them is a
 * host who does not change them. That is the line the one strip left outside
 * holds — auto-advance acts on the reveal being watched, so it is reached
 * without opening anything.
 *
 * The game and the seat are here for every phase but the lobby, where each of
 * them is the decision the room is waiting on and the stage draws it instead. A
 * round in play holds the seat back on top of that, because taking it reopens
 * the socket and a re-seat mid-clip would drop the answer being typed.
 */
export const SetupFold: React.FC<SetupFoldProps> = ({
  draftSource,
  isLive,
  onDraftSource,
  onRememberSlateKey,
  onSettingsChange,
  onTakeSeat,
  preferences,
  preparedSlateKeys,
  view
}) => {
  const translate = useTranslate()
  const game = view.settings.game
  const isInLobby = view.phase === 'lobby'
  const roundInPlay = isRoundInPlay(view.phase)
  const { playsSound } = useRoomActions()
  const { setVolume, volume } = useVolume()
  const summary = useSettingsSummary({ draftSource, settings: view.settings })

  return (
    <Disclosure
      className='setup-fold'
      label={translate('host.setup.label')}
      summary={summary}
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
        draftSource={draftSource}
        isLive={isLive}
        isRoundInPlay={roundInPlay}
        isSheetOnStage={isInLobby}
        onChange={onSettingsChange}
        onPrepareSlateKey={onRememberSlateKey}
        preparedSlateKeys={preparedSlateKeys}
        settings={view.settings}
      />
      {/*
        The picker's own move, one section down and for the same reason. In the
        lobby the seat is what the launch is refusing for, so it belongs on the
        stage beside the roster that says the room is empty; here it is one
        setting among the rest.

        It has to stay reachable at every later phase, because a seat can go
        without this screen deciding it — a takeover hands the room back with
        the roster's ghost still holding the name — and a control the host can
        only reach by ending the game is what turns that into a lost evening.
        The round in play is the one exception, because taking the seat reopens
        the socket underneath a clip that is running.
      */}
      {/*
        This screen's, not the room's: the same value as the menu's slider,
        offered again where a host setting up the evening is already looking.
        Absent once a wall is the room's speaker, because this screen is then
        silent.
      */}
      {playsSound && (
        <Slider
          formatOptions={{ style: 'percent' }}
          label={translate('host.setup.volume')}
          maxValue={1}
          minValue={0}
          onChange={setVolume}
          step={0.05}
          value={volume}
        />
      )}
      {!isInLobby && !roundInPlay && (
        <HostSeat onTakeSeat={onTakeSeat} view={view} />
      )}
    </Disclosure>
  )
}
