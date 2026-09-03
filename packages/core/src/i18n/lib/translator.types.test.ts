import { describe, expectTypeOf, it } from 'vitest'

import { createI18n } from './create-i18n'
import { defineTranslation, type PluralForms } from './define-translation'
import type {
  DictionaryFor,
  DotPath,
  ParameterizedKey,
  PlainKey,
  RichValuesFor,
  ValuesFor,
  WellFormed
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

describe('rich values', () => {
  it('[types] asks for one function per span the message marks', () => {
    expectTypeOf<
      RichValuesFor<'Read the <link>terms</link>', string>
    >().toEqualTypeOf<{ link: (children: string) => string }>()
  })

  it('[types] asks for the message’s own values alongside them', () => {
    expectTypeOf<
      RichValuesFor<'Hi <b>{name}</b>, {count:number} left', number>
    >().toEqualTypeOf<
      { name: string } & { count: number } & { b: (children: string) => number }
    >()
  })

  it('[types] asks for nothing at all when the message marks nothing', () => {
    expectTypeOf<
      RichValuesFor<'Nobody got it', string>
    >().toEqualTypeOf<// biome-ignore lint/complexity/noBannedTypes: the empty object type is the assertion
    {}>()
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
