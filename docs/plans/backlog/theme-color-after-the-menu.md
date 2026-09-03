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
