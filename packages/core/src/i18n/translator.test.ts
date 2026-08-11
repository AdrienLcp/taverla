import { describe, expect, it } from 'vitest'

import { defineTranslation } from './define-translation'
import {
  createTranslator,
  defineTranslations,
  type TranslationsLike
} from './translator'

const TRANSLATIONS = defineTranslations({
  menu: { built: 'Build {build}' },
  round: {
    clip: '{seconds:number}s',
    genres: 'Playing {genres:list}',
    none: 'Nobody got it'
  },
  score: defineTranslation('{count:plural}', {
    plural: { count: { one: '{?} point', other: '{?} points' } }
  }),
  waiting: defineTranslation('{count:plural}', {
    plural: {
      count: {
        one: '{?} has answered',
        other: '{?} have answered',
        zero: 'Nobody yet'
      }
    }
  }),
  winner: defineTranslation('The {place:enum} takes it', {
    enum: { place: { first: 'winner', second: 'runner-up' } }
  })
})

const FRENCH_TRANSLATIONS: TranslationsLike<typeof TRANSLATIONS> = {
  menu: { built: 'Version {build}' },
  round: {
    clip: '{seconds:number} s',
    genres: 'On joue {genres:list}',
    none: 'Personne n’a trouvé'
  },
  score: defineTranslation('{count:plural}', {
    plural: { count: { one: '{?} point', other: '{?} points' } }
  }),
  waiting: defineTranslation('{count:plural}', {
    plural: {
      count: {
        one: '{?} a répondu',
        other: '{?} ont répondu',
        zero: 'Personne pour l’instant'
      }
    }
  }),
  winner: defineTranslation('C’est le {place:enum}', {
    enum: { place: { first: 'vainqueur', second: 'deuxième' } }
  })
}

const inEnglish = createTranslator<typeof TRANSLATIONS>({
  locale: 'en',
  translations: TRANSLATIONS
})

const inFrench = createTranslator<typeof TRANSLATIONS>({
  locale: 'fr',
  translations: FRENCH_TRANSLATIONS
})

describe('plural', () => {
  it('[plural] pays French its singular at zero, where English is already plural', () => {
    expect(inEnglish('score', { count: 0 })).toBe('0 points')
    expect(inFrench('score', { count: 0 })).toBe('0 point')
  })

  it('[plural] agrees with both locales at one and at two', () => {
    expect(inEnglish('score', { count: 1 })).toBe('1 point')
    expect(inEnglish('score', { count: 2 })).toBe('2 points')
    expect(inFrench('score', { count: 1 })).toBe('1 point')
    expect(inFrench('score', { count: 2 })).toBe('2 points')
  })

  it('[plural] takes a declared zero form over the category the locale would pick', () => {
    expect(inEnglish('waiting', { count: 0 })).toBe('Nobody yet')
    expect(inFrench('waiting', { count: 0 })).toBe('Personne pour l’instant')
  })

  it('[plural] drops the count where the form asks for it, and nowhere else', () => {
    expect(inEnglish('waiting', { count: 3 })).toBe('3 have answered')
  })
})

describe('formatting', () => {
  it('[number] prints a decimal the way the locale writes one', () => {
    expect(inEnglish('round.clip', { seconds: 1.5 })).toBe('1.5s')
    expect(inFrench('round.clip', { seconds: 1.5 })).toBe('1,5 s')
  })

  it('[list] joins with the locale’s own conjunction', () => {
    expect(inEnglish('round.genres', { genres: ['rock', 'jazz', 'pop'] })).toBe(
      'Playing rock, jazz, and pop'
    )
    expect(inFrench('round.genres', { genres: ['rock', 'jazz', 'pop'] })).toBe(
      'On joue rock, jazz et pop'
    )
  })

  it('[enum] reads the member out of the locale’s own map', () => {
    expect(inEnglish('winner', { place: 'first' })).toBe('The winner takes it')
    expect(inFrench('winner', { place: 'second' })).toBe('C’est le deuxième')
  })
})

describe('substitution', () => {
  it('[translate] interpolates an untyped placeholder as text', () => {
    expect(inEnglish('menu.built', { build: 'b0c4dfb' })).toBe('Build b0c4dfb')
  })

  it('[translate] returns a message with no placeholders untouched', () => {
    expect(inFrench('round.none')).toBe('Personne n’a trouvé')
  })
})
