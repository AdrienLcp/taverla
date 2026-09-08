# Typed i18n

A translation and formatting library in five files, with no dependency on any
project and none on a framework — copying this folder into another TypeScript
project is the whole install.

| File | What it holds |
| --- | --- |
| `define-translation.ts` | `defineTranslation`, and the options a placeholder demands |
| `dictionary.ts` | `defineDictionary`, `DictionaryFor`, and every type read off a message |
| `translator.ts` | `createTranslator` — the lookup and the substitution |
| `negotiate-locale.ts` | `negotiateLocale` — which locale a preference list asks for |
| `create-i18n.ts` | `createI18n` — the registry binding each locale to its dictionary |

## What it does, and what it does not

It looks a message up by a dotted key and substitutes values into it, formatting
numbers, dates, lists and plurals through the platform's `Intl`. Everything it
knows about a message — which values it takes, of which type, whether it takes
any at all — it knows at compile time.

It reads nothing on its own: no `Accept-Language`, no `navigator.languages`, no
cookie, no query string. It persists nothing, stores nothing, and fetches
nothing. Where the preferences come from and where the dictionaries live is the
caller's business — which is what lets the same code serve a browser booting, a
server rendering a mail, and a test.

### Two doors

**`createI18n` is the one to use.** It takes every locale's dictionary once and
hands back an object where a locale is all anyone passes afterwards.

`createTranslator` is underneath it, and takes a locale *and* a dictionary. Use
it directly only when the dictionary arrives at runtime — an `import()`, a fetch
— because nothing there can check that the two arguments go together: a
translator built with the French dictionary and the tag `'en'` reads French and
counts in English.

## Getting started

```ts
import { createI18n } from './create-i18n'
import { defineDictionary, type DictionaryFor } from './dictionary'

const EN = defineDictionary({
  greeting: 'Hello {name}',
  room: { empty: 'Nobody here yet' },
  title: 'Dashboard'
})

const FR: DictionaryFor<typeof EN> = {
  greeting: 'Bonjour {name}',
  room: { empty: 'Personne pour l’instant' },
  title: 'Tableau de bord'
}

export const i18n = createI18n({
  defaultLocale: 'en',
  dictionaries: { en: EN, fr: FR }
})

const translate = i18n.translator('fr')

translate('greeting', { name: 'Ada' }) // 'Bonjour Ada'
translate('room.empty') // 'Personne pour l’instant'
translate('title') // 'Tableau de bord'
```

`defaultLocale`'s dictionary is the **reference**: the contract every other
locale implements, and the one every key and value is typed from — so the keys
above are English even when the strings read are French.

The registry exposes five things:

| | |
| --- | --- |
| `i18n.translator(locale)` | the translator for that locale |
| `i18n.negotiate(preferred)` | which registered locale a list of BCP-47 tags asks for |
| `i18n.compare(locale, options?)` | a comparator for `Array.sort`, so `Émile` lands between `Adrien` and `Zoé` rather than after both |
| `i18n.locales` | every registered locale |
| `i18n.defaultLocale` | the one `negotiate` falls back to |

A translator is built once per locale and kept, so `translator('fr')` returns
the *same* function every time. That is not a speed optimisation: a consumer
memoising on the translator has to see a new identity when the locale changes
and the same one when it does not, or every `useMemo` downstream either
recomputes on every render or keeps serving the old language.

### Choosing which locale to open on

```ts
i18n.negotiate(navigator.languages)
```

Each tag is tried whole, then with one subtag dropped at a time, and at every
one of those steps a registered locale that *extends* the candidate will do. So
`fr-CA` reads a registered `fr`, a registered `pt-BR` still beats a bare `pt`,
and — the case a lookup that only walks up gets wrong — a bare `fr` reads
`fr-FR` in an app that ships `fr-FR` and `fr-CA` and no plain `fr`. Answering
English there would be worse than answering the wrong French. Between two
regions of one language, declaration order decides.

Order across tags wins over presence: a device listing `de-DE, fr-FR, en` gets
French, so one tag is exhausted in both directions before the next is looked at.
`negotiateLocale` is the same rule as a free function, for a caller with no
registry — a server reading `Accept-Language`, for instance.

## Message syntax

A placeholder is `{name}`, optionally typed as `{name:type}`. Five types exist.
A typed placeholder whose formatter needs options, or whose alternatives the
dictionary must supply, is written with `defineTranslation(message, options)`
instead of a bare string.

| Placeholder | Value | Dictionary options | Behind it |
| --- | --- | --- | --- |
| `{x}` | `string` | none | `String(value)` |
| `{x:number}` | `number` | `number.x`, optional | `Intl.NumberFormat` |
| `{x:plural}` | `number` | `plural.x`, **required** | `Intl.PluralRules`, then `Intl.NumberFormat` |
| `{x:date}` | `Date` | `date.x`, optional | `Intl.DateTimeFormat` |
| `{x:list}` | `readonly string[]` | `list.x`, optional | `Intl.ListFormat` |
| `{x:relative}` | `number` | `relative.x`, **required** | `Intl.RelativeTimeFormat` |
| `{x:displayname}` | `string` | `displayname.x`, **required** | `Intl.DisplayNames` |
| `{x:enum}` | a key of `enum.x` | `enum.x`, **required** | none |

