import { describe, expect, it } from 'vitest'

import { createI18n } from './create-i18n'
import { defineTranslation } from './define-translation'
import { type DictionaryFor, defineDictionary } from './dictionary'

const EN = defineDictionary({
  greeting: 'Hello {name}',
  round: { none: 'Nobody got it' },
  score: defineTranslation('{count:plural}', {
    plural: { count: { one: '{?} point', other: '{?} points' } }
  })
})

const FR: DictionaryFor<typeof EN> = {
  greeting: 'Bonjour {name}',
  round: { none: 'Personne n’a trouvé' },
  score: defineTranslation('{count:plural}', {
    plural: { count: { one: '{?} point', other: '{?} points' } }
  })
}

const i18n = createI18n({
  defaultLocale: 'en',
  dictionaries: { en: EN, fr: FR }
})

describe('translator', () => {
  it('[i18n] reads the dictionary the locale is registered with', () => {
    expect(i18n.translator('fr')('round.none')).toBe('Personne n’a trouvé')
    expect(i18n.translator('en')('round.none')).toBe('Nobody got it')
  })

  it('[i18n] formats for the same locale it translates in', () => {
    expect(i18n.translator('fr')('score', { count: 0 })).toBe('0 point')
    expect(i18n.translator('en')('score', { count: 0 })).toBe('0 points')
  })

  // A consumer memoising on the translator has to see a new identity when the
  // locale changes and the same one when it does not. Rebuilding on every call
  // — which is what a provider calling `createTranslator` inline does — makes
  // every downstream `useMemo` recompute on every render.
  it('[i18n] hands out one translator per locale, not one per call', () => {
    expect(i18n.translator('fr')).toBe(i18n.translator('fr'))
    expect(i18n.translator('fr')).not.toBe(i18n.translator('en'))
  })
})

describe('negotiate', () => {
  it('[i18n] answers with a registered locale, region dropped', () => {
    expect(i18n.negotiate(['fr-CA'])).toBe('fr')
    expect(i18n.negotiate(['de-DE', 'fr-FR', 'en'])).toBe('fr')
  })

  it('[i18n] falls back to the default locale, which needs no repeating', () => {
    expect(i18n.negotiate(['de', 'it'])).toBe('en')
    expect(i18n.negotiate([])).toBe('en')
  })
})

describe('compare', () => {
  // Sorting by code point puts É after Z, which no French reader expects.
  it('[i18n] orders names the way the locale does, not the way code points do', () => {
    const names = ['Zoé', 'Émile', 'Adrien']

    expect([...names].sort(i18n.compare('fr'))).toStrictEqual([
      'Adrien',
      'Émile',
      'Zoé'
    ])
    expect([...names].sort()).toStrictEqual(['Adrien', 'Zoé', 'Émile'])
  })

  it('[i18n] takes collator options, so a numbered list can sort as numbers', () => {
    const rounds = ['Round 10', 'Round 2']

    expect(
      [...rounds].sort(i18n.compare('en', { numeric: true }))
    ).toStrictEqual(['Round 2', 'Round 10'])
    expect([...rounds].sort(i18n.compare('en'))).toStrictEqual([
      'Round 10',
      'Round 2'
    ])
  })
})

describe('the registry', () => {
  it('[i18n] names its locales and its default', () => {
    expect(i18n.locales).toStrictEqual(['en', 'fr'])
    expect(i18n.defaultLocale).toBe('en')
  })
})
