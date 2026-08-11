import { describe, expect, it } from 'vitest'

import {
  DEFAULT_QUIZ_SETTINGS,
  type QuizSettings
} from '@taverla/protocol/game'

import { drawQuestion } from './question-bank'

const NOTHING_PLAYED: ReadonlySet<string> = new Set()

const drawMany = (settings: QuizSettings, times = 400) =>
  Array.from({ length: times }, () =>
    drawQuestion({ playedIds: NOTHING_PLAYED, settings })
  ).filter((question) => question !== null)

describe('drawQuestion', () => {
  /**
   * The rating is off unless a host turns it on, and they are the only one who
   * knows who is in the room — the code is read aloud and anyone present can
   * scan the QR. Four hundred draws over a bank where one question in twenty is
   * adult would surface one within the first few if the filter were absent.
   */
  it('[bank] never draws an adult question unless the host asked for it', () => {
    expect(DEFAULT_QUIZ_SETTINGS.allowsAdultContent).toBe(false)

    const drawn = drawMany(DEFAULT_QUIZ_SETTINGS)

    expect(drawn.length).toBe(400)
    expect(drawn.some((question) => question.isAdult)).toBe(false)
  })

  it('[bank] draws them once the host has', () => {
    const drawn = drawMany({
      ...DEFAULT_QUIZ_SETTINGS,
      allowsAdultContent: true
    })

    expect(drawn.some((question) => question.isAdult)).toBe(true)
  })

  it('[bank] stays inside the categories the host ticked', () => {
    const drawn = drawMany({
      ...DEFAULT_QUIZ_SETTINGS,
      categories: ['history', 'sport']
    })

    expect(drawn.length).toBeGreaterThan(0)
    expect(
      drawn.every((question) =>
        ['history', 'sport'].includes(question.category)
      )
    ).toBe(true)
  })

  it('[bank] runs out rather than repeating what the room has had', () => {
    const settings: QuizSettings = {
      ...DEFAULT_QUIZ_SETTINGS,
      categories: ['history']
    }

    const played = new Set<string>()

    while (true) {
      const question = drawQuestion({ playedIds: played, settings })

      if (question === null) {
        break
      }

      expect(played.has(question.id)).toBe(false)
      played.add(question.id)
    }

    expect(played.size).toBeGreaterThan(0)
    expect(drawQuestion({ playedIds: played, settings })).toBeNull()
  })

  it('[bank] has nothing to serve in a language it does not hold', () => {
    expect(
      drawQuestion({
        playedIds: NOTHING_PLAYED,
        settings: { ...DEFAULT_QUIZ_SETTINGS, language: 'en' }
      })
    ).toBeNull()
  })
})
