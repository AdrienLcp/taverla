import { describe, expect, it } from 'vitest'

import { defineTranslation } from './define-translation'
import { type DictionaryFor, defineDictionary } from './dictionary'
import { createTranslator } from './translator'

const REFERENCE = defineDictionary({
  echo: '{name}, hello {name}',
  inbox: defineTranslation('{count:plural}', {
    plural: {
      count: {
        one: '{?} message from {sender}',
        other: '{?} messages from {sender}'
      }
    }
  }),
  menu: { built: 'Build {build}' },
  posted: defineTranslation('Posted {when:relative}', {
    relative: { when: { numeric: 'auto', unit: 'day' } }
  }),
  round: {
    clip: '{seconds:number}s',
    genres: 'Playing {genres:list}',
    none: 'Nobody got it'
  },
  score: defineTranslation('{count:plural}', {
    plural: { count: { one: '{?} point', other: '{?} points' } }
  }),
  spokenIn: defineTranslation('Spoken in {language:displayname}', {
    displayname: { language: { type: 'language' } }
  }),
  standing: defineTranslation('{place:enum}', {
    enum: { place: { first: '{name} wins', second: '{name} came close' } }
  }),
  terms: 'Read the <link>terms</link> before playing',
  waiting: defineTranslation('{count:plural}', {
    plural: {
      count: {
        one: '{?} has answered',
        other: '{?} have answered',
        zero: 'Nobody yet'
      }
    }
  }),
  welcome: 'Welcome <strong>{name}</strong>, you have {count:number} points',
  winner: defineTranslation('The {place:enum} takes it', {
    enum: { place: { first: 'winner', second: 'runner-up' } }
  })
})

const FRENCH: DictionaryFor<typeof REFERENCE> = {
  echo: '{name}, bonjour {name}',
  inbox: defineTranslation('{count:plural}', {
    plural: {
      count: {
        one: '{?} message de {sender}',
        other: '{?} messages de {sender}'
      }
    }
  }),
  menu: { built: 'Version {build}' },
  posted: defineTranslation('Publié {when:relative}', {
    relative: { when: { numeric: 'auto', unit: 'day' } }
  }),
  round: {
    clip: '{seconds:number} s',
    genres: 'On joue {genres:list}',
    none: 'Personne n’a trouvé'
  },
  score: defineTranslation('{count:plural}', {
    plural: { count: { one: '{?} point', other: '{?} points' } }
  }),
  spokenIn: defineTranslation('Parlé en {language:displayname}', {
    displayname: { language: { type: 'language' } }
  }),
  standing: defineTranslation('{place:enum}', {
    enum: {
      place: { first: '{name} gagne', second: '{name} a frôlé la victoire' }
    }
  }),
  terms: 'Lis les <link>conditions</link> avant de jouer',
  waiting: defineTranslation('{count:plural}', {
    plural: {
      count: {
        one: '{?} a répondu',
        other: '{?} ont répondu',
        zero: 'Personne pour l’instant'
      }
    }
  }),
  welcome: 'Bienvenue <strong>{name}</strong>, tu as {count:number} points',
  winner: defineTranslation('C’est le {place:enum}', {
    enum: { place: { first: 'vainqueur', second: 'deuxième' } }
  })
}

const inEnglish = createTranslator<typeof REFERENCE>({
  dictionary: REFERENCE,
  locale: 'en'
})

