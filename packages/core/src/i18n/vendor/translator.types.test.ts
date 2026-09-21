import { describe, expectTypeOf, it } from 'vitest'

import { createI18n } from './create-i18n'
import { defineTranslation, type PluralForms } from './define-translation'
import {
  type DictionaryFor,
  type DotPath,
  defineDictionary,
  type MatchingDictionary,
  type ParameterizedKey,
  type PlainKey,
  type RichValuesFor,
  type ValuesFor,
  type WellFormed
} from './dictionary'

/**
 * The half of this library that has no runtime to assert against. Every rule it
 * enforces is a compile error at a call site, and a compile error cannot be
 * caught by a test that has to compile — so each is written here as the type it
 * resolves to instead. `never` is how this library says no.
 *
 * These assertions are checked by `tsc --noEmit`, not by the test run: a broken
 * one fails the build.
 */

/** Assignability as a value, so that refusing it can be asserted too. */
type Accepts<Target, Candidate> = Candidate extends Target ? true : false

const REFERENCE = {
  actions: { cancel: 'Cancel', save: 'Save' },
  echo: '{name}, hello {name}',
  played: 'Played {at:date}',
  score: defineTranslation('{count:plural}', {
    plural: { count: { one: '{?} point', other: '{?} points' } }
  }),
  seconds: '{seconds:number}s',
  tags: 'Filed under {tags:list}',
  winner: defineTranslation('The {place:enum} takes it', {
    enum: { place: { first: 'winner', second: 'runner-up' } }
  })
} as const

type Reference = typeof REFERENCE

describe('keys', () => {
  it('[types] reaches every leaf by its dotted path, and no branch', () => {
    expectTypeOf<DotPath<Reference>>().toEqualTypeOf<
      | 'actions.cancel'
      | 'actions.save'
      | 'echo'
      | 'played'
      | 'score'
      | 'seconds'
      | 'tags'
      | 'winner'
    >()
  })

  it('[types] splits the keys a caller may render from nothing', () => {
    expectTypeOf<PlainKey<Reference>>().toEqualTypeOf<
      'actions.cancel' | 'actions.save'
    >()
    expectTypeOf<ParameterizedKey<Reference>>().toEqualTypeOf<
      'echo' | 'played' | 'score' | 'seconds' | 'tags' | 'winner'
    >()
  })

  // The counter in `DotPath` has to stop somewhere, and past it the whole path
  // union collapses at once — so the error a caller sees names their key rather
  // than the nesting. Ten segments is about twice the deepest key a dictionary
  // holds.
  it('[types] gives up past ten segments rather than lose a key quietly', () => {
    type TenSegments = {
      a: { b: { c: { d: { e: { f: { g: { h: { i: { j: 'x' } } } } } } } } }
    }

    expectTypeOf<DotPath<TenSegments>>().toEqualTypeOf<'a.b.c.d.e.f.g.h.i.j'>()
    expectTypeOf<DotPath<{ deeper: TenSegments }>>().toBeNever()
  })
})

describe('values', () => {
  it('[types] reads each placeholder’s type out of the message itself', () => {
    expectTypeOf<ValuesFor<Reference['echo']>>().toEqualTypeOf<{
      name: string
    }>()
    expectTypeOf<ValuesFor<Reference['seconds']>>().toEqualTypeOf<{
      seconds: number
    }>()
    expectTypeOf<ValuesFor<Reference['played']>>().toEqualTypeOf<{ at: Date }>()
    expectTypeOf<ValuesFor<Reference['tags']>>().toEqualTypeOf<{
      tags: readonly string[]
    }>()
    expectTypeOf<ValuesFor<Reference['score']>>().toEqualTypeOf<{
      count: number
    }>()
  })

  it('[types] narrows an enum value to the members the dictionary declares', () => {
    expectTypeOf<ValuesFor<Reference['winner']>>().toEqualTypeOf<{
      place: 'first' | 'second'
    }>()
  })

  // The forms a plural chooses between are dictionary text like the sentence,
  // and the runtime substitutes inside the one it selects. Reading the message
  // alone left `{sender}` on screen with nothing in the types asking for it.
  //
  // `{?}` is not among them: it is where the count prints, filled from the
  // number the caller already passed.
  it('[types] asks for a placeholder a plural form carries', () => {
    const inbox = defineTranslation('{count:plural}', {
      plural: {
        count: {
          one: '{?} message from {sender}',
          other: '{?} messages from {sender}'
        }
      }
    })

    expectTypeOf<ValuesFor<typeof inbox>>().toEqualTypeOf<{
      count: number
      sender: string
    }>()
  })

  it('[types] asks for one an enum member carries', () => {
    const standing = defineTranslation('{place:enum}', {
      enum: { place: { first: '{name} wins', second: '{name} came close' } }
    })

    expectTypeOf<ValuesFor<typeof standing>>().toEqualTypeOf<{
      name: string
      place: 'first' | 'second'
    }>()
  })
})

