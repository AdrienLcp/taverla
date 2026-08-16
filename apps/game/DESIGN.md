# Design

Recorded from the built world, not from the intention that preceded it.

## Thesis

**The screen is a title card, not a page.** One saturated field, one idea,
replaced wholesale between phases. It refuses the arrangement every party-game
app ships — near-black ground, one neon accent, rounded cards, soft glows —
which is what this codebase itself looked like before this pass.

Lineage: French television variety title cards, 1972–81.

## The mechanic: the phase is the colour

`usePhaseField` stamps `data-phase` on the root element and `_tokens.sass` maps
it to a `--field` / `--ink` pair. Six phases, six fields:

| Phase | Dark | Light |
|---|---|---|
| `lobby` | burnt orange `#a8330d` | `#ff7a3d` |
| `countdown` | chrome yellow `#c98a00` | `#ffc53d` |
| `playing` | deep teal `#0e4b44` | `#3fb8a6` |
| `buzzed` | oxblood `#8c1027` | `#f2566e` |
| `revealed` | aubergine `#48174f` | `#b77cc4` |
| `finished` | forest `#14532d` | `#5fbf7f` |

No two consecutive phases share a hue, which is the point: from the far side of
a room you know where the game is before you read a word. The attribute goes on
the **root element** so the field survives an overscroll bounce, and `lobby` is
the token default so a first paint before React mounts is already correct.

**Every colour a component uses is `--field`, `--ink`, `--ink-muted`, `--rule`,
`--cut` or `--cut-ink`.** No component holds a hex.

### The one field change that is not a phase

The reflex race needs a stimulus, and `:root[data-flipped]` is it: `--field`
points at `--ink-playing` and `--ink` back at `--field-playing`, so the pair
trades places. There is no seventh colour, both palettes are right by
construction, the contrast is the pair's own reversed — and it is the largest
**luminance** jump either palette holds, which is what the room catches in
peripheral vision from four metres. It is also the mechanic saying its own name.

It sits between `playing` and `buzzed` in `_tokens.sass` deliberately: equal
specificity, so it beats the phase it happens inside and loses to the two that
come after it. `useFlipField` stamps it against this device's own clock offset,
on a frame callback rather than a timeout — the flip has to land on a paint —
and it is held against the moment it flipped for rather than as a bare boolean,
because a pong arrives every few seconds and would otherwise un-flip a screen
mid-heat.

**The screen before it is the only one in the product that never moves.** No
clock, no bar, no tally: anything that ticks during the wait is a way for the
table to count the flip out loud. That is why `roundDurationMsOf` answering
`null` for this game is load-bearing rather than incidental, and why the host's
round actions are absent for the whole heat.

**A console holding a seat is the same screen, not a screen with a buzzer on
it.** The field is the stimulus, so the field takes the press: a full-bleed
control with no ground, no edge and no label of its own, over a stage that is
otherwise unchanged. A round buzzer beside the flip would be a second object on
the one screen allowed to carry a single idea, and the press it answers is the
one the eye is already on. What that console owes itself is one line under the
signal — its own time, or the stamp naming a false start — and the line's height
is held from the empty state, because a row arriving mid-wait would move the
flip under the eyes waiting for it.

### Contrast, measured

Every field/ink pair clears 4.5:1 (worst 5.56). `--ink-muted` mixes the ink back
toward the field only as far as 85%, which is where the worst pair still clears
4.5:1 — 80% does not.

An error is **a stamped block**, never tinted text: `--danger` / `--danger-ink`
are the same in both palettes because the contrast that matters is inside the
block. Tinted red text tops out at 4.0:1 against the chrome-yellow field, and
derived-from-ink formulas top out at the same place. For the same reason the
connection dot and the "wrong" verdict are told apart by **shape**, not hue.

## Type

**Archivo**, self-hosted, one variable file, two subsets (latin, latin-ext),
`font-display: swap`, preloaded. Width 125 is the title-card voice; width 100
is for the phone in a hand. There is no third register.

