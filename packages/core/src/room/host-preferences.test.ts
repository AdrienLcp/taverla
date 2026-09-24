import { describe, expect, it } from 'vitest'

import { DEFAULT_BUZZER_SETTINGS } from '@taverla/protocol/game'
import { DEFAULT_MODE_SETTINGS } from '@taverla/protocol/room'

import {
  type HostPreferences,
  rememberedSetupFor,
  rememberSettings,
  rememberSlateKey,
  restoredSettings
} from './host-preferences'
import { roomSettingsFor } from './room-settings'

const onTheQuiz = roomSettingsFor({ game: 'quiz', locale: 'fr' })
const onNothing = roomSettingsFor({ game: null, locale: 'fr' })

describe('rememberSettings', () => {
  it('[host-preferences] files the room’s four game-owned fields under that game', () => {
    const remembered = rememberSettings({
      preferences: null,
      settings: {
        ...onTheQuiz,
        autoAdvanceMs: 25_000,
        mode: DEFAULT_MODE_SETTINGS.choice,
        roundCount: 20
      }
    })

    expect(remembered.games.quiz?.autoAdvanceMs).toBe(25_000)
    expect(remembered.games.quiz?.mode).toEqual(DEFAULT_MODE_SETTINGS.choice)
    expect(remembered.games.quiz?.roundCount).toBe(20)
    expect(remembered.games.quiz?.game.kind).toBe('quiz')
  })

  // The seam: what a game answers goes under that game, and what it does not is
  // the host's for every game after it.
  it('[host-preferences] keeps what no game answers outside every game', () => {
    const remembered = rememberSettings({
      preferences: null,
      settings: { ...onTheQuiz, countdownMs: 10_000 }
    })

    expect(remembered.room).toEqual({ countdownMs: 10_000 })
  })

  it('[host-preferences] leaves the other games it has learned alone', () => {
    const afterTheBuzzer = rememberSettings({
      preferences: null,
      settings: roomSettingsFor({ game: 'buzzer', locale: 'fr' })
    })

    const afterTheQuiz = rememberSettings({
      preferences: afterTheBuzzer,
      settings: onTheQuiz
    })

    expect(afterTheQuiz.games.buzzer?.game.kind).toBe('buzzer')
    expect(afterTheQuiz.games.quiz?.game.kind).toBe('quiz')
  })

  // A room that has not been told what it is playing has nothing to file: its
  // mode and round count are the shell's placeholders, not the host's answer.
  it('[host-preferences] files nothing for a room still deciding', () => {
    const remembered = rememberSettings({
      preferences: null,
      settings: { ...onNothing, countdownMs: 5_000 }
    })

    expect(remembered.games).toEqual({})
    expect(remembered.room.countdownMs).toBe(5_000)
  })
})

describe('restoredSettings', () => {
  const preferences: HostPreferences = rememberSettings({
    preferences: null,
    settings: {
      ...onTheQuiz,
      autoAdvanceMs: 8_000,
      countdownMs: 10_000,
      mode: DEFAULT_MODE_SETTINGS.choice,
      roundCount: 20
    }
  })

  it('[host-preferences] applies what no game answers to a room still deciding', () => {
    const restored = restoredSettings({ preferences, settings: onNothing })

    expect(restored.countdownMs).toBe(10_000)
    expect(restored.game).toBeNull()
    // The hold was the quiz's, and this room has not been told what it plays.
    expect(restored.autoAdvanceMs).toBe(onNothing.autoAdvanceMs)
  })

  it('[host-preferences] applies a game’s own answers to a room already on it', () => {
    const restored = restoredSettings({ preferences, settings: onTheQuiz })

    expect(restored.autoAdvanceMs).toBe(8_000)
    expect(restored.mode).toEqual(DEFAULT_MODE_SETTINGS.choice)
    expect(restored.roundCount).toBe(20)
  })

  // The host played the quiz last time and opened this room on the buzzer: the
  // countdown is theirs, and everything the quiz answered is the quiz's.
  it('[host-preferences] applies nothing from a game the room is not playing', () => {
    const onTheBuzzer = roomSettingsFor({ game: 'buzzer', locale: 'fr' })
    const restored = restoredSettings({ preferences, settings: onTheBuzzer })

    expect(restored.countdownMs).toBe(10_000)
    expect(restored.autoAdvanceMs).toBe(onTheBuzzer.autoAdvanceMs)
    expect(restored.mode).toEqual(onTheBuzzer.mode)
    expect(restored.roundCount).toBe(onTheBuzzer.roundCount)
  })

  // The door reads the question language off the host's interface, and nothing
  // remembered it — so the room keeps what it opened on rather than losing it to
  // an absent preference.
  it('[host-preferences] leaves a field nobody remembered as the door set it', () => {
    const inEnglish = roomSettingsFor({ game: 'quiz', locale: 'en' })
    const restored = restoredSettings({
      preferences: { games: {}, room: preferences.room, slateKeys: [] },
      settings: inEnglish
    })

    expect(restored.game).toEqual(inEnglish.game)
  })
})

describe('rememberedSetupFor', () => {
  it('[host-preferences] has nothing for a host who has never played', () => {
    expect(rememberedSetupFor({ game: 'quiz', preferences: null })).toBeNull()
  })

  it('[host-preferences] has nothing for a game this host has not played', () => {
    const preferences = rememberSettings({
      preferences: null,
      settings: onTheQuiz
    })

    expect(rememberedSetupFor({ game: 'lefake', preferences })).toBeNull()
  })

  // This is read back out of the browser's own storage, so a key and the arm
  // under it can disagree. Trusting it would have the host press Quiz and get a
  // bare buzzer.
  it('[host-preferences] refuses an arm that contradicts the game it is filed under', () => {
    const preferences: HostPreferences = {
      games: {
        quiz: {
          autoAdvanceMs: null,
          game: DEFAULT_BUZZER_SETTINGS,
          mode: DEFAULT_MODE_SETTINGS.buzzer,
          roundCount: null
        }
      },
      room: { countdownMs: 3_000 },
      slateKeys: []
    }

    expect(rememberedSetupFor({ game: 'quiz', preferences })).toBeNull()
  })
})

describe('rememberSlateKey', () => {
  const none = rememberSettings({ preferences: null, settings: onNothing })

  it('[host-preferences] keeps a prepared key across every settings change', () => {
    const prepared = rememberSlateKey({
      itemIndex: 2,
      key: ' Paprika ',
      preferences: none
    })

    expect(
      rememberSettings({ preferences: prepared, settings: onTheQuiz }).slateKeys
    ).toEqual([null, null, 'Paprika'])
  })

  it('[host-preferences] shortens the key when its last entry is cleared', () => {
    const prepared = rememberSlateKey({
      itemIndex: 3,
      key: 'Thym',
      preferences: rememberSlateKey({
        itemIndex: 0,
        key: 'Sel',
        preferences: none
      })
    })

    expect(
      rememberSlateKey({ itemIndex: 3, key: '', preferences: prepared })
        .slateKeys
    ).toEqual(['Sel'])
  })
})