const inFrench = createTranslator<typeof REFERENCE>({
  dictionary: FRENCH,
  locale: 'fr'
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

  // A form is dictionary text like the sentence that selected it, so what it
  // writes besides the count is substituted too. Only `{?}` used to be.
  it('[plural] substitutes a placeholder the selected form carries', () => {
    expect(inEnglish('inbox', { count: 1, sender: 'Ada' })).toBe(
      '1 message from Ada'
    )
    expect(inFrench('inbox', { count: 4, sender: 'Ada' })).toBe(
      '4 messages de Ada'
    )
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

  // The unit lives with the message because the message cannot say it, and the
  // sign is Intl's own: negative is the past. `numeric: 'auto'` is what buys
  // "yesterday" instead of "1 day ago".
  it('[relative] names a day the way the locale names it', () => {
    expect(inEnglish('posted', { when: -1 })).toBe('Posted yesterday')
    expect(inFrench('posted', { when: -1 })).toBe('Publié hier')
    expect(inEnglish('posted', { when: -3 })).toBe('Posted 3 days ago')
    expect(inFrench('posted', { when: 2 })).toBe('Publié après-demain')
  })

  it('[displayname] writes a language code as a word, in the reading locale', () => {
    expect(inEnglish('spokenIn', { language: 'fr' })).toBe('Spoken in French')
    expect(inFrench('spokenIn', { language: 'en' })).toBe('Parlé en anglais')
  })

  it('[enum] reads the member out of the locale’s own map', () => {
    expect(inEnglish('winner', { place: 'first' })).toBe('The winner takes it')
    expect(inFrench('winner', { place: 'second' })).toBe('C’est le deuxième')
  })

  it('[enum] substitutes a placeholder the selected member carries', () => {
    expect(inEnglish('standing', { name: 'Ada', place: 'first' })).toBe(
      'Ada wins'
    )
    expect(inFrench('standing', { name: 'Ada', place: 'second' })).toBe(
      'Ada a frôlé la victoire'
    )
  })
})

describe('substitution', () => {
  it('[translate] interpolates an untyped placeholder as text', () => {
    expect(inEnglish('menu.built', { build: 'b0c4dfb' })).toBe('Build b0c4dfb')
  })

  it('[translate] returns a message with no placeholders untouched', () => {
    expect(inFrench('round.none')).toBe('Personne n’a trouvé')
  })

  it('[translate] substitutes every occurrence, not only the first', () => {
    expect(inEnglish('echo', { name: 'Ada' })).toBe('Ada, hello Ada')
  })

  // A player names their table `{seconds}`, a track title carries a brace: the
  // message is walked once and what a value writes is never read as a
  // placeholder. Substituting argument by argument would hand each result to
  // the next argument's turn, and print the number of seconds inside the name.
  it('[translate] writes a value out rather than reading it back as a placeholder', () => {
    expect(inEnglish('menu.built', { build: '{seconds:number}' })).toBe(
      'Build {seconds:number}'
    )
  })

  // Only the form the dictionary selected is read again, never what the caller
  // wrote into it: a sender who names themselves `{count:plural}` is a sender.
  it('[translate] holds that rule inside a form it expanded', () => {
    expect(inEnglish('inbox', { count: 2, sender: '{count:plural}' })).toBe(
      '2 messages from {count:plural}'
    )
  })
})

describe('rich', () => {
  it('[rich] cuts the sentence at its spans and hands each one to its function', () => {
    expect(
      inEnglish.rich('terms', { link: (text) => `[${text}]` })
    ).toStrictEqual(['Read the ', '[terms]', ' before playing'])
  })

  // What a span becomes is the caller's business, and nothing here says it has
  // to be a string — a UI framework returns an element and renders the list.
  it('[rich] lets a span become something that is not text', () => {
    expect(
      inFrench.rich('welcome', {
        count: 3,
        name: 'Ada',
        strong: (text) => ({ bold: text })
      })
    ).toStrictEqual(['Bienvenue ', { bold: 'Ada' }, ', tu as 3 points'])
  })

  it('[rich] substitutes inside a span as well as around it', () => {
    expect(
      inEnglish.rich('welcome', {
        count: 1,
        name: 'Ada',
        strong: (text) => text.toUpperCase()
      })
    ).toStrictEqual(['Welcome ', 'ADA', ', you have 1 points'])
  })

  // The spans are cut before anything is substituted, so a value that reads
  // like a span is written out as text — the same rule the placeholders follow.
  it('[rich] writes a value out rather than reading it back as a span', () => {
    expect(
      inEnglish.rich('welcome', {
        count: 1,
        name: '<strong>Ada</strong>',
        strong: (text) => `[${text}]`
      })
    ).toStrictEqual([
      'Welcome ',
      '[<strong>Ada</strong>]',
      ', you have 1 points'
    ])
  })

  it('[rich] returns a message with no span as a single piece', () => {
    expect(inEnglish.rich('round.none', {})).toStrictEqual(['Nobody got it'])
  })
})

// What `defineDictionary` makes unwriteable, kept as the reason it does: a
// `{count:plural}` with no forms to choose between has no branch to select. The
// fixture therefore skips `defineDictionary` — the message degrades to the bare
// count rather than throwing, so one unwriteable message costs one word.
describe('a message missing the forms its placeholder needs', () => {
  const LOOSE = { impact: 'This impacts {count:plural}' as const }

  const translate = createTranslator<typeof LOOSE>({
    dictionary: LOOSE,
    locale: 'en'
  })

  it('[translate] falls back to the count, formatted by nobody', () => {
    expect(translate('impact', { count: 3 })).toBe('This impacts 3')
  })
})

// A form naming the placeholder it was selected for is the one shape the
// expansion has no floor of its own to stop on. It refuses to re-enter a name it
// is already inside, and leaves that placeholder standing — the answer a value
// of the wrong type gets, for the same reason: one word, not the sentence.
describe('a plural form that names its own placeholder', () => {
  const LOOPING = defineDictionary({
    left: defineTranslation('{count:plural}', {
      plural: { count: { other: '{count:plural} left' } }
    })
  })

  const translate = createTranslator<typeof LOOPING>({
    dictionary: LOOPING,
    locale: 'en'
  })

  it('[plural] stops rather than expanding the same form forever', () => {
    expect(translate('left', { count: 2 })).toBe('{count:plural} left')
  })
})

// Three behaviours are deliberately left untested here: a key the dictionary does
// not hold, which comes back as itself, and a value a message asked for and did
// not get, which leaves its placeholder standing. Both are unreachable through
// the types, so asserting either would need a cast — and the cast is what would
// be untrue. Their guarantee lives in `translator.types.test.ts`, which is the
// better place for it.
//
// The third is the formatter cache, which has no observable effect at all:
// counting how often `Intl.NumberFormat` is constructed means replacing a
// global, and a test that reaches that far is more fragile than what it proves.
