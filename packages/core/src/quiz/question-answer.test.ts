import { describe, expect, it } from 'vitest'

import type { Question } from '@taverla/protocol/question'

import { gradeQuizGuess } from './question-answer'

type Answerable = Pick<Question, 'accepted' | 'answer' | 'decoys'>

const QUESTION: Answerable = {
  accepted: [],
  answer: 'Kate Winslet',
  decoys: ['Cate Blanchett', 'Nicole Kidman', 'Naomi Watts']
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
    const question: Answerable = {
      accepted: [],
      answer: 'Léonard de Vinci',
      decoys: ['Michel-Ange', 'Raphaël', 'Donatello']
    }

    expect(isRight('leonard de vinci', question)).toBe(true)
  })

  /**
   * The one place this game parts company with the blind test's matcher, and
   * the reason it has to: the blind test looks for each half *inside* the line
   * because its single field holds two claims. A question holds one, and
   * searching within it pays a player for covering the field.
   */
  it('[quiz] refuses a line that hedges its way onto the answer', () => {
    const question: Answerable = {
      accepted: [],
      answer: 'Quatre',
      decoys: ['Deux', 'Trois', 'Cinq']
    }

    expect(isRight('quatre', question)).toBe(true)
    expect(isRight('trois ou quatre', question)).toBe(false)
    expect(isRight('deux trois quatre cinq', question)).toBe(false)
  })

  it('[quiz] takes any spelling the bank named as well as the answer', () => {
    const question: Answerable = {
      accepted: ['Cervin', 'Matterhorn'],
      answer: 'Le Cervin',
      decoys: ['Le Mont Blanc', 'La Jungfrau', 'Le Grand Combin']
    }

    expect(isRight('le cervin', question)).toBe(true)
    expect(isRight('cervin', question)).toBe(true)
    expect(isRight('matterhorn', question)).toBe(true)
    expect(isRight('mont blanc', question)).toBe(false)
  })

  /**
   * The bank is full of rows whose four candidates differ by a digit, and the
   * tolerance was wide enough to cross them: a room asked how long an otarie
   * holds its breath was offered five minutes and seven, and typing either
   * scored. The question's own decoys are what closes it — a slipped finger is
   * still forgiven, up to where the bank says a different answer starts.
   */
  it('[quiz] never forgives its way onto an answer the question calls wrong', () => {
    const question: Answerable = {
      accepted: [],
      answer: '5 minutes',
      decoys: ['7 minutes', '30 secondes', '2 heures']
    }

    expect(isRight('5 minutes', question)).toBe(true)
    expect(isRight('7 minutes', question)).toBe(false)
    expect(isRight('30 secondes', question)).toBe(false)
  })

  /**
   * The same rule is what makes a spelling question answerable at all: two
   * hundred rows ask which of `Accueil` and `Acueil` is the word, and a matcher
   * forgiving one correction answers it for the room.
   */
  it('[quiz] asks for the spelling when the spelling is the question', () => {
    const question: Answerable = {
      accepted: [],
      answer: 'Accueil',
      decoys: ['Acueil', 'Accueille', 'Aceuil']
    }

    expect(isRight('accueil', question)).toBe(true)
    expect(isRight('acueil', question)).toBe(false)
  })

  it('[quiz] refuses an empty line rather than reading it as a match', () => {
    expect(isRight('')).toBe(false)
    expect(isRight('   ')).toBe(false)
  })
})