| Mixin | Used for |
|---|---|
| `monument` | the room code, the countdown, a revealed title. `clamp(3.5rem, 17vmin, 15rem)` |
| `billboard` | who buzzed, the final heading |
| `title` | controls, inputs, list rows |
| `body` / `caption` | prose and secondary lines |
| `label` | the small wide caps that name a control |
| `numeric` | tabular figures, so a score going 9 → 10 does not shift the row |

Sized in `vmin`, not `vw`: the same page is read at forty centimetres on a
laptop and at four metres on a television, and `vw` alone breaks one of them.

## Material

Hard edges. `--radius-full` exists for exactly one element — the buzzer, because
it is the one thing in the product that is a physical button. No shadows, no
glass, no gradients. The QR code and the cover art are die-cut blocks (`cut`
mixin) on the field; everything else is drawn with the ink or a `--rule`
hairline.

Controls are blocks: `filled` inverts the field, `outlined` is ruled in ink,
`underlined` has neither. Disabled is **ruled, never dimmed** — fading a filled
block takes its label's contrast with it. A choice strip obeys the same rule the
same way: the selected stamp drops its ink ground and keeps the ink as an inset
edge, which is what lets a host read their settings over a dead socket.

**A section a reader opens is a ruled row, not a block.** A bordered control
beside the one action on the screen reads as a second one, so `Disclosure`'s
trigger carries no edge of its own — only the rule it shares with every other
section boundary. Its summary line is what makes the fold honest: it names the
values, never a count of them, because a section whose state is invisible is a
section nobody knows to open.

**The edge says control, the ground says which kind.** Three materials, and the
distinction only works because all three carry the same 3px ink edge:

| Material | Ground | Is |
|---|---|---|
| `filled` | ink | the one action on the screen |
| `outlined` | the field | an action of equal standing |
| input | `--cut` paper | something you write on |

Bare paper with no edge belongs to the things you only *look* at — the QR card,
the cover, the reveal panel. An input that borrowed it was the same block as a
filled button with the values swapped, and it was **taller than the button that
submitted it**, which is what made a form read as a stack of slabs. An input is
never taller than its own action.

The fault it overcorrected is worth naming too: **a control never borrows its
look from a rule.** The field was a ruled underline in the weight and ink of the
page's dividers, so it read as a third divider — and taking focus drew a box
around a line.

Three sizes: `small` (40px) for an action that sits *beside* something, `medium`
(52px) for the ordinary control, `large` (72px) for a thumb or a room. Before
`small` existed every secondary action was a 52px block, so every one of them
read as a second primary action.

**A control's reason is indented onto its label; a group's is flush.** The
setting panel holds both, and the indent is the only thing that tells them
apart: *You are the only one who knows who is in the room* belongs to one
switch, so it starts where that switch's label starts, one track's width in.
*Pick none and you get every subject* is what the strip above it currently
amounts to, not the description of a control, so it begins at the panel's edge.
Starting the first one there too was what made it read as a stray sentence in
the middle of a column of settings.

### Icons

There is an icon family, and it is authored rather than installed. Every glyph
is `Icon` — a 24-unit grid, `1.25em`, 3.5 units of stroke, butt caps, miter
joins — which lands the stroke on the stem weight of Archivo 900 beside it. A
library's 2-unit round-capped hairline reads as a different product's UI next
to lettering this heavy, and tuning one to match costs more than drawing the
two or three glyphs this product actually needs.

A glyph never travels alone: it sits beside the word, because a grandparent and
a child are both expected users and a bare icon asks them to already know.

**The mark is the wordmark's initial**, cream on the lobby ground, hard-edged
and square — the one place a `T` stands alone, because a favicon has no room for
a word beside it. It replaced a rounded near-black tile with a neon-pink dot,
which was the prototype's world and had outlived it by a whole design pass. The
share card is the same two colours with the wordmark set in `monument`, rendered
at 1200×630 rather than drawn: it is the type, so it should come from the type.

## Waiting

**A spinner is the last answer, not the first.** Four rungs, and the product
almost always has one of the top three:

1. **Draw what is already known.** The host console's invitation — the code, the
   QR, the address — comes from the address bar and this origin, so it goes up
   before the socket has answered. The room starts reading the code aloud
   instead of watching a field.
2. **Say it in words.** *Taking your seat…* tells a player what is happening;
   a turning square would only say *wait*.