describe('what a dictionary may hold', () => {
  it('[types] refuses a plural or an enum written without its alternatives', () => {
    expectTypeOf<WellFormed<'{count:plural} left'>>().toBeNever()
    expectTypeOf<WellFormed<'the {place:enum} takes it'>>().toBeNever()
  })

  it('[types] accepts a formatter placeholder as a bare string', () => {
    expectTypeOf<WellFormed<'{n:number}s'>>().toEqualTypeOf<'{n:number}s'>()
    expectTypeOf<
      WellFormed<'Played {at:date}'>
    >().toEqualTypeOf<'Played {at:date}'>()
  })

  // A mapped type over a primitive returns that primitive, so the last branch
  // has to name `Dictionary` for a leaf that is not a sentence to be caught at
  // all.
  it('[types] refuses a leaf that is not a message', () => {
    expectTypeOf<WellFormed<{ count: 3 }>>().toBeNever()
    expectTypeOf<WellFormed<{ at: Date }>>().toBeNever()
    expectTypeOf<WellFormed<{ render: () => string }>>().toBeNever()
  })

  it('[types] walks a branch down to the messages under it', () => {
    expectTypeOf<WellFormed<{ actions: { save: 'Save' } }>>().toEqualTypeOf<{
      actions: { save: 'Save' }
    }>()
  })
})

describe('what a second locale owes the reference', () => {
  type French = DictionaryFor<Reference>

  it('[types] demands the same tree down to the same leaves', () => {
    expectTypeOf<French['actions']>().toEqualTypeOf<{
      readonly cancel: string
      readonly save: string
    }>()
    expectTypeOf<
      Accepts<French, { actions: { cancel: string } }>
    >().toEqualTypeOf<false>()
  })

  it('[types] lets the plural categories differ, since the languages do', () => {
    expectTypeOf<French['score'][1]>().toEqualTypeOf<{
      readonly plural: { readonly count: PluralForms }
    }>()
  })

  it('[types] holds an enum to the same members, whatever they are called in', () => {
    expectTypeOf<French['winner'][1]>().toEqualTypeOf<{
      readonly enum: { readonly place: Record<'first' | 'second', string> }
    }>()
  })
})

