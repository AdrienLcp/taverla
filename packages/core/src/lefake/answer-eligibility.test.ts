import { describe, expect, it } from 'vitest'

import { canBeLiedAbout } from './answer-eligibility'

describe('canBeLiedAbout', () => {
  it('[lefake] refuses an answer that is nothing but a number', () => {
    expect(canBeLiedAbout({ answer: '1918' })).toBe(false)
    expect(canBeLiedAbout({ answer: '30 %' })).toBe(false)
    expect(canBeLiedAbout({ answer: '1 000 000' })).toBe(false)
  })

  it('[lefake] keeps a number that is part of an answer', () => {
    expect(canBeLiedAbout({ answer: '20 000 lieues sous les mers' })).toBe(true)
    expect(canBeLiedAbout({ answer: '15 kg' })).toBe(true)
  })

  it('[lefake] keeps an ordinary answer', () => {
    expect(canBeLiedAbout({ answer: 'A Tight Rope' })).toBe(true)
    expect(canBeLiedAbout({ answer: 'Nestor' })).toBe(true)
  })
})
