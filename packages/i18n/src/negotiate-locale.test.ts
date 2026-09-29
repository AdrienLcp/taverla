import { describe, expect, it } from 'vitest'

import { negotiateLocale } from './negotiate-locale'

const TWO_LANGUAGES = { fallback: 'en', supported: ['en', 'fr'] } as const

describe('negotiateLocale', () => {
  it('[locale] drops the region a dictionary does not have', () => {
    expect(negotiateLocale(['fr-CA'], TWO_LANGUAGES)).toBe('fr')
  })

  it('[locale] takes the first supported tag, not the first tag', () => {
    expect(negotiateLocale(['de-DE', 'fr-FR', 'en-GB'], TWO_LANGUAGES)).toBe(
      'fr'
    )
  })

  it('[locale] falls back when nothing asked for is supported', () => {
    expect(negotiateLocale(['de', 'it'], TWO_LANGUAGES)).toBe('en')
  })

  it('[locale] falls back for an empty preference list', () => {
    expect(negotiateLocale([], TWO_LANGUAGES)).toBe('en')
  })

  it('[locale] matches whatever case the caller reports', () => {
    expect(negotiateLocale(['FR-fr'], TWO_LANGUAGES)).toBe('fr')
  })

  it('[locale] prefers a supported region over its bare language', () => {
    const withRegions = {
      fallback: 'en',
      supported: ['en', 'pt', 'pt-BR']
    } as const

    expect(negotiateLocale(['pt-BR'], withRegions)).toBe('pt-BR')
    expect(negotiateLocale(['pt-PT'], withRegions)).toBe('pt')
  })

  it('[locale] answers a bare language with a region it does ship', () => {
    const regionsOnly = {
      fallback: 'en',
      supported: ['en', 'fr-FR', 'fr-CA']
    } as const

    expect(negotiateLocale(['fr'], regionsOnly)).toBe('fr-FR')
    expect(negotiateLocale(['fr-CA'], regionsOnly)).toBe('fr-CA')
    expect(negotiateLocale(['fr-BE'], regionsOnly)).toBe('fr-FR')
    expect(negotiateLocale(['de'], regionsOnly)).toBe('en')
  })

  it('[locale] exhausts one tag both ways before moving to the next', () => {
    const regionsOnly = {
      fallback: 'de',
      supported: ['en', 'fr-FR']
    } as const

    expect(negotiateLocale(['fr', 'en'], regionsOnly)).toBe('fr-FR')
  })
})
