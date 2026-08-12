---
description: Strings live in a dictionary, colours in both palettes — never in a component
paths:
  - "**/*.tsx"
  - "**/*.sass"
  - "packages/core/src/i18n/**"
  - "packages/protocol/src/locale.ts"
---

# Strings and colours

Two rules, and they have the same shape: **nothing user-visible is written where
it is used.** A string lives in a dictionary, a colour lives in a palette, and a
component references both by name.

## Strings

`apps/game/src/presentation/i18n/` holds one object per locale, and
`packages/core/src/i18n/` holds the machinery that reads them. There is still no
i18n *dependency*: what the room needs is `Intl`, which the browser already
ships, and a type layer that makes a missing string or a wrong argument fail to
compile.

**`dictionary-en.ts` is the reference**, and every other locale is an
implementation of it. `TranslationKey` is `DotPath<typeof EN_DICTIONARY>`,
`Dictionary` is `TranslationsLike<typeof EN_DICTIONARY>`, and `dictionary-fr.ts`
is typed with it — so a key added to English and forgotten in French does not
compile, and neither does a typo at a call site.

**The dictionaries are nested objects; a key is the dotted path to a leaf.**
`blindtest.source.ready` is `blindtest → source → ready`, and `DotPath` walks
the tree back into the same literal union a flat file would have given — which
is what keeps `` `error.${code}` `` and `` `${game}.name` `` assignable. Two
consequences worth knowing before you add a key:

- **A branch cannot also be a leaf.** `host.answerWindow` was both a label and
  the parent of `host.answerWindow.none`; it is now `host.answerWindow.label`.
  Same for `host.roundCount.summary` and `preferences.theme.label`. When a
  group needs a name of its own, that name is a child.
- **The full key is written nowhere.** `grep 'error.room_not_found'` finds the
  call site, never the string — the dictionary spells it in three pieces. Search
  for the last segment, or walk down from the prefix.
- **Ten levels, and we use three.** `DotPath` counts its recursion down because
  the lib is generic over the dictionary rather than holding a registered one;
  past the last level a path resolves to `never` and the call site stops
  compiling. Raise `Level` in `translator.ts` if a tree ever earns the depth.

```tsx
const translate = useTranslate()
…
<h1>{translate('player.nickname.title')}</h1>
<p>{translate('player.roomSize', { count: view.players.length })}</p>
```

### Adding a string

1. Add the key to `dictionary-en.ts`, and namespace it by the test below.
2. Add it to `dictionary-fr.ts`. The compiler will insist.
3. Write placeholders by the table below. A missing *value* renders the
   placeholder rather than throwing, so it shows up in the browser pass.

### What a placeholder costs

| Written | The caller passes | Use it for |
|---|---|---|
| `{name}` | a `string` | a nickname, a room code, a build hash |
| `{n:number}` | a `number` | any number in a sentence |
| `{n:plural}` | a `number` | a number the sentence **agrees with** |
| `{at:date}` | a `Date` | — none yet |
| `{items:list}` | a `string[]` | — none yet |
| `{x:enum}` | one of its own members | — none yet |

A bare string is enough for the first two. `plural` and `enum` carry
alternatives, so they take a second argument through `defineTranslation` — and
`defineTranslations` refuses a bare string that declares one, rather than
letting the map go missing and the count print raw.

**Never pass an empty options object.** If there is nothing to say to the
formatter, the message is a plain string.

```ts
'host.seconds': '{seconds:number}s',
'host.roundCount': defineTranslation('{count:plural}', {
  plural: { count: { one: '{?} round', other: '{?} rounds' } }
}),
```

`{?}` is where the formatted number lands inside a form — a form may leave it
out entirely, which is how `player.points` renders the bare word beside a score
the markup prints itself.

### When a count earns `plural`

> **Does any locale change a word because of this number?**

Not English — *any*. French counts 0 as singular, so "0 point" is right there
and "0 points" is wrong; English is plural at 0 and singular only at 1. The
reference declares the plural the moment one of them inflects, and English is
free to write nothing but `other` — the shape of a key is the same in every
dictionary, and that is what lets French write `one` beside it.

This replaced a hand-rolled `topScore === 1 ? … : …` on the final board, which
was the English rule applied to both locales on the biggest screen in the room.
`packages/core/src/i18n/translator.test.ts` holds it red.

### A key held in state or a lookup table is a `PlainTranslationKey`

`translate` takes no second argument for a message with no placeholders, and
requires the right one for a message with them. So a key that travels — through
`useState`, a `Record<Status, …>`, a prop — is typed `PlainTranslationKey`:
whoever reads it back has no values to give it. A key needing values travels
with them, as `join-with-code.tsx` does with its two-armed `FieldError`.

### Which prefix — one question decides it

> **Would the second game display this string unchanged?**

If yes it is **shell**, and it goes under `join.*`, `host.*`, `player.*`,
`round.*`, `buzz.*`, `error.*`, `connection.*`, `menu.*` or `preferences.*`. If
no it belongs to the game, and takes that game's name: `blindtest.*` or
`buzzer.*`.

A game's prefix is its `GameKind`, and three of its keys are addressed by
function rather than by hand — `gameNameKey`, `gameTaglineKey` and
`gameDescriptionKey` build `` `${ShelvedGame}.name` `` and its siblings, so
putting a game on the shelf does not compile until both locales can name it,
pitch it and describe it.

