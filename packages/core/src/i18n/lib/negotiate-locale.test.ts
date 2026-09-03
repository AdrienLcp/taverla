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

  // A region is only noise while every region reads the same dictionary. Ship
  // one that does not — Brazilian against European Portuguese — and the whole
  // tag has to win before it is stripped.
  it('[locale] prefers a supported region over its bare language', () => {
    const withRegions = {
      fallback: 'en',
      supported: ['en', 'pt', 'pt-BR']
    } as const

    expect(negotiateLocale(['pt-BR'], withRegions)).toBe('pt-BR')
    expect(negotiateLocale(['pt-PT'], withRegions)).toBe('pt')
  })

  // The mirror case, and the one a lookup that only walks up gets wrong: an app
  // that ships two Frenches and no plain `fr` still has to answer somebody who
  // asks for `fr`. Answering English there would be worse than answering the
  // wrong French.
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