`:number`, `:date` and `:list` only configure a formatter, so a bare string
declaring one is already complete — the options are how you override the
formatter's defaults. The other three demand theirs: `:plural` and `:enum` carry
translatable text, `:relative` needs the unit the count is counting and
`:displayname` the kind of name to look up. A message declaring one of those
without its options does not compile.

`{x:relative}` takes the count alone and reads its sign the way `Intl` does —
negative is the past. With `numeric: 'auto'` the locale answers *yesterday*
rather than *1 day ago*.

```ts
const EN = defineDictionary({
  fileSize: defineTranslation('{bytes:number} bytes written', {
    number: { bytes: { maximumFractionDigits: 0 } }
  }),
  greeting: 'Hello {name}',
  playedAt: defineTranslation('Played on {day:date}', {
    date: { day: { dateStyle: 'long' } }
  }),
  players: '{count:number} players',
  rounds: defineTranslation('{count:plural} played', {
    plural: {
      count: { one: '{?} round', other: '{?} rounds', zero: 'No round' }
    }
  }),
  sharedWith: defineTranslation('Shared with {people:list}', {
    list: { people: { type: 'conjunction' } }
  }),
  spokenIn: defineTranslation('Spoken in {language:displayname}', {
    displayname: { language: { type: 'language' } }
  }),
  status: defineTranslation('Status: {value:enum}', {
    enum: { value: { draft: 'Draft', published: 'Published' } }
  }),
  updated: defineTranslation('Updated {when:relative}', {
    relative: { when: { numeric: 'auto', unit: 'day' } }
  })
})

translate('greeting', { name: 'Ada' }) // 'Hello Ada'
translate('players', { count: 3 }) // '3 players'
translate('fileSize', { bytes: 2048 }) // '2,048 bytes written'
translate('rounds', { count: 0 }) // 'No round played'
translate('playedAt', { day: new Date() }) // 'Played on September 3, 2026'
translate('sharedWith', { people: ['Ada', 'Grace', 'Alan'] }) // 'Shared with Ada, Grace, and Alan'
translate('status', { value: 'draft' }) // 'Status: Draft'
translate('updated', { when: -1 }) // 'Updated yesterday'
translate('spokenIn', { language: 'fr' }) // 'Spoken in French'
```

Two things about `:plural` that nothing in the syntax hints at:

- **The count is written `{?}` inside a branch**, not `#` and not `{count}`.
  `{?}` is replaced by the count run through `Intl.NumberFormat`, configurable
  per message with `plural.count.formatter`. A branch may leave it out.
- **`zero` is not a CLDR category here.** `Intl.PluralRules` selects `other` for
  0 in English and French, so a `zero` branch would never fire on its own; the
  library checks for a count of exactly 0 first and uses `zero` when the
  dictionary declares one. `other` is the only branch a plural map must have — a
  category the rules select but the map omits falls back to it.
  `plural.count.type` chooses between cardinal and ordinal rules.

## Type guarantees

This is what the library is for; the runtime is the small half.

**A key that does not exist does not compile.**

```ts
// Does not compile: Argument of type '"titel"' is not assignable to
// parameter of type '"greeting" | "room.empty" | "title"'.
translate('titel')
```

**A branch is not a key.** Only the message at the end of a path is; `room` on
its own is not a key, `room.empty` is.

**Values are required or forbidden per message**, through two call signatures
rather than one: a message with no placeholder refuses a second argument, and a
message with placeholders refuses to be called without them.

```ts
// Does not compile: Expected 2 arguments, but got 1.
translate('greeting')

// Does not compile: Expected 1 arguments, but got 2.
translate('title', { name: 'Ada' })

// Does not compile: Type '"archived"' is not assignable to type
// '"draft" | "published"'.
translate('status', { value: 'archived' })
```

`PlainKey<Reference>` names the first set on its own. It is the type a lookup
table or a piece of state should hold: a key needing values cannot be translated
by whoever reads it back, and a key stored as an already-rendered string freezes
in the language it was rendered in.

**A `:plural` or `:enum` written without its map does not compile.** Without the
map there is no branch to select, and the message would degrade to the bare
count — so `defineDictionary` makes it unwriteable instead.

```ts
// Does not compile: Type 'string' is not assignable to type 'never'.
defineDictionary({ rounds: '{count:plural} played' })
defineDictionary({ status: 'Status: {value:enum}' })
```

**A leaf that is not a message does not compile either** — a number, a `Date`, a
function. The check has to name `Dictionary` explicitly to catch them, because a
mapped type over a primitive returns that primitive unexamined.

**A locale the registry does not hold does not compile**, and neither does a
`defaultLocale` absent from the dictionaries.

## Adding a locale

Write the dictionary as an implementation of the reference one, by annotating it
with `DictionaryFor`, then add it to the registry. The keys `translate` accepts
do not change: they are the reference's, always.

