import { describe, expect, it } from 'vitest'

import type { Question } from '@taverla/protocol/question'

import { gradeQuizGuess } from './question-answer'

type Answerable = Pick<Question, 'accepted' | 'answer'>

const QUESTION: Answerable = {
  accepted: [],
  answer: 'Kate Winslet'
}

const isRight = (guess: string, question: Answerable = QUESTION): boolean =>
  gradeQuizGuess({ guess, question }).isCorrect

describe('gradeQuizGuess', () => {
  it('[quiz] takes the answer however a room spells it', () => {
    expect(isRight('Kate Winslet')).toBe(true)
    expect(isRight('kate winslet')).toBe(true)
    expect(isRight('katewinslet')).toBe(true)
    expect(isRight('  Kate  Winslet ')).toBe(true)
  })

  it('[quiz] forgives a slipped finger in proportion to the answer', () => {
    expect(isRight('kate winslett')).toBe(true)
    expect(isRight('cate winslet')).toBe(true)
  })

  it('[quiz] folds the accents a phone keyboard makes hard', () => {
    const question = { accepted: [], answer: 'Léonard de Vinci' }

    expect(isRight('leonard de vinci', question)).toBe(true)
  })

  /**
   * The one place this game parts company with the blind test's matcher, and
   * the reason it has to: the blind test looks for each half *inside* the line
   * because its single field holds two claims. A question holds one, and
   * searching within it pays a player for covering the field.
   */
  it('[quiz] refuses a line that hedges its way onto the answer', () => {
    const question = { accepted: [], answer: 'Quatre' }

    expect(isRight('quatre', question)).toBe(true)
    expect(isRight('trois ou quatre', question)).toBe(false)
    expect(isRight('deux trois quatre cinq', question)).toBe(false)
  })

  it('[quiz] takes any spelling the bank named as well as the answer', () => {
    const question = {
      accepted: ['Cervin', 'Matterhorn'],
      answer: 'Le Cervin'
    }

    expect(isRight('le cervin', question)).toBe(true)
    expect(isRight('cervin', question)).toBe(true)
    expect(isRight('matterhorn', question)).toBe(true)
    expect(isRight('mont blanc', question)).toBe(false)
  })

  it('[quiz] refuses an empty line rather than reading it as a match', () => {
    expect(isRight('')).toBe(false)
    expect(isRight('   ')).toBe(false)
  })
})