3. **Reserve the box** and let the content arrive. The cover art does this.
4. **A `Loader`** — a turning square and a named line — which earns its place
   only where the other three have nothing to offer. Today that is one screen:
   the cold load of a route, which is the phone that scanned the QR code
   downloading the app on a party's Wi-Fi.

It holds off 250 ms before appearing, because a good connection settles most
waits inside that and a flash is worse than the blank it replaces. It is also
the one piece of **continuous** motion in a system whose rule is one authored
moment per event — which is the other reason its budget is this small. The delay
is not only a flash guard: `Loader` is a `role='status'`, and a live region that
appears already holding its text is a change no screen reader watched happen, so
it mounts empty and fills afterwards.

**A wait is never anonymous.** `Spinner` is geometry the way `Icon` is —
decorative, `aria-hidden`, only ever composed — and `Loader` is the composition
that carries meaning: a **required** label that is the visible line as well as
the accessible name. There is no default and no bare `<Loader />`, for the same
reason a glyph never travels alone, and because a screen that cannot name what
it is waiting for usually should not be waiting visibly at all.

**A pending state must not resize the control.** `Button` renders its spinner
*over* the label rather than in place of it, and the label goes
`color: transparent` instead of disappearing: nothing on the screen moves, and
the button keeps its accessible name while it works. That spinner is
`aria-hidden` — react-aria already announces `isPending`, and a second live
region would say the same thing twice.

**A verdict line above a field reserves its height, and mounts empty.** The two
are one edit and they fix two faults. A row that appears when the server answers
spends a `gap` it had nothing to fill, and everything under it — the field, its
description, the button a thumb is already aiming at — moves; the typed answer
form shifted 20px on the first judged guess with nothing drawn to explain it.
And a `role='status'` that arrives already holding its text is a change no
screen reader watched happen, which is the same reason `Loader` mounts empty
above. Reserve against the tallest member: `.banked` holds 1.75em of `caption`
because a `label` stamp with its padding measures 24.2px, and both sides are rem
so a zoom moves them together.

**A wrong guess is not an error, and the ink says which.** A mode that allows
retries has said so under the field, so what a miss owes is proof the frame
landed, not a warning — `--ink-muted`, the same the reveal panel gives a wrong
answer, never `--danger` and never a stamp. A stamp is a thing you *hold*: the
two cannot appear together because a banked half is worth points and `isMiss` is
a verdict worth none.

## Motion

One authored moment per event, all of it collapsing to nothing under
`prefers-reduced-motion` (verified in the browser: zero animated elements, all
three duration tokens at `0ms`).

- **Arriving on a page** — `page-enter`, eight pixels and a fade on `base`. It
  is carried by the `screen` and `stage` mixins rather than written on each
  root, so the screens cannot drift and the next one inherits it. Deliberately
  quieter than the reveal, which uses scale on `slow`: a navigation must not
  borrow the weight of what a round pays out.

  **Nothing inside a running round animates.** The phase colour and the reveal
  are the moving parts by design, and a screen that resettled on every snapshot
  would read as lag on a surface that is timing people.
- **Countdown** — each second is *struck*: it arrives oversize with open
  tracking and settles. The component re-keys on the value so it restarts every
  tick.
- **Buzz** — the buzzer scales down on press, optimistically, before the server
  answers.
- **Reveal** — `card-strike`, shared by the host panel and the phone, so the
  same moment reads the same on both surfaces.
- **The round's clock** is a CSS animation whose duration is the server's
  remaining time, on the big screen and on every phone. No React timer, and it
  is the one thing that moves during a round — a bar draining is what the phase
  colour cannot say, which is *how long*.

  It is the exception the rule above allows, and only because it never resettles.
  It drains from the fraction still standing rather than from full, and re-keys
  on every snapshot: a running animation cannot be re-aimed — moving its duration
  rebases what it has already played — so it is restarted from the server's own
  count instead, which is where it had drained to anyway. A phone back from a
  locked screen joins the bar where the room is. It is absent while the host is
  away, because the server has the round frozen and a bar draining then would be
  timing nobody.

`--timing` is an exponential ease-out: things arrive fast and settle, the way a
card flips rather than the way a panel slides.

