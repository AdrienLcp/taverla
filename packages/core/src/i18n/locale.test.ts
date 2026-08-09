import { describe, expect, it } from 'vitest'

import { isLocale, pickLocale } from './locale'

describe('pickLocale', () => {
  it('[locale] drops the region a dictionary does not have', () => {
    expect(pickLocale(['fr-CA'])).toBe('fr')
  })

  it('[locale] takes the first supported tag, not the first tag', () => {
    expect(pickLocale(['de-DE', 'fr-FR', 'en-GB'])).toBe('fr')
  })

  it('[locale] falls back to English when nothing is supported', () => {
    expect(pickLocale(['de', 'it'])).toBe('en')
  })

  it('[locale] falls back to English for an empty preference list', () => {
    expect(pickLocale([])).toBe('en')
  })

  it('[locale] matches whatever case the browser reports', () => {
    expect(pickLocale(['FR-fr'])).toBe('fr')
  })
})

describe('isLocale', () => {
  it('[locale] rejects a region tag, which is not a dictionary key', () => {
    expect(isLocale('fr-FR')).toBe(false)
    expect(isLocale('fr')).toBe(true)
  })
})
