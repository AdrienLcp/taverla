# Strings and colours

Two rules, and they have the same shape: **nothing user-visible is written where
it is used.** A string lives in a dictionary, a colour lives in a palette, and a
component references both by name.

## Strings

`apps/game/src/presentation/i18n/` holds one object per locale. There is no i18n
library, on purpose — this is a few dozen strings with no plural rules worth a
dependency. Add one when dates or gendered agreement appear.

**`dictionary-en.ts` is the reference.** `TranslationKey` is
`keyof typeof EN_DICTIONARY`, and `dictionary-fr.ts` is typed
`Dictionary = Record<TranslationKey, string>` — so a key added to English and
forgotten in French does not compile, and neither does a typo at a call site.

```tsx
const translate = useTranslate()
…
<h1>{translate('player.nickname.title')}</h1>
<p>{translate('player.roomSize', { count: view.players.length })}</p>
```

### Adding a string

1. Add the key to `dictionary-en.ts`. Namespace it: `blindtest.*` is the only
   prefix a single game owns; `join.*`, `host.*`, `player.*`, `error.*`,
   `connection.*` and `preferences.*` are the shell every future game reuses.
2. Add it to `dictionary-fr.ts`. The compiler will insist.
3. `{name}` is interpolated from a `Record<string, string | number>`. A missing
   value renders the placeholder rather than throwing, so it shows up in the
   browser pass.

### Hold a key, never a rendered string

An error stored in state as `translate(…)` output freezes in whatever locale was
active when it was set. Store the key — `{ key, values }` — and translate at
render. `join-page.tsx` does this, and switching locale with an error on screen
is how you check it.

### Enums map to keys through a function

`protocolErrorKey`, `apiErrorKey` and `buzzBlockerKey` return a
`` `error.${ProtocolErrorCode}` ``-shaped literal. That is load-bearing:
widening `error-code.ts` fails to compile until every locale has the string. Do
the same for the next enum that reaches a user, rather than a `switch`.

**The server's `message` field is never rendered.** It is English, written for a
log. The user sees the translation of `code`.

### The two lists that must agree

Adding a locale means editing three places: `LOCALES` in
`packages/core/src/i18n/locale.ts`, `REACT_ARIA_LOCALES` and `DICTIONARIES` in
`i18n-provider.tsx`, and the `optimizeLocales` array in `vite.config.ts`. The
compiler catches the first two. **It cannot catch the third**, and the symptom
is react-aria's own strings — `FieldError`, press announcements, live regions —
silently falling back to English.

### Language names are not translated

`English` / `Français`, in every locale. Someone hunting for their language in a
UI they cannot read has only the word itself to go on.

## Colours, and the two themes

`_tokens.sass` holds `dark-palette` and `light-palette` as mixins. Every colour a
component uses is a semantic token — `--text-muted`, `--accent`, `--surface` —
defined once in each. **A hex in a component breaks one theme silently**, because
nothing type-checks CSS.

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