## Layout

`layout.stage` for the host, `layout.screen` for the phone (620px, widening to
`$wide-screen` because not every player is on a phone). The buzzer is
`min(78vw, 42vh, 420px)` — three limits, because one leaves it tiny on a wide
screen or taller than a short one.

**900px is one number with three jobs**, and they are the same moment: the
viewport at which a column stops being a phone's, the ceiling that column widens
to, and where the lobby splits in two. `layout.$wide-screen` is the source and
`--column-wide-max-width` is derived from it, because a media query cannot read
a custom property and two literals drift.

**A front door becomes a poster at `$poster-screen`** — the name and the promise
down one side, everything you can act on down the other, on the lobby's own
`1.35fr / 1fr` because it is the same composition one screen earlier. The second
breakpoint is content-driven rather than a device size: 1200px is where a 72px
headline still falls in three or four lines once the field is split, and below it
two columns are worse than one.

The mixin takes **two children exactly**, `> header` and `> .actions`, and the
grouping is in the markup on purpose. Spanning the header down the rows instead
does not work and fails quietly: with no explicit rows to span, `grid-row: 1 /
-1` resolves back to row one, so the headline shares a row with the first control
and stretches it to a height that depends on how long the tagline is.

**Everything is bounded, including the stage.** Type here is sized in `vmin`, so
it stops growing with the *shorter* axis — past the width the composition needs,
more width is void rather than a bigger title card. On a 21:9 display the
unbounded stage ran the full 3 440px with the QR code pinned to one edge and the
roster to the other. `--stage-max-width` is what a 1920 screen already gave it,
which is the only width it was ever verified at.

Three things follow from that ceiling, and each is a rule of its own:

- **What is sized against the viewport must be sized against its container once
  the container stops being the viewport.** The room code broke onto two lines
  the moment the cap landed — 302px of type in a 928px column — and is `21cqi`
  now, which is what "as large as its column allows" actually says.
- **The fixed menu belongs to the field, not to the corner.** It is pinned to the
  same band, or it sits hundreds of pixels clear of everything it is chrome for.
- **A centred column only clears that corner when the viewport is far wider than
  the column.** The front doors collided with the menu from a phone up to about
  1 200px, so they start *below* it: giving up the width instead would cost a
  phone's headline a third of its measure.

**The lobby is two columns and two audiences.** The invitation — code, QR, join
URL — is what the room is reading; the game picker, the roster and the setup are
the host's own. The picker is on the stage rather than in the fold for exactly
as long as it is the decision everyone is waiting on: a room opens with nothing
chosen, and once a round has run it is a setting like the countdown.
Below 900px they stack, and that is where the setup had to learn to fold: eight
strips of settings at the same weight as the QR code turned a title card into a
form, and put the launch below everything. The fold is collapsed at every width,
because the desktop column was the same wall with more room to hide in.

**The reveal is two columns for the same reason the vote is.** A room of ten
writing ten lies measured 2 377px against a 1080px screen, and the standings —
the half the room actually asks for — ended eight hundred pixels below the fold.
Above `$wide-screen` the board takes the wide column and the standings take the
place the question had, each sized by dividing the screen rather than by the sum
of its own type. Below it they stack and the page scrolls, which is what a phone
does anyway.

Two things follow, and both fail *silently* rather than loudly:

- **A size container needs a height imposed from outside.** A grid item under
  `align-items: center` takes its own height, and a stage that gets its height
  from a chain of `flex: 1` under `min-height` settles too late to be queried.
  Either way `100cqh` resolves to nothing, every `clamp()` lands on its floor,
  and the screen merely looks a little small. Nothing warns.
- **`contain: size` contains the overflow too**, so where the content does not
  fit at any legible size it is drawn *through* whatever is under it rather than
  pushing it down — the launch button ran straight across the board at 768px.
  Dividing `100dvh` minus the measured chrome is the less precise instrument and
  the right one: its worst case is a scroll, not a collision.