describe('what a second locale owes each message', () => {
  /** Whether the candidate may be registered beside the reference at all. */
  type Registers<Reference, Candidate> = Accepts<
    MatchingDictionary<Reference, Candidate>,
    Candidate
  >

  /** The same question about one message, asked inside a dictionary of one. */
  type Matches<Reference, Candidate> = Registers<
    { message: Reference },
    { message: Candidate }
  >

  const score = defineTranslation('{count:plural}', {
    plural: { count: { one: '{?} point', other: '{?} points' } }
  })

  const renamedScore = defineTranslation('{compte:plural}', {
    plural: { compte: { one: '{?} point', other: '{?} points' } }
  })

  const inbox = defineTranslation('{count:plural}', {
    plural: {
      count: {
        one: '{?} message from {sender}',
        other: '{?} messages from {sender}'
      }
    }
  })

  const silentInbox = defineTranslation('{count:plural}', {
    plural: { count: { one: '{?} message', other: '{?} messages' } }
  })

  const unevenInbox = defineTranslation('{count:plural}', {
    plural: { count: { one: 'un message', other: '{?} messages de {sender}' } }
  })

  it('[types] accepts a translation carrying the same placeholders', () => {
    expectTypeOf<
      Matches<'Hello {name}', 'Bonjour {name}'>
    >().toEqualTypeOf<true>()
  })

  it('[types] refuses a placeholder translated along with the sentence', () => {
    expectTypeOf<
      Matches<'Hello {name}', 'Bonjour {nom}'>
    >().toEqualTypeOf<false>()
  })

  it('[types] refuses a locale that drops a placeholder', () => {
    expectTypeOf<Matches<'Hello {name}', 'Bonjour'>>().toEqualTypeOf<false>()
  })

  it('[types] refuses a locale that invents one', () => {
    expectTypeOf<Matches<'Hello', 'Bonjour {name}'>>().toEqualTypeOf<false>()
  })

  // The value a caller passes is decided by the type after the colon, so two
  // messages naming the same placeholder differently still ask for different
  // things — a `number` the locale formats, or a string already printed.
  it('[types] refuses a placeholder whose value changes type', () => {
    expectTypeOf<
      Matches<'{count:number} left', '{count} restants'>
    >().toEqualTypeOf<false>()
  })

  // Word order is the whole point of translating. Only what the message asks
  // of the outside is compared, never where it asks for it.
  it('[types] lets the sentence be rebuilt around the placeholders', () => {
    expectTypeOf<
      Matches<'{name} played {at:date}', 'Le {at:date}, {name} a joué'>
    >().toEqualTypeOf<true>()
  })

  it('[types] refuses a locale that drops a marked span', () => {
    expectTypeOf<
      Matches<'Read the <link>terms</link>', 'Lire les conditions'>
    >().toEqualTypeOf<false>()
  })

  it('[types] compares a plural by the placeholder its message names', () => {
    expectTypeOf<Matches<typeof score, typeof score>>().toEqualTypeOf<true>()
    expectTypeOf<
      Matches<typeof score, typeof renamedScore>
    >().toEqualTypeOf<false>()
  })

  // The forms are compared as one set, not form by form: a language that names
  // the sender only in its plural, where English names it in both, says the
  // same thing. Dropping it from all of them does not.
  it('[types] compares the placeholders a plural’s forms carry, too', () => {
    expectTypeOf<Matches<typeof inbox, typeof inbox>>().toEqualTypeOf<true>()
    expectTypeOf<
      Matches<typeof inbox, typeof unevenInbox>
    >().toEqualTypeOf<true>()
    expectTypeOf<
      Matches<typeof inbox, typeof silentInbox>
    >().toEqualTypeOf<false>()
  })

  it('[types] reaches a message nested in a namespace', () => {
    expectTypeOf<
      Registers<
        { round: { won: '{name} wins' } },
        { round: { won: '{nom} gagne' } }
      >
    >().toEqualTypeOf<false>()
  })

  it('[types] refuses a key the reference does not have', () => {
    expectTypeOf<
      Registers<{ title: 'Dashboard' }, { extra: 'Trop'; title: 'Tableau' }>
    >().toEqualTypeOf<false>()
  })

  it('[types] refuses one buried in a namespace', () => {
    expectTypeOf<
      Registers<
        { room: { empty: 'Nobody' } },
        { room: { empty: 'Personne'; extra: 'Trop' } }
      >
    >().toEqualTypeOf<false>()
  })
  // What `defineDictionary` is for. An annotated dictionary — and one written
  // with `satisfies`, whose contextual type is that same `string` — reaches
  // here with every message widened, and a widened message has no placeholder
  // left to compare. Refusing it is the only honest answer: accepting it would
  // let exactly the mistake this checks for through, unexamined.
  it('[types] refuses a dictionary whose messages have been widened', () => {
    expectTypeOf<Matches<'Hello {name}', string>>().toEqualTypeOf<false>()
  })
})

