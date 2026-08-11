import { describe, expect, it } from 'vitest'

import { shelvedGames } from '@taverla/protocol/game'

import { roomSettingsFor } from './room-settings'
import { settingsSummary } from './settings-summary'

describe('settingsSummary', () => {
  const blindtest = roomSettingsFor('blindtest')

  it('[settings-summary] reads left to right, from the game down to how long the evening runs', () => {
    expect(settingsSummary({ draftSource: null, settings: blindtest })).toEqual(
      [
        { game: 'blindtest', kind: 'game' },
        { kind: 'source', source: 'chart' },
        { kind: 'answerMode', mode: 'typed' },
        { count: 10, kind: 'roundCount' }
      ]
    )
  })

  // The picker commits on the launch, so the committed source is the *previous*
  // round's for as long as the fold is open.
  it('[settings-summary] shows the source being drafted over the one the room is running', () => {
    expect(
      settingsSummary({
        draftSource: { kind: 'search', query: 'yacht rock' },
        settings: blindtest
      })
    ).toContainEqual({ kind: 'source', source: 'search' })
  })

  it('[settings-summary] says nothing about a source in a game that serves none', () => {
    const parts = settingsSummary({
      draftSource: { kind: 'search', query: 'yacht rock' },
      settings: roomSettingsFor('buzzer')
    })

    expect(parts.some((part) => part.kind === 'source')).toBe(false)
  })

  it('[settings-summary] says nothing about an answer mode the host was never offered', () => {
    const parts = settingsSummary({
      draftSource: null,
      settings: roomSettingsFor('buzzer')
    })

    expect(parts.some((part) => part.kind === 'answerMode')).toBe(false)
  })

  // The two sets coincide today, so nothing here can exercise the other side of
  // the `isShelvedGame` filter. Dropping it is a compile error rather than a
  // red test — `SettingsSummaryPart` carries a `ShelvedGame`, and `game.kind`
  // is the whole vocabulary.
  it('[settings-summary] names every game the shelf can be opened on', () => {
    for (const game of shelvedGames) {
      expect(
        settingsSummary({ draftSource: null, settings: roomSettingsFor(game) })
      ).toContainEqual({ game, kind: 'game' })
    }
  })

  it('[settings-summary] carries a game with no last round as a count of none', () => {
    expect(
      settingsSummary({
        draftSource: null,
        settings: roomSettingsFor('buzzer')
      })
    ).toContainEqual({ count: null, kind: 'roundCount' })
  })
})
