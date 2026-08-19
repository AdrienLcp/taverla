## Edges the page already took

`apps/game/index.html:5` declares `viewport-fit=cover`. A grep over the whole
repository finds **zero `env(` and zero `safe-area`** — in any `.sass`, `.css`,
`.tsx` or `.html`. Half a contract is signed.

`cover` does exactly one thing: it switches off the browser's own letterboxing
and lays the page out to the full screen, under the sensor housing, the rounded
corners and the home indicator. WebKit's own description of a page that stops
there is that *some of the page's content is obscured by the device's sensor
housing, and the bottom navigation bar is very hard to use*. Backgrounds
bleeding to the edge is the whole point; the cost is that every piece of
**content** now needs padding it did not need before, and nothing here pays it.

## What it costs, measured on the committed tokens

`--layout-padding: clamp(16px, 4vmin, 56px)` (`_tokens.sass:84`). On a 393 px
phone in portrait, `4vmin` is 15.7 px, so it clamps to **16 px**.
`safe-area-inset-top` on a Dynamic Island phone is **59 px**.

- **`AppMenu` sits 43 px inside the status bar.** It is the only
  `position: fixed` element in the app (`app-menu.sass:5-15`), pinned at
  `inset-block-start: var(--layout-padding)`. It is also the only way to reach
  the three exits mid-round, so it is the worst element in the product to hide
  under a clock.
- **Landscape is worse, because the insets go horizontal.** One side loses
  59 px to the housing, whichever way the phone is turned, and
  `inset-inline-end: max(var(--layout-padding), calc(50% - var(--stage-max-width) / 2 + var(--layout-padding)))`
  falls back to the same 16 px: below 1800 px the second term is negative, so
  the `max()` that exists for the 21:9 case does nothing here.
- **The bottom row sits on the home indicator.** `#root { min-height: 100dvh }`
  (`globals.sass:9-16`) with `.player-page.playing { justify-content: space-between }`
  (`player-page.sass:59-71`) puts the last thing on the page against the bottom
  edge. The indicator does not merely overlap it — it **eats the swipe**. On the
  screen that holds the buzzer and the answer form.

## The shape

**`max()` per side, never a bare `env()`.** Portrait needs the padding and
landscape needs the inset, and only the `max()` of the two is right at both
orientations — this is WebKit's own prescription, not a defensive habit. It
belongs in `_tokens.sass` beside `--layout-padding` rather than at each call
site, so a component keeps reading one token.

**Anything anchored to the bottom grows with `safe-area-max-inset-bottom` and
is pulled down by `safe-area-inset-bottom`.** The pair exists because on Android
Chrome the live inset **animates**: a page that has not opted in gets a dynamic
bottom bar — the *chin* — and `safe-area-inset-bottom` updates as it retracts on
scroll. Sizing an element against the live value thrashes its layout on every
scroll; the max is the static ceiling to reserve against.

Android differs from iOS in a second way worth knowing before testing: since
Chrome 135 the viewport may extend into the gesture navigation bar, so
`safe-area-inset-bottom` can be non-zero there **without** `viewport-fit=cover`.
Whether the top cutout behaves the same is undocumented — do not assume it.

## Two adjacent things that look like they belong here and do not

- **Do not set `interactive-widget` in the viewport meta.** Its
  `resizes-content` value makes the on-screen keyboard resize the *layout*
  viewport, which re-computes every viewport unit — and the stages are built on
  `calc(100dvh - chrome)` arithmetic (`DESIGN.md`, *Layout*). Setting it would
  re-run all of it while somebody types an answer against a draining clock. The
  default, `resizes-visual`, is what this layout wants. Safari iOS honours none
  of the three regardless.
- **Do not reach for `env(keyboard-inset-*)`.** It requires
  `navigator.virtualKeyboard.overlaysContent = true`, which is Chromium-only —
  no Safari, no Firefox, and the WebKit bug has been open since 2021. The
  existing answer is better because it is universal: `enterKeyHint='send'`,
  documented in `text-field.tsx:20-26` — *that key is then the whole submit
  affordance, and the button below it can be under the keyboard without costing
  anyone the round.*

## What this session cannot verify itself

The 43 px above is arithmetic on committed tokens, not a screenshot. Chromium's
device emulation does **not** synthesise safe-area insets, and this machine has
no Safari, so no amount of driving the browser will show the fault or prove the
fix. Verify the arithmetic and the fallback behaviour in a browser as
`docs/browser-driving.md` prescribes — insets resolve to `0` there, so every
`max()` must still produce today's layout unchanged — and treat the notched-phone
confirmation as a separate, later moment.

## The rest of the catalogue, so nobody re-opens it

There are nineteen scalar environment variables and six indexed ones, and that
is all of them; `scrollbar-inline-size` does not exist in either the spec or on
MDN. Of the six families, three are answered above and three are settled:

- **`titlebar-area-*`** needs an installed desktop PWA declaring
  `window-controls-overlay`. There is no manifest here and *nothing is
  installed* is a product principle. No.
- **`viewport-segment-*`**, indexed `(x, y)`, needs a foldable with a hinge
  crossing the viewport. No.
- **`preferred-text-scale`** is the one worth a look later, and it is not this
  session. All type is sized in `vmin` / `cqi`, which is right — the same page
  is read at forty centimetres and at four metres — but a purely viewport-driven
  scale **ignores the reader's OS text-size preference entirely**, and
  `PRODUCT.md` makes a grandparent an expected user whose needs set the type
  floor. This variable is the only thing that answers it. Its support is
  unstated on both MDN and the spec, so it would be progressive enhancement
  behind `env(preferred-text-scale, 1)`, never an assumption.