describe('rich values', () => {
  it('[types] asks for one function per span the message marks', () => {
    expectTypeOf<
      RichValuesFor<'Read the <link>terms</link>', string>
    >().toEqualTypeOf<{ link: (children: string) => string }>()
  })

  // Every placeholder in the message lands in one object, however many there
  // are and wherever they were read from — the sentence, or a form a plural
  // chooses between. The span functions are the intersection beside it.
  it('[types] asks for the message’s own values alongside them', () => {
    expectTypeOf<
      RichValuesFor<'Hi <b>{name}</b>, {count:number} left', number>
    >().toEqualTypeOf<
      { count: number; name: string } & { b: (children: string) => number }
    >()
  })

  it('[types] asks for nothing at all when the message marks nothing', () => {
    expectTypeOf<RichValuesFor<'Nobody got it', string>>().toEqualTypeOf<
      // biome-ignore lint/complexity/noBannedTypes: the empty object type is the assertion
      {}
    >()
  })
})

describe('the registry', () => {
  const i18n = createI18n({
    defaultLocale: 'en',
    dictionaries: {
      en: { greeting: 'Hello {name}', title: 'Dashboard' },
      fr: { greeting: 'Bonjour {name}', title: 'Tableau de bord' }
    }
  })

  it('[types] takes the locales it accepts from the registry’s own keys', () => {
    expectTypeOf<Parameters<typeof i18n.translator>[0]>().toEqualTypeOf<
      'en' | 'fr'
    >()
    expectTypeOf<Parameters<typeof i18n.negotiate>[0]>().toEqualTypeOf<
      readonly string[]
    >()
    expectTypeOf(i18n.negotiate([])).toEqualTypeOf<'en' | 'fr'>()
  })

  it('[types] keeps the default locale a single literal, not the whole union', () => {
    expectTypeOf(i18n.defaultLocale).toEqualTypeOf<'en'>()
  })

  // The keys come from the default locale's dictionary even when the strings
  // being read are another language's, so this call compiles for `fr` too — and
  // a key no dictionary declares compiles for neither.
  it('[types] types the keys from the default locale’s dictionary', () => {
    expectTypeOf(i18n.translator('fr')('title')).toEqualTypeOf<string>()
    expectTypeOf(
      i18n.translator('en')('greeting', { name: 'Ada' })
    ).toEqualTypeOf<string>()
  })
})

describe('a registry that loads a locale late', () => {
  const i18n = createI18n({
    defaultLocale: 'en',
    dictionaries: {
      de: () =>
        Promise.resolve({
          default: defineDictionary({
            greeting: 'Hallo {name}',
            title: 'Übersicht'
          })
        }),
      en: { greeting: 'Hello {name}', title: 'Dashboard' }
    }
  })

  it('[types] counts a locale whose dictionary has not arrived', () => {
    expectTypeOf<Parameters<typeof i18n.load>[0]>().toEqualTypeOf<'de' | 'en'>()
    expectTypeOf(i18n.negotiate([])).toEqualTypeOf<'de' | 'en'>()
  })

  // A loader is checked against the reference before it is ever called, so the
  // keys are the same ones whether the dictionary is in the bundle or not.
  it('[types] types the keys from the default locale either way', () => {
    expectTypeOf(i18n.translator('de')('title')).toEqualTypeOf<string>()
    expectTypeOf(
      i18n.translator('de')('greeting', { name: 'Ada' })
    ).toEqualTypeOf<string>()
  })

  it('[types] resolves a load with the translator the locale then reads', () => {
    expectTypeOf(i18n.load('de')).resolves.toEqualTypeOf<
      ReturnType<typeof i18n.translator>
    >()
  })

  // The default locale's entry is the reference itself, so registering a loader
  // there would type every key from a function — which is why the parameter
  // refuses one. That refusal is a compile error, and this is the type the
  // registry would otherwise reach.
  it('[types] would have no key at all if the reference arrived late', () => {
    expectTypeOf<
      DotPath<() => Promise<{ default: { title: 'Dashboard' } }>>
    >().toBeNever()
  })
})
