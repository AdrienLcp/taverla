---
description: Adding a locale — the three lists that must agree, and the one no compiler checks
paths:
  - "packages/protocol/src/locale.ts"
  - "apps/game/src/presentation/i18n/i18n-provider.tsx"
  - "apps/game/src/presentation/i18n/language-names.ts"
  - "apps/game/vite.config.ts"
---

# Locales

A locale is three edits: `LOCALES` in `packages/protocol/src/locale.ts`,
`DICTIONARIES` and `REACT_ARIA_LOCALES` in `i18n-provider.tsx`, and the
`optimizeLocales` array in `vite.config.ts`.

The compiler catches the first two, along with `LANGUAGE_NAMES` and the quiz's
`questionLanguageFor` test. **It cannot catch the third**: `optimizeLocales`
takes BCP-47 tags (`en-US`, `fr-FR`) in a plugin option, and the symptom of a
missing one is react-aria's own strings — `FieldError`, press announcements,
live regions — silently falling back to English.

**Language names are never translated.** `English` / `Français`, the same in
every locale, because someone hunting for their language in a UI they cannot
read has only the word itself to go on. `LANGUAGE_NAMES` is keyed by
`Locale | QuestionLanguage`, which is what makes it a guard: the interface
language and the language a quiz is drawn in are different settings written in
the same words, and neither can gain a member without a name.
