import { describe, expect, it } from 'vitest'

import { isEligiblePrompt } from './prompt-eligibility'

describe('isEligiblePrompt', () => {
  it('[lefake] refuses a prompt that names candidates the room cannot see', () => {
    expect(
      isEligiblePrompt({
        answer: 'James Bond',
        prompt:
          'Which of these characters was considered, but ultimately not included, for Super Smash Bros. Melee?'
      })
    ).toBe(false)

    expect(
      isEligiblePrompt({
        answer: 'Époisses',
        prompt:
          'Lequel de ces fromages français est vendu dans une boîte en bois ?'
      })
    ).toBe(false)
  })

  it('[lefake] refuses an answer that is nothing but a number', () => {
    expect(
      isEligiblePrompt({
        answer: '1918',
        prompt: 'In what year did the First World War end?'
      })
    ).toBe(false)
  })

  it('[lefake] keeps a number that is part of an answer', () => {
    expect(
      isEligiblePrompt({
        answer: '20 000 lieues sous les mers',
        prompt: 'Quel roman de Jules Verne suit le capitaine Nemo ?'
      })
    ).toBe(true)
  })

  it('[lefake] keeps an ordinary question with a surprising answer', () => {
    expect(
      isEligiblePrompt({
        answer: 'A Tight Rope',
        prompt: 'What does a funambulist walk on?'
      })
    ).toBe(true)

    expect(
      isEligiblePrompt({
        answer: 'Nestor',
        prompt: 'Quel est le prénom du valet de chambre du Capitaine Haddock ?'
      })
    ).toBe(true)
  })
})
