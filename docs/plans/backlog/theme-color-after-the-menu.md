# The browser's own chrome keeps the palette the page left

Change the theme from the menu and the page changes. The bar above it does not.

## What is wrong

`apps/game/index.html` carries two `theme-color` meta tags, each media-scoped to
a system preference:

```html
<meta content="#a8330d" media="(prefers-color-scheme: dark)" name="theme-color" />
<meta content="#ff7a3d" media="(prefers-color-scheme: light)" name="theme-color" />
```

They are the two lobby grounds, hand-copied from `--field-lobby` in each
palette. A phone paints its address bar and its task-switcher card from
whichever one matches, which is why they are there at all: on a phone the
browser's chrome is part of the first viewport.

Nothing ever moves them. `ThemeProvider` writes `data-theme` on the root
element and stops there, so a room that switches to light on a dark phone gets
the light field under a dark bar, and keeps it until the tab is closed.

[Stage 20](../20-critical-css.md) fixed exactly half of this. Its head script
flips the two `media` attributes when a *stored* override is read, before the
first paint — so a reload is right. A change made from the menu, in the session
that makes it, is not.

## What it costs

One preference, and the phone that shows it. On a desktop browser the tags do
nothing at all, which is why this survived a design pass and two playtests: the
screens it is wrong on are the ones nobody drives from.

## Where the fix goes

`ThemeProvider` already owns the moment — `apps/game/src/presentation/theme/theme-provider.tsx`,
the effect that stamps `data-theme`. The same effect can set the tags, and the
`'system'` branch is the one to think about: it must put the `media` attributes
*back*, not pick a colour, or the next system change stops being followed.

The head script and the effect would then say the same thing twice, in two
languages, which is the argument for the third option: give the provider the
whole job and have the script call nothing but a data attribute the CSS reads.
That is bigger than the fault.

## What is settled

- **The hex values stay hand-copied.** `--field-lobby` is an `oklch()` inside a
  `light-dark()` and a meta tag takes neither. The comment in `index.html`
  already says they move together; nothing here changes that.
- **Both tags stay.** Deleting them and setting one from script would leave a
  phone with no colour at all until JavaScript runs, which is the flash this
  repository just spent a stage removing.

## What it did — **4 September 2026**

The tag now says which scheme it is, and one function says what to do about it.

`index.html` gives each `theme-color` meta a `data-scheme` of `light` or
`dark`. `themeColorMediaFor` in `helpers/theme.ts` takes that and the
preference and returns the `media` the tag must carry: `all` when the scheme is
the chosen one, `not all` when it is not, and — the branch this entry called the
hard one — `(prefers-color-scheme: <scheme>)` for `'system'`, which puts the
query back rather than choosing a colour. `ThemeProvider` applies it in the
effect that already stamps `data-theme`.

**The third option was not needed, and the reason is worth keeping.** This entry
argued that a script and an effect saying the same thing in two languages was
the case for moving the whole job into the provider. What made the duplication
safe instead is that neither side knows the pairing: the tag carries its own
scheme, so the head script's four lines and the provider's loop share one fact —
the attribute name — and cannot drift on colours or on which tag is which.

Reading the media query back out of the tag, which is what stage 20 did
(`meta.media.includes(theme)`), is the thing that could not be repaired: the
first override overwrites it, and `'system'` then has nothing to restore.

Verified live in the browser, switching from the menu with no reload:

| Chosen | `data-theme` | tag `dark` | tag `light` |
|---|---|---|---|
| Sombre | `dark` | `all` | `not all` |
| Clair | `light` | `not all` | `all` |
| Système | *(removed)* | `(prefers-color-scheme: dark)` | `(prefers-color-scheme: light)` |

A cold load on `'system'` leaves both queries untouched, so the effect is a
no-op there and the tags never depend on JavaScript having run.