**A component says what it costs; a stage says how much there is.** The two
halves of a fitting formula are known in different places, and neither can guess
the other's: the reveal panel knows whether it draws an artist line or a note,
the stage knows the chrome around it and whether a countdown sits on top. So the
panel publishes `--outcome-header` and each stage subtracts it, which is what
let the reveal and the count-in that recaps it share one arithmetic instead of
drifting apart. The budget's default is a number large enough that the clamp
lands on its ceiling, so a phase that sets none is a phase nothing changed for.

**A text of unknown length publishes its length.** The room's screens are sized
against the viewport, which answers *how much space is there* and never *how
much is there to say* — and the catalogue is what decides the second. A quiz
answer runs from one character to 83, so at a fixed `9vmin` the longest one is
six lines and 490px of a 587px screen with nobody listed yet. The component
writes `--answer-length` and the clamp divides by it, the same way a board
writes its line count. The median of nine characters and the 90th percentile of
seventeen both still clamp to the full size: only the last five per cent read
smaller, and they are the ones that could not have been read at all.

**Vertical space is spent on furniture before it is spent on type.** Ten rows of
fixed 12px gap and padding came to 240px of a 548px board, more than the type
they framed — and a formula that only shrinks type cannot reach any of it. Put
the gaps in `em` and a row becomes one multiple of its own size, which is what
makes the divisor mean something. The same arithmetic is why a line carrying
three short things stacked at full width is the expensive shape: who wrote a lie
and who it caught are one row.

## What must not be broken

- **Both palettes, always.** A hex in a component breaks one theme silently;
  nothing type-checks CSS.
- **`@layer reset, tokens, base, components` stays in `index.html`.** A layer's
  position is fixed where its name first appears, so declaring it in a
  stylesheet makes the cascade depend on the module graph. This cost real time
  once already.
- **A framing label goes below the thing it frames, unless it opens a
  sentence.** The default keeps the eye from climbing a label to reach the
  payload. The reveal is the exception, and the copy is what decides it: "it
  was" / "c'était" is an amorce, so it sits above the title and the two read as
  one line. A label that merely *names* what follows ("the answer") would go
  back below. If a locale ever lands whose copula follows the noun — Japanese,
  Korean, Turkish — that is when the order becomes the locale's business, via
  `order` under `:lang()`. Two locales, both amorces, is not that day.
- **Text somebody typed, set at display size, wraps.** A nickname is up to
  twenty characters and nothing makes them breakable: `Wolfgangamadeusmozar` in
  `monument` left the screen and gave the whole page a sideways scrollbar. Any
  surface that sets a nickname, a title or a search in `billboard` or above
  needs `overflow-wrap: anywhere` and a parent that will not grow — a flex
  item's minimum is its content, so `min-width: 0` is half the fix. The
  scoreboard rows solve the same problem the other way, with an ellipsis,
  because a row is a fixed height and a headline is not.
- **A row holding two ellipsised texts names which one shrinks.** Two flex items
  left on `auto` share the shortfall in proportion to their content, so the
  longer one takes the row down with it: `Zoé` was drawn as `Z…` beside a
  fifty-seven-character title, on a line with two hundred and fifty pixels
  going spare. `justify-content: space-between` hides it until the day the row
  overflows, and then it hides nothing. **A name is atomic where a title is
  not** — half a nickname names nobody, half a title still reads — so the name
  is sized on its own text, the payload is `flex: 1`, and the name carries a
  `max-width` so the longest one cannot swallow the payload in turn. The gap
  then goes in `em`: with the payload filling the row it is the only thing left
  holding the two apart.
- **A board ranks only when there is something to rank.** Before the first
  point every player is first on nothing, and a lobby roster printing `1` and
  `0` beside every name says so out loud — while spending on it the width the
  nicknames need. `hasAnybodyScored` is the one predicate: under it the rank and
  score columns are absent rather than empty, the phone is told no placing, and
  the final board names nobody. The columns come back at the first point.
- **Duration references fall back to `0`,** never to a literal, or someone who
  asked for no motion gets motion when a token disappears.

## Related

- [`PRODUCT.md`](PRODUCT.md) — who plays, where, and the constraints that drove
  all of this
- `.claude/rules/sass-architecture.md` — layers, pure vs side-effect modules,
  the two palettes
- `.claude/rules/design-system.md` — wrapping a react-aria primitive