The trap is `host.*`: it names the *screen*, and a screen shows both kinds of
string. "Start the game", "Next round", "How to answer" and "Volume" are shell —
every future game has a host console with those. "Clip length", the genres, the
source picker and the title/artist verdict are the blind test's, and they live
under `blindtest.*` even though they are rendered on the host console.

Volume is the edge worth stating: it presupposes *audio*, not the blind test, so
a second game that plays anything reuses it. Shell.

**A mode is not a game.** `buzz.*` is the shell's, because `answerMode` is a
room setting and the bare buzzer game renders every one of those strings
unchanged — the button, the blockers, "{nickname} buzzed". It lived under
`blindtest.*` until a second game needed it, which is the whole test working as
intended. `round.*` is the same shape one level up: "Round 3 of 10", "+2",
"Nobody got it" are what a *round* shows in any game.

The third game moved four more, and they are the same shape: `round.answer.*` is
the field a *simultaneous round* is answered in — its label, its send, its
"waiting for the others", its "as many goes as you like" — where it had been
`blindtest.answer.*`, and `host.verdict.*` is the right/wrong pair the host taps,
where it had been the bare buzzer's. Two games needing a string unchanged is the
signal; one game plus a hunch is not.

What stays inside a game's prefix is what only that game can say:
`blindtest.reveal.title` is "It was", and a charade has no "it".
`blindtest.answer.bothFound` says "both", and only a pair of halves has two.

### Hold a key, never a rendered string

An error stored in state as `translate(…)` output freezes in whatever locale was
active when it was set. Store the key — `{ key, values }` — and translate at
render. `join-with-code.tsx` does this, and switching locale with an error on
screen is how you check it. The same reasoning forbids hoisting a rendered
string to module scope: it would freeze for the life of the tab, and `translate`
comes from a hook anyway. Hoist the **key**, never the text.

### Enums map to keys through a function

`protocolErrorKey`, `apiErrorKey` and `buzzBlockerKey` return
`BuiltKey<\`error.${ProtocolErrorCode}\`>` and friends. Both halves earn their
place: the template literal is what lets the caller use the no-values overload,
and `BuiltKey`'s constraint is what fails to compile when `error-code.ts` is
widened before both locales have the string. Do the same for the next enum that
reaches a user, rather than a `switch`.

**The server's `message` field is never rendered.** It is English, written for a
log. The user sees the translation of `code`.

### The two lists that must agree

Adding a locale means editing three places: `LOCALES` in
`packages/protocol/src/locale.ts`, `REACT_ARIA_LOCALES` and `DICTIONARIES` in
`i18n-provider.tsx`, and the `optimizeLocales` array in `vite.config.ts`. The
compiler catches the first two — and `LANGUAGE_NAMES`, and the quiz's
`questionLanguageFor` test, both of which go red on the new member. **It cannot
catch the third**, and the symptom is react-aria's own strings — `FieldError`,
press announcements, live regions — silently falling back to English.

`LOCALES` sits in the protocol rather than in core because `POST /api/rooms`
carries the host's locale: it is a shape both sides agree on. `pickLocale`, which
negotiates one out of `navigator.languages`, is a rule and stayed in core.

### Language names are not translated

`English` / `Français`, in every locale. Someone hunting for their language in a
UI they cannot read has only the word itself to go on. They are not dictionary
keys at all: `LANGUAGE_NAMES` in `presentation/i18n/language-names.ts` is the one
map, keyed by `Locale | QuestionLanguage`, and that union is what makes it a
guard — the interface language and the language a quiz is drawn in are different
settings written in the same words, and neither can gain a member without a name.

## Colours, and the two themes

`_tokens.sass` holds `dark-palette` and `light-palette` as mixins. Every colour a
component uses is a semantic token — `--field`, `--ink`, `--ink-muted`, `--rule`,
`--cut`, `--cut-ink` — defined once in each. **A hex in a component breaks one
theme silently**, because nothing type-checks CSS.

The pair a component reads is only ever `--field` / `--ink`: the phase decides
which of the six they point at, and a component never names a phase. See
`apps/game/DESIGN.md`.

The cascade is:

```sass
\:root                                          // dark, the default
\:root[data-theme='light']                      // an explicit light choice
@media (prefers-color-scheme: light)
  \:root:not([data-theme='dark'])               // the system, resolved in CSS
```

`ThemeProvider` stamps `data-theme` **only for an explicit choice** and removes
it for `system`. That is what keeps the first paint correct: a
JavaScript-decided theme cannot apply until after React mounts, and that gap is
the flash of the wrong ground. Do not "simplify" it into always stamping.

### Adding a colour

Add it to **both** mixins, then check contrast at the size it is actually used —
4.5:1 for body text, and the light palette is where this usually fails because
the muted greys that read well on black are too pale on white.

The `theme-color` meta tags in `index.html` are the same two grounds, keyed by
`prefers-color-scheme`. If `--void` changes, they change.

## Verifying

Neither of these is provable by a type-check. The browser pass covers, at 414 px
and 1920 px:

- both locales, switched **live**, with an error already on screen
- all three theme paths, including no `data-theme` at all
- that a locale or theme switch does **not** remount the socket — it is not in
  the hook's dependencies, and it must stay that way

## Related

- `sass-architecture.md` — layers, the `index.html` cascade order, tokens
- `react-components.md` — `composeClassName`, react-aria props
- `docs/game-catalogue.md` — why `blindtest.*` is the only game-owned namespace
