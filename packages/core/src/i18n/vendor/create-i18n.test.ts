import { describe, expect, it } from 'vitest'

import { createI18n } from './create-i18n'
import { defineTranslation } from './define-translation'
import { defineDictionary } from './dictionary'

const EN = defineDictionary({
  greeting: 'Hello {name}',
  round: { none: 'Nobody got it' },
  score: defineTranslation('{count:plural}', {
    plural: { count: { one: '{?} point', other: '{?} points' } }
  })
})

const FR = defineDictionary({
  greeting: 'Bonjour {name}',
  round: { none: 'Personne n’a trouvé' },
  score: defineTranslation('{count:plural}', {
    plural: { count: { one: '{?} point', other: '{?} points' } }
  })
})

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

describe('a dictionary that is not in the bundle yet', () => {
  const buildRegistry = () => {
    let fetches = 0

    const registry = createI18n({
      defaultLocale: 'en',
      dictionaries: {
        de: () => {
          fetches += 1

          return import('./dictionary-de.fixture')
        },
        en: EN,
        fr: FR
      }
    })

    return { fetched: () => fetches, registry }
  }

  it('[i18n] reads the default locale until the dictionary lands', () => {
    const { registry } = buildRegistry()

    expect(registry.translator('de')('round.none')).toBe('Nobody got it')
    expect(registry.translator('de')).toBe(registry.translator('en'))
  })

  it('[i18n] swaps to the locale’s own once it has been loaded', async () => {
    const { registry } = buildRegistry()

    await registry.load('de')

    expect(registry.translator('de')('round.none')).toBe(
      'Niemand hat es gefunden'
    )
    expect(registry.translator('de')).not.toBe(registry.translator('en'))
  })

  // The identity is the signal a consumer re-renders on: same translator, same
  // language; new translator, new language.
  it('[i18n] hands out a new translator on the far side of a load', async () => {
    const { registry } = buildRegistry()
    const before = registry.translator('de')

    await registry.load('de')

    expect(registry.translator('de')).not.toBe(before)
    expect(registry.translator('de')).toBe(registry.translator('de'))
  })

  it('[i18n] formats a lazily loaded locale in its own language', async () => {
    const { registry } = buildRegistry()

    await registry.load('de')

    expect(registry.translator('de')('score', { count: 1 })).toBe('1 Punkt')
    expect(registry.translator('de')('score', { count: 2 })).toBe('2 Punkte')
  })

  it('[i18n] fetches once however many callers ask at the same time', async () => {
    const { fetched, registry } = buildRegistry()

    await Promise.all([
      registry.load('de'),
      registry.load('de'),
      registry.load('de')
    ])

    expect(fetched()).toBe(1)

    await registry.load('de')

    expect(fetched()).toBe(1)
  })

  it('[i18n] resolves at once for a locale it already holds', async () => {
    const { fetched, registry } = buildRegistry()

    expect(await registry.load('fr')).toBe(registry.translator('fr'))
    expect(await registry.load('en')).toBe(registry.translator('en'))
    expect(fetched()).toBe(0)
  })

  it('[i18n] negotiates a locale whose dictionary has not arrived', () => {
    const { registry } = buildRegistry()

    expect(registry.locales).toStrictEqual(['de', 'en', 'fr'])
    expect(registry.negotiate(['de-AT'])).toBe('de')
  })
})

describe('a dictionary that fails to load', () => {
  const buildRegistry = () => {
    let attempts = 0

    const registry = createI18n({
      defaultLocale: 'en',
      dictionaries: {
        en: EN,
        it: async () => {
          attempts += 1

          if (attempts === 1) {
            throw new Error('offline')
          }

          return {
            default: defineDictionary({
              greeting: 'Ciao {name}',
              round: { none: 'Nessuno ha indovinato' },
              score: defineTranslation('{count:plural}', {
                plural: { count: { one: '{?} punto', other: '{?} punti' } }
              })
            })
          }
        }
      }
    })

    return { attempted: () => attempts, registry }
  }

  it('[i18n] leaves the reader on the default locale', async () => {
    const { registry } = buildRegistry()

    await expect(registry.load('it')).rejects.toThrow('offline')
    expect(registry.translator('it')('round.none')).toBe('Nobody got it')
  })

  it('[i18n] forgets the attempt, so that asking again retries', async () => {
    const { attempted, registry } = buildRegistry()

    await expect(registry.load('it')).rejects.toThrow('offline')
    await registry.load('it')

    expect(attempted()).toBe(2)
    expect(registry.translator('it')('round.none')).toBe(
      'Nessuno ha indovinato'
    )
  })
})

// Five languages is the shape this library exists for: one dictionary in the
// bundle and four behind loaders. Regional variants are not wanted yet, so what
// is asserted is that adding one stays a one-line decision — negotiation walks
// a tag both up and down.
describe('five languages', () => {
  // What is under test is the registry's shape, not four vocabularies, so the
  // four loaders fetch the same module. Which words come back is the business
  // of the tests above.
  const laterOn = () => import('./dictionary-de.fixture')

  const registry = createI18n({
    defaultLocale: 'en',
    dictionaries: {
      de: laterOn,
      en: EN,
      es: laterOn,
      'fr-CA': laterOn,
      it: laterOn
    }
  })

  it('[i18n] ships one dictionary and negotiates all five', () => {
    expect(registry.locales).toStrictEqual(['de', 'en', 'es', 'fr-CA', 'it'])
    expect(registry.negotiate(['it-IT'])).toBe('it')
    expect(registry.negotiate(['fr'])).toBe('fr-CA')
    expect(registry.negotiate(['fr-CA'])).toBe('fr-CA')
    expect(registry.negotiate(['pt'])).toBe('en')
  })
})
