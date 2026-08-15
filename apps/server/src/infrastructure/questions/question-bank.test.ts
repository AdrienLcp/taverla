import { describe, expect, it } from 'vitest'

import {
  DEFAULT_QUIZ_SETTINGS,
  type QuizSettings
} from '@taverla/protocol/game'
import {
  type QuestionCategory,
  questionCategories,
  questionLanguages
} from '@taverla/protocol/question'

import { hasAdultContent } from '@taverla/core/quiz/adult-content'
import { gradeQuizGuess } from '@taverla/core/quiz/question-answer'

import { drawQuestion } from './question-bank'
import bank from './question-bank.json' with { type: 'json' }

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

  /**
   * This replaced the assertion that English drew nothing, which was the guard
   * on a decision rather than on a rule: while every row was French, shipping
   * the control would have shipped an option that always failed. Both banks
   * exist now, so the rule that matters is that neither leaks into the other —
   * a room playing in French must never be handed an English question, and four
   * hundred draws over a bank where more than two rows in three are English
   * would surface one immediately if the filter were absent.
   */
  /**
   * The mix, and the whole reason the category is drawn before the question.
   * Over twelve hundred draws with nothing ticked each of the six subjects is
   * expected about two hundred times; drawing uniformly over questions instead
   * gave French history — 52 rows of 1 708 — about thirty-five, which is what
   * this floor catches. It is far enough below the expected count that chance
   * cannot reach it and far enough above the old behaviour to fail on it.
   */
  it('[bank] mixes the subjects evenly when the host has ticked none', () => {
    const counts = new Map<QuestionCategory, number>()

    for (const question of drawMany(DEFAULT_QUIZ_SETTINGS, 1_200)) {
      counts.set(question.category, (counts.get(question.category) ?? 0) + 1)
    }

    expect(counts.size).toBe(questionCategories.length)
    expect(Math.min(...counts.values())).toBeGreaterThan(100)
  })

  /**
   * The audit that earned its place in the suite. A row's decoys are the bank
   * saying what it considers a different answer, so a decoy the matcher accepts
   * is a question typed mode cannot be won at — and it found far more than the
   * three spellings a playtest did: ninety-odd rows where the candidates differ
   * by one digit, two hundred spelling quizzes, and twenty whose decoy is the
   * answer once accents or punctuation are folded away.
   *
   * The first two are the matcher's fault and were fixed there. The twenty are
   * the data's, and are gone from the bank rather than excused here: a test
   * with a list of exceptions beside it stops being a rule.
   */
  it('[bank] holds no question whose own decoy would be graded right', () => {
    const winnable = bank.questions.filter((question) =>
      question.decoys.some(
        (decoy) => gradeQuizGuess({ guess: decoy, question }).isCorrect
      )
    )

    expect(winnable.map((question) => question.id)).toEqual([])
  })

  /**
   * `hasAdultContent` is what the console reads to decide whether the switch is
   * worth showing at all, and it is a claim held in core rather than a fact read
   * off the bank — the bank is the server's. This is what keeps the two honest,
   * and what goes red the day a rated source lands in a language that had none.
   */
  it('[bank] agrees with what the console is told about adult content', () => {
    for (const language of questionLanguages) {
      expect(hasAdultContent(language)).toBe(
        bank.questions.some(
          (question) => question.language === language && question.isAdult
        )
      )
    }
  })

  /**
   * Fifty where its neighbours draw four hundred, and putting it back is what to
   * avoid. Their count carries a probabilistic argument — one question in twenty
   * is adult, so four hundred is what makes a missing filter certain to surface.
   * A language either groups or it does not, and fifty draws all landing in one
   * of two languages say so already. At four hundred over both languages this
   * was the slowest test here, 2.4s against vitest's 5s timeout, and it lost
   * that race whenever something else was running on the machine.
   */
  it('[bank] stays inside the language the room is playing', () => {
    for (const language of questionLanguages) {
      const drawn = drawMany({ ...DEFAULT_QUIZ_SETTINGS, language }, 50)

      expect(drawn.length).toBe(50)
      expect(drawn.every((question) => question.language === language)).toBe(
        true
      )
    }
  })
})