An annotation rather than a function call, so that TypeScript's excess property
check does half the work: a missing key is a missing required property, and an
invented one is rejected at the literal, at every depth. Plural categories may
differ between locales — French answers `one` where English answers `other` — so
only `other` is required of either; an enum, on the other hand, must keep the
same members, since those are what the calling code passes.

There is **no key-level fallback to another locale**: the annotation makes a
missing key fail to compile, which is a better place to find out than a screen
showing English inside French.

### Loading only the dictionary in use

A registry holds every dictionary, so a bundler ships every dictionary. An app
large enough to care imports them itself and drops to the lower door:

```ts
const DICTIONARIES = {
  en: () => import('./dictionary-en'),
  fr: () => import('./dictionary-fr')
}

const { default: dictionary } = await DICTIONARIES[locale]()
const translate = createTranslator<Reference>({ dictionary, locale })
```

The reference dictionary is still imported for its *type*, which costs nothing at
runtime — `import type` is erased. What the caller owes this arrangement is an
answer for the load failing: keep the translator already in hand, or hold the
first paint until the dictionary lands. The library has no opinion, and no
partial-dictionary mode to fall into. It also owes the caching `createI18n` does
for free, since a translator rebuilt on every render is a new identity every
time.

## A link or a bold word inside a sentence

Splitting `Read the <link>terms</link> first` into three keys breaks the moment a
language puts the words in another order. So a message may mark spans, and
`translate.rich` hands each one to the function named after it:

```ts
const EN = defineDictionary({
  terms: 'Read the <link>terms</link> before playing'
})

translate.rich('terms', { link: (children) => `<a href="/terms">${children}</a>` })
// [ 'Read the ', '<a href="/terms">terms</a>', ' before playing' ]
```

It returns the pieces in order: strings for the plain parts, whatever the
functions returned for the marked ones. **Nothing here is a framework.** A
function may return an element, an HTML string, a terminal escape sequence — the
return type is inferred from what you give it. A UI framework renders the array
as a list of children; a string consumer joins it.

The values a message needs and the functions its spans need are one object, and
both are required by the types: a message that marks `<link>` cannot be rendered
without a `link` function, and one that marks nothing takes none.

Spans are cut **before** anything is substituted, so a value that itself reads
`<b>` is written out as text rather than becoming a span — the same rule the
placeholders follow, for the same reason.

## Where the library ends

Everything in this folder is generic. Nothing that names your product belongs in
it — not the locales you ship, not the dictionaries, not the storage key you
remember a choice under, not a React provider.

The shape that keeps the seam clean is one module in the app that calls
`createI18n` and is imported everywhere else:

```
lib/                    ← this folder, copied, never edited per project
  create-i18n.ts        …
i18n.ts                 ← the registry: your locales, your dictionaries
dictionary-en.ts        ← the reference
dictionary-fr.ts        ← DictionaryFor<typeof EN_DICTIONARY>
i18n-provider.tsx       ← if the app is React: context, switching, persistence
```

The provider is deliberately outside: a translator is a plain function, and
which framework hands it down — or whether one does at all, as on a server —
is not this library's business.

## Known limitations

**Keys stop at ten segments.** `DotPath` counts levels down from `10` to
terminate its own recursion — a dictionary type that is still a type parameter
offers nothing else to stop the walk on, and TypeScript gives up with "type
instantiation is excessively deep". `a.b.c.d.e.f.g.h.i.j` is fine; add an
eleventh segment and the key stops compiling. The error is misleading, because
the whole path union collapses to `never` at once — recognise it by the depth
rather than by the message.

**A value that does not arrive leaves its placeholder on screen.** A missing
value, or one of the wrong runtime type, is written out as `{name}` rather than
throwing: one bad value costs one word instead of the sentence. It is silent —
no log, no throw — and hard to reach through the types, but a dictionary built
dynamically can get there.

**A key the dictionary does not hold comes back as itself.** Same silence, same
reasoning, and unreachable for a dictionary written in the repo.

**`createTranslator` cannot check that its dictionary matches its locale.**
`createI18n` exists to make that pairing impossible to get wrong; reaching past
it for a lazily loaded dictionary takes the guarantee back off the table.

**Intl formatters are cached per translator, keyed on the options as
written.** Building one resolves locale data and costs far more than using one,
so each is built once and kept for the translator's lifetime. Two equivalent
option objects whose keys are in a different order each get an entry; they come
from dictionary literals, so the count is bounded by the dictionary.

**A message that marks spans is still readable with `translate`**, markers and
all. Nothing prevents it, because a plain-text context — a log line, a `title`
attribute, a test — legitimately wants the raw sentence; on a screen it is a
visible mistake, and the only guard against it is knowing which keys carry
spans.

**A span cannot hold another span.** The inner one would have to be rendered
before the outer function could be handed a string, and a string is all a
function receives. `<b>very <i>very</i> bold</b>` does not work; two sibling
spans do.

**Type-level rules are tested as types, not as behaviour.** Everything above
that says "does not compile" is asserted in `translator.types.test.ts` as the
type it resolves to, since a compile error cannot be caught by a test that has
to compile. Those assertions are checked by `tsc --noEmit`, so a regression
fails the build rather than the test run.
