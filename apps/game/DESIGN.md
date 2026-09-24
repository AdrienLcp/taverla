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

Written in `oklch()`, as lightness, chroma and hue — the exact values are in
`_tokens.sass`, and each pair is one `light-dark()` so a token reads as its row
here does.

| Phase | | Dark `L% C H` | Light `L% C H` |
|---|---|---|---|
| `lobby` | burnt orange | `49% .159 36` | `73% .178 43` |
| `countdown` | chrome yellow | `68% .142 76` | `85% .157 84` |
| `playing` | deep teal | `37% .061 184` | `71% .109 181` |
| `buzzed` | oxblood | `41% .155 19` | `67% .191 15` |
| `revealed` | aubergine | `31% .108 322` | `67% .122 320` |
| `finished` | forest | `39% .090 153` | `73% .131 153` |

Two things the hues make checkable rather than asserted. The closest two
consecutive phases are `buzzed` and `revealed`, 57 degrees apart — comfortably
distinct at four metres. And the two palettes are **not** one hue at two
lightnesses: they drift up to 8 degrees, widest on `lobby`. That is the mark of
six pairs picked by eye rather than derived, which is what they were, and it is
only visible at all now the values say their hue out loud. Holding each pair to
one angle is a change to what a room sees, so it is a decision and not a
tidy-up — nobody has made it.

No two consecutive phases share a hue, which is the point: from the far side of
a room you know where the game is before you read a word. The attribute goes on
the **root element** so the field survives an overscroll bounce, and `lobby` is
the token default so a first paint before React mounts is already correct.

**Every colour a component uses is `--field`, `--ink`, `--ink-muted`, `--rule`,
`--edge`, `--cut` or `--cut-ink`.** No component holds a hex.

**One phase borrows a pair rather than owning one.** `voting` falls back to the
lobby's. And one moment borrows a pair without being a phase: the slate writes
and marks inside `playing`, so `useMarkingField` stamps `data-marking` on the
root and `[data-phase='playing'][data-marking]` wears `buzzed`'s pair — the
host judging, the room waiting. The console stamps it while it shows the wall;
a player only once nothing is left to write, because a sheet still being
filled is `playing` and reads the wall in a band above it.

**The flip's swap also works on one element.** The slate's board inverts a
collected item by setting `--field: var(--ink-playing)` and `--ink:
var(--field-playing)` on the cell and mixing `--ink-muted`, `--rule` and
`--edge` again there, since the root's arrive resolved. The button inside
inverts with it for free. It is only right where the field is `playing`'s,
which is the only place the board is drawn.

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

Every field/ink pair clears 4.5:1. The worst is the light `buzzed` pair at
5.65:1, measured over all twelve. `--ink-muted` mixes the ink back toward the
field only as far as 85%, which is where that pair still clears 4.5:1 — 80% does
not.

That mix is `in oklab` rather than `in srgb`, which is where gamma-encoded
interpolation goes muddy at the midpoint and this one is read as text. It is the
one thing the move to `oklch()` changed about what a room sees, and it changed
it for the better: the worst `--ink-muted` pair went from 4.61:1 to 4.81:1 on
the same 85%. Every field and ink value itself round-trips to the hex it
replaced, so the six fields are the same six colours.

**A hairline has two weights, and which one is asked for is the question.** WCAG
1.4.11 asks 3:1 of what identifies a control or its state, and nothing of what
merely separates two regions. `--rule` at 32% is the separator — 1.84:1 on the
worst pair, and that is enough for a line between a scoreboard and the thing
under it. `--edge` at 60% is a control's own boundary, where 3:1 has to hold:
3.19:1 on the same pair, 55% gives 2.90 and does not. It stops well short of
`--ink-muted`, because a shelf of game cards bordered at 85% reads as heavy as
the two doors above it and the front page loses its order — measured on the
page, not argued.

Three borders are `--edge`: the game card on the front door, the menu trigger,
and the volume slider's track. Everything else that draws in `--rule` is a
divider, an inactive control — 1.4.11 exempts those — or a shape whose
information is carried in full ink beside it, which is the segmented strip and
the slider's own fill.

**A bar that is the information is drawn in full ink, moving or not.** The
round's clock fades nothing under `prefers-reduced-motion`: it used to drop to
35%, which put the edge between filled and empty at 1.84:1 — the same number,
in the one place where the mark *is* the reading rather than around it.

An error is **a stamped block**, never tinted text: `--danger` / `--danger-ink`
are the same in both palettes because the contrast that matters is inside the
block. Tinted red text tops out at 4.0:1 against the chrome-yellow field, and
derived-from-ink formulas top out at the same place. For the same reason the
connection dot and the "wrong" verdict are told apart by **shape**, not hue.

## Type

**Archivo**, self-hosted, one variable file, two subsets (latin, latin-ext),
`font-display: swap`, preloaded. Width 125 is the title-card voice; width 100
is for a screen read up close. There is no third register.

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

**And all six are sized at all**, which three of them were not. `body`, `caption`
and `label` were flat `rem`, so a player's lobby on a 1440×900 laptop drew
`Blind test` at 72px over a `TU VAS JOUER À` still at 12 — a ratio of 2.9 on a
phone and 6 on the laptop, in a column that had itself gone from 343px to 828.
That is the phone screenshot enlarged the `screen` mixin refuses one level up,
met from the other side: the column grew and the prose in it did not. Their
floors are the phone's own values, so a viewport whose shorter side is under
750px renders exactly as it did — measured, and not a pixel moves. Their
ceilings are 18, 16 and 14px, reached between vmin 875 and 900, which is where
the column stops widening: the two grow together, and then both stop. What it
costs is 43px of scroll on a lobby already scrolling 167, and nothing at all on
a phone or at 1920.

## Material

Hard edges. `--radius-full` exists for exactly one element — the buzzer, because
it is the one thing in the product that is a physical button. No shadows, no
glass, no gradients. The QR code and the cover art are die-cut blocks (`cut`
mixin) on the field; everything else is drawn with the ink, a `--rule` hairline
between two regions, or an `--edge` one around a control.

Controls are blocks: `filled` inverts the field, `outlined` is ruled in ink,
`underlined` has neither — **and therefore has no block either.** It is the one
variant that takes no height and no inline padding, so it begins at the column
edge the lines around it begin at; a tertiary action drawn as nothing but its
own label has nothing to reserve room for. The box is a mixin the two materials
opt into rather than a rule the root applies, because written as an exclusion it
would be a `min-height: unset` undoing three rules above it, and the next size
added would have to be undone there too. Disabled is **ruled, never dimmed** — fading a filled
block takes its label's contrast with it. A choice strip obeys the same rule the
same way: the selected stamp drops its ink ground and keeps the ink as an inset
edge, which is what lets a host read their settings over a dead socket.

**A strip has two shapes, one row and one column, and nothing between them.**
The segments share the width evenly, so a wrap that leaves rows of unequal
length hands the short row's segments the width the missing ones would have had
— and a stamp four times its neighbours is exactly the shape a *selected* one
has. `Le premier qui buzze` alone across the top of a strip whose real answer
was `Quatre propositions` is the defect, and a phone is where it happens.
`strip.stacks-below($width)` is the escape, and its argument is measured off the
labels in the longer locale rather than taken from a device size. It is a
**container** query, because the same picker is 369px inside the lobby's column
and 900px inside the setup fold at one and the same 1000px viewport. Six other
strips still wrapped this way and take the same escape, each with a threshold
measured on the page in the locale that binds — which is not always French. The
alternative was drawn on the screen and declined: hairlines
around each segment need no thresholds at all, and cost the strip its outer
boundary and its equal columns, which is the die-cut block this whole system is
made of. The thresholds are read off the dictionary, so what makes them safe is
the check that no strip ever holds rows of two different lengths.

**A strip whose count divides has more shapes than two, and uses them.** The
game picker's six stamps are also three by two and two by three, on an
equal-column grid (`strip.tiles-below`) whose cell is the widest label: one row
above 591px, three columns above 368px, two above 246px, then a column. Going
straight from the row to the column drew six stacked stamps in the lobby's
556px column on a 1440px console — the screen the picker is mostly read on.

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
(52px) for the ordinary control, `large` (72px) for a press or a room. Before
`small` existed every secondary action was a 52px block, so every one of them
read as a second primary action. The heights belong to the box, so on
`underlined` a size sets the type and nothing else.

**A control's reason is indented onto its label; a group's is flush.** The
setting panel holds both, and the indent is the only thing that tells them
apart: *You are the only one who knows who is in the room* belongs to one
switch, so it starts where that switch's label starts, one track's width in.
*Pick none and you get every subject* is what the strip above it currently
amounts to, not the description of a control, so it begins at the panel's edge.
Starting the first one there too was what made it read as a stray sentence in
the middle of a column of settings.

**A toggle is the two action materials, never a third.** `ToggleButton` is
outlined off and filled on, which reads from across a room with no new
vocabulary — and for that reason off does not fill in under a pointer the way
an outlined button does, because there that is exactly what *on* looks like.
The slate's tiles use the same pair for *written* and *empty*, and mark the
number in the field with a bar under the tile: focus owns the outline, and the
arrow keys move focus without moving the selection. A **collected** tile is the
third state and is neither material: hatched in `--rule`, drawn in
`--ink-muted`, with a padlock in its corner — out of reach rather than empty.
The console's board says the same three states louder, for four metres:
outlined while open, solid ink once collected, faded to the rule once marked.
A label longer than three glyphs widens every column of the grid at once, so
the tiles stay one size, and ends in an ellipsis; the field above spells it
whole.

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
   the cold load of a route, which is the screen that scanned the QR code
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
description, the button already being aimed at — moves; the typed answer form
shifted 20px on the first judged guess with nothing drawn to explain it.
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
- **Reveal** — `card-strike`, shared by the host panel and the player's screen,
  so the same moment reads the same on both surfaces. **It is on the card and
  never on the screen holding it.** On the player's side it sat on
  `.player-round.centred` — the lobby, the countdown, the reveal, the final
  board and two notices — so a 1.06 scale settling over `slow` moved the whole
  column on every one of them, 877px down to 827 over 450ms, and on the reveal
  it landed under the press that had just answered. A scale is only a strike
  where the thing scaling is an object; on a screen it is a reflow, and it was
  read as one. It belongs to `.outcome`, the block a round pays out, with the
  board beside it still. The other five phases have the field's own colour
  change, which is the authored moment a phase change already has.
- **The round's clock** is a CSS animation whose duration is the server's
  remaining time, on the console and on every player's screen. No React timer,
  and it is the one thing that moves during a round — a bar draining is what
  the phase colour cannot say, which is *how long*.

  It is the exception the rule above allows, and only because it never resettles.
  It drains from the fraction still standing rather than from full, and re-keys
  on every snapshot: a running animation cannot be re-aimed — moving its duration
  rebases what it has already played — so it is restarted from the server's own
  count instead, which is where it had drained to anyway. A player back from a
  locked screen joins the bar where the room is. It is absent while the host is
  away, because the server has the round frozen and a bar draining then would be
  timing nobody.

  **The same bar counts the reveal's hold**, where the wait reaches it as a
  deadline rather than as time already spent and `RevealHold` is where the two
  become the numbers it draws with. One object in one place on each surface —
  the player's sits under the scoreline in both phases, the console's runs the
  full width of the stage under both its columns — because a measure that moved
  when the phase turned would read as a second object arriving. At eight seconds
  nobody needed it; at twenty-five, silence with no clock is a table wondering
  whether the screen is stuck.

  On the console it costs a row of a screen three formulas are dividing, so
  `.stage.revealed` publishes `--hold-bar` and all three subtract it — `0px`
  when there is no hold, which is the same absence the round's bar has under a
  frozen room. And it gives up the component's own 900px ceiling there: that
  ceiling measures a bar inside one column, and across a split stage it read as
  an object stopping short of nothing rather than as the screen counting itself
  down.

`--timing` is an exponential ease-out: things arrive fast and settle, the way a
card flips rather than the way a panel slides.

## Sound

One cue, on one screen. `presentation/audio/buzz-cue.ts` starts two square
oscillators a perfect fifth apart — 294 and 441 Hz — through a 2.4 kHz lowpass
and a 200 ms envelope that reaches its peak in 4 ms and decays from there. That
is the plateau buzzer this page's lineage asks for, and the fifth is what
separates an interruption from a note.

It is **synthesised**, because the repository holds no audio asset and a buzzer
was not worth the first one: the icons are already authored rather than
installed, and an oscillator with an envelope costs no binary, no licence and no
byte to serve. It is armed by the same press that blesses the clip's element —
one gesture, both permissions, neither askable afterwards.

**Its amplitude is the machine's own volume times 0.3**, which is what makes it
checkable without a room: a console at 5% honks at an envelope peak of 0.015 and
one at the stored default of 80% at 0.24. Zero plays nothing at all rather than
playing quietly, so a muted console is silent by the same path a browser under
test is.

**It sounds on the console and nowhere else**, the rule the clip already has.
Eight screens at unknown volumes, staggered by Wi-Fi, is noise rather than a cue.

**Nothing sounds on the reflex race's flip**, and that is the silence worth
writing down. Each device flips against its own estimate of `flipsAt` and its
false start is measured against the same clock, so a honk leaving the console
would have the room pressing to a sound that arrives on one machine's schedule —
and the devices slightly ahead of it would be scored as having gone early. The
flip is a colour and has to stay one. The cue is keyed on a buzz's
`atServerTime`, which a reflex round never has: it is the one game that never
reaches `buzzed`, so the silence is structural rather than remembered.

## Touch

Three patterns, and what tells a thumb which one it is holding is the contrast
between them rather than the length of any one: a 30 ms tick acknowledges the
press, a single 100 ms thud says the floor is yours, and two shorter knocks
(45–65–45) say it went to somebody else. They live together in
`infrastructure/browser.ts` for that reason — a pattern chosen alone is a
pattern chosen against nothing.

**The acknowledgement was already there; the answer is the new half.** A press
is the one thing this product asks of a body and then settles somewhere else:
the race is decided in the fifty milliseconds after the thumb lands, on a
machine that is not this one, and until now the only witness was the screen.
Closing that loop in the channel the press was made in is what the two outcome
patterns are for.

**A refusal is felt only by a screen that entered the race.** Taking the floor
is felt by whoever took it; being beaten, by whoever pressed and was not. A
screen that never pressed is told nothing, because eight of them knocking at
once is the noise the product already refuses to make with sound — and a phone
face-down on a table is audible.

**It reads from the page, not from the screen that took the press.** A reflex
heat ends on its last press, so the snapshot carrying a slow player's own
reaction is already the reveal and the buzzer they pressed is unmounted — which
is exactly the player the answer was for. `useBuzzOutcome` therefore hangs off
`PlayerRound` and the host console page, beside `useBuzzCue`, and not off the
buzzer. The floor is the one case that could have stayed where it is pressed, a
buzz landing the room on `buzzed` and the buzzer being drawn there; it stays
there because that is also where the press state lives.

**Nothing is built on top of it.** `navigator.vibrate` is absent on every iOS
Safari in the room, and silently so, so every one of these says something the
screen says too. A false start is worth the same knock as losing the race, which
is the honest reading: in this game a lockout has exactly one cause, and outside
it a lockout means something else entirely — which is why the outcome checks the
game before it reads the lockout.

## Layout

`layout.stage` for the host, `layout.screen` for the phone (620px, widening to
`$wide-screen` because not every player is on a phone). The buzzer is
`min(78vw, 42vh, 420px)` — three limits, because one leaves it tiny on a wide
screen or taller than a short one.

**900px is one number with three jobs**, and they are the same moment: the
viewport at which a column stops being a narrow one, the ceiling that column
widens to, and where the lobby splits in two. `layout.$wide-screen` is the
source and `--column-wide-max-width` is derived from it, because a media query
cannot read a custom property and two literals drift.

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

  **The failure runs the other way too, and that one reads as deliberate: a
  viewport unit that has stopped saying anything.** The lie board's candidate
  rows were `clamp(1rem, 4.2vw, 1.25rem)` inside a column capped at 620px and
  then at 900 — so the clamp governed between a 381px and a 476px viewport and
  sat on its ceiling at every width above, whatever the list was actually drawn
  in. A constant with two extra terms. The list declares the container and the
  row is `3.6cqi`: the same 16px on a phone, its ceiling at a 556px list.

  **And the container has to be the box the text sits in**, which is one level
  further than that sentence goes. The poster page splits the same invitation
  into two columns, so the unit measured against the invitation was measuring
  twice the box the code is drawn in, and `7T9` landed on one line with `Y` on
  the next — the identical failure, one composition on. `container-type` goes on
  `.code` there. The tell is that both versions *look* deliberate: nothing warns,
  and the type is the right size for a box that is not the one it is in.

  **It is not only type, and a square viewport is where it shows.** The reveal's
  cover was `34vmin` — 306px at 900×900 — inside a panel that is `1.6fr` of a
  split stage and 472px wide there, so the block took two thirds of the row and
  left the answer 121px: eight broken lines, 680px of title, and the stage 502px
  past the bottom of the screen. `vmin` is an axis of the *screen*, and the
  panel stopped being the screen the day the reveal split in two. It is
  `min(34vmin, 32cqi, 320px)` now — the height it may not eat, the share of the
  panel it may not take from the words beside it, and the size the asset
  actually is. The floor went with it: `180px` could never fire above the split,
  and the arm below has one of its own.
- **The fixed menu belongs to the field, not to the corner.** It is pinned to the
  same band, or it sits hundreds of pixels clear of everything it is chrome for.
- **A centred column only clears that corner when the viewport is far wider than
  the column.** The front doors collided with the menu from the narrowest
  viewport up to about 1 200px, so they start *below* it: giving up the width
  instead would cost a narrow column's headline a third of its measure.
- **The corner is one object wide, and what hangs off it hangs downwards.** Two
  headers reserve against that box, so anything laid out *beside* the trigger is
  width taken off the room's own code: the connection alert took the corner from
  97px to 245 and left a 390px header 97px for the code and the round, which is
  not a reservation a header can pay — it drew the two over each other instead.
  A sentence under the trigger costs height the chrome already owns and nothing
  sideways. **And the trigger is measured rather than guessed**, into
  `--menu-width`: its word is translated, and the connection dot inside it is
  present in a room and absent at a front door, so 97px, 77px and a literal are
  three different answers to the same question. It is the same publication a
  reveal panel makes of its own header, one screen up — a `ResizeObserver`
  because the fact is a rendered box rather than a token.

**The page is laid out under the housing, so it pays for its own edges.**
`viewport-fit=cover` is what lets the field bleed into the corners, which is the
whole of a full-bleed title card — and it is also what puts *content* under the
sensor housing and the home indicator until something says otherwise. So
`--layout-padding` comes per side as well, each one the `max()` of the padding
and that edge's inset: `max()` rather than a sum, because portrait wants the
padding and landscape wants the inset, and only the larger of the two is right
at both. The two page mixins and the fixed menu read those and nothing else, so
a component still knows one token. Two things it decided:

- **The bottom reserves against the inset's static ceiling, not its live
  value.** Android's bottom bar retracts on scroll and animates
  `safe-area-inset-bottom` as it goes, so a page sized against it re-lays itself
  out while somebody is reading it.
- **A page-level padding that *replaces* the mixin's has to carry the inset
  itself.** The three front doors start below the menu by setting their own
  `padding-block-start`, which overrides rather than adds — left on the plain
  padding, the menu moved down onto the headline that had not.

**The lobby is two columns and two audiences.** The invitation — code, QR, join
URL — is what the room is reading; the game picker, the roster and the setup are
the host's own. The picker is on the stage rather than in the fold for exactly
as long as it is the decision everyone is waiting on: a room opens with nothing
chosen, and once a round has run it is a setting like the countdown.

**The seat makes the same move for the same reason**, one section down: in the
lobby it is what the launch is refusing for in a room of one, so it sits inside
the roster — under the count that says nobody has arrived, because taking a seat
is joining that list. It takes no rule of its own there, since the roster's last
row already closes on one and a second hairline twenty pixels below it is a band
rather than a boundary. In the fold, where it is a section beside others, it
keeps the rule. What stands in for it when the room owes a verdict — *you judge
the buzzes, so no seat here* — travels with it, or a quiz left on `buzzer` would
explain itself from behind a collapsed disclosure.

Below 900px they stack, and that is where the setup had to learn to fold: eight
strips of settings at the same weight as the QR code turned a title card into a
form, and put the launch below everything. The fold is collapsed at every width,
because the desktop column was the same wall with more room to hide in.

**The reveal is two columns for the same reason the vote is.** A room of ten
writing ten lies measured 2 377px against a 1080px screen, and the standings —
the half the room actually asks for — ended eight hundred pixels below the fold.
Above `$wide-screen` the board takes the wide column and the standings take the
place the question had, each sized by dividing the screen rather than by the sum
of its own type. Below it they stack and the page scrolls, which is what a
narrow screen does anyway.

**A count says a split is wanted; a container says whether there is room for
it.** The final board goes to two columns past eight players, and for a while
that was the whole test — no query of any kind on it. Nine players on a 375px
console split a 328px board into two 140px columns and cut five of the nine
names to three letters, on the one screen whose job is to say who won. The
threshold is **not** read off the room's own names the way a strip's is read off
its labels: a nickname is up to twenty characters and none of them is in a
dictionary. It is what two of the *narrowest single* column need — a 320px
screen gives this board 288px — so two of those plus the gap between them is
624px, and below it the board is one column and the page scrolls.

**And the container has to be the box the table is drawn in, which the board
stopped being the day the name moved beside it.** The board is 1216px wide on a
1280 console whether it splits or not, so measured against the board a room of
nine was dealt into two 220px sub-columns inside a 500px track — the exact
truncation the 624px threshold exists to prevent, one composition on. The
container is `.standings`, and then one query answers all four arms: 500px
beside the name, 1216 with the board to itself, 860 on a stacked 899px window,
358 on a phone.

**`finished` was the one phase with no height budget, and nothing said so.**
Every other stage on the console divides what is left of `100dvh`; this one kept
the row a lobby draws — a 32px numeral on 24px of fixed padding, 72px a row,
nine of them — and ran 269px off a 1280×800 with *Rejouer* half under the fold
and the way back entirely below it. Three things were wrong at once and only
the third is arithmetic. **The footer was running a game that had ended**: the
auto-advance delay and the setup fold act on a round in flight, they cost 158px
of a 302px footer, and both sit behind the button next to them — *back to the
table* lands on the lobby, whose stage is the picker, the roster and the seat.
**The board was the last wide stage still stacking**, so the table divided
whatever the name had not already spent — 237px, nine players, 18px rows —
where beside the name it divides the whole 464 and reads at 46. And the rows'
furniture was fixed padding again, which is the lie board's lesson met a third
time.

**Taking that fold off the footer took the one sentence saying what *Rejouer*
would relaunch.** Its closed summary — `Quiz · Quatre propositions · 10
tournées` — was carrying the fact by accident, and the press it belongs to is
the one that never stops at the lobby: it sends the room straight into a
countdown of the same game, in the same mode, for the same number of rounds. So
the summary is drawn under the button itself, in the register the footer
already keeps for a control's own line, and it is what tells the two exits
apart — anything in it the table wants changed is reached through *Retour à la
table* under it. It costs the budget 23px above the split and 42 below, because
the longest summary the shelf can write — a blind test on film scores, buzzed,
with no round limit — is one line at 899px and two at 390: `21rem` → `23.25rem`
and `20rem` → `21.5rem`. Nine players measure 0 at 1024×768, 1280×800,
1366×768, 1440×900 and 1920×1080, where the old number was already 7 to 9px
short of the footer it was written for.

**A split needs something to put in both halves.** The same board with nobody
scored draws no name and no scoreline, and in two columns it left a 13px label
alone in 676px of field beside a list of names. `:has(.winners)` is the one
predicate: it decides the composition, the header the table subtracts, and
which container the sub-columns are measured in. Which is the same shape the
board already had — `hasAnybodyScored` deciding whether there is a ranking at
all — read one level up.

**The winner's name was a viewport term in a column that had stopped being the
viewport**, and the split is what made that visible: `ZOÉ` was drawn at 104px in
a 676px track it could have filled, while `Wolfgangamadeusmozart` was broken
mid-word at the same size. It is
`min(22vmin, 106cqi / --longest-word-width)` now — the height it may not eat
and the width its longest unbreakable run needs — which is the revealed title's
own pair, on its third surface and with the same constant, because it is the
same face. 22vmin rather than the 13 it had: stacked, every pixel the name
spends is one the rows lose, and beside them the two no longer trade.

**The split is a width question and the budget is a height one**, and for a
while one media query was answering both. Every height formula on the console
sat behind `layout.wide`, so below it a phone and an 899px window got identical
CSS and the reveal grew 94px per player — 47 for their answer and 47 for their
standing — until the launch was under the scoreboard. Stacked is not the same
arithmetic made smaller: above the split the two halves sit side by side and
each divides the whole screen, and stacked they share one column and the screen
pays for both. So the narrow arm has its own chrome (`27rem`, measured at
390×844 the way `31rem` was at 1080) and its own divisors.

It does not make the reveal fit, and it is not asked to: 410px of budget against
a cover, an answer and two lists is content that wants more than twice it. What
it buys is that the type stops growing once the page is already scrolling, which
is the right bargain on a console held in a hand — and the standings, the half
that would otherwise bury the launch, are the one thing every player already has
on their own screen.

Two habits that only fail on the narrow side, and both silently. **A `vmin` is
the width on a portrait screen**, so a `clamp()` whose floor exists to stop
something vanishing on a wide display is the only term that ever fires on a
phone: the cover was drawn at its 180px floor on an 844px screen, for a 250px
thumbnail, in the one composition where height is the axis under pressure. And
**fixed padding is furniture a formula cannot reach** — 12px top and bottom is
24px of a row whatever the type does, which is the lie board's lesson met again
one screen over.

**The player's reveal splits at that same width, for the same reason one screen
down.** Not every player is on a phone, and a laptop is the one screen here with
width to spare and none of the height: the cover, the answer and the payout
filled 800px on their own and left the round's board under the fold. The two
halves are grouped **in the markup** rather than placed from the stylesheet,
because a grid item told to span rows nobody declared resolves back to the first
one — the poster mixin's trap, met a second time and answered the same way.

Two things follow, and both fail *silently* rather than loudly:

- **A size container needs its size imposed from outside, on whichever axis it
  contains.** A grid item under `align-items: center` takes its own height, and
  a stage that gets its height from a chain of `flex: 1` under `min-height`
  settles too late to be queried. Either way `100cqh` resolves to nothing, every
  `clamp()` lands on its floor, and the screen merely looks a little small.
  Nothing warns.

  **The inline axis fails the same way, and that one reads as a decision.** A
  `container-type: inline-size` box is laid out as though it held nothing, so
  wherever it is shrink-to-fit — a flex item in the console footer's centred
  column — its width resolves to **zero** and every query it owns fires at once.
  The auto-advance strip stacked its four segments down a 100px column with
  `Temps avant la tournée suivante` broken over five lines, on a 1440px screen,
  and had been doing it at every width: a strip that has always been a column
  reads as one somebody drew that way. `.setup-fold` beside it escaped only
  because it already carried a width for its own composition. Every
  `strip.stacks-below` caller needs one, and `e2e/strip-rows.spec.ts` now
  refuses a strip whose container measures zero on the narrowest screen — its
  sweep cannot catch it, because the sweep writes a width onto that box before
  it reads anything.
- **`contain: size` contains the overflow too**, so where the content does not
  fit at any legible size it is drawn *through* whatever is under it rather than
  pushing it down — the launch button ran straight across the board at 768px.
  Dividing `100dvh` minus the measured chrome is the less precise instrument and
  the right one: its worst case is a scroll, not a collision.

**The player's lobby splits there too, and it is the same two audiences the
console's lobby has.** What this player is waiting on is the pitch and the
roster; the invitation is the way in for the person beside them, who has no
screen in the room yet. Stacked on a laptop that came to 1 219px of content in
900px of screen — the QR square and every name under the fold — while 570px of
the column sat unused beside a 256px square. The ratio is the console's
inverted, and deliberately: there the invitation takes the *wider* track because
it is what the room reads from four metres, and here nobody reads this screen
but the hand holding it. What it costs is bounded — a square and four characters
— so it takes the narrow track.

Two things that only show once a bounded object is put in a column of its own:

- **A container unit can be dead, and a dead one is a wrong number nobody has
  met yet.** The player's code was `min(clamp(2.5rem, 12vmin, 5rem), 24cqi)`, and
  the container term never fired at any width — measured at seven from 320 to
  1920, the clamp binds at every one. So `24` was never checked against the face,
  where the console had measured `20` and written down why: four `W` in
  `monument` come to 4.78 times their font size, so one line holds `20.9cqi`.
  The split is what made the term live, and it would have made it live *wrong* —
  a 293px column asking for 70px of type and drawing `WW / WW`. This is the
  twin of the viewport unit that has stopped saying anything, one step further
  on: that one was a constant with extra terms, this one is a **guarantee** that
  had never been asked to hold.
- **A spanning item hands its surplus to every row it spans.** The invitation is
  the taller half at any table under nine, and on implicit `auto auto` rows the
  408px it had over the column beside it were shared equally between them — so a
  lobby nobody has joined yet, with a host still choosing, drew one line of pitch
  and then two hundred pixels of nothing before the roster. Declaring
  `auto 1fr` is what names where the surplus goes. It reads as a deliberate
  space, which is what puts it in the same family as the strip that measured
  zero: the grid is doing exactly what it was told, and what it was told was
  nothing.

**A list that carries a container cannot be asked about its own width.** The
vote board's `ul` had declared `container-type` since the day its rows stopped
being sized against the viewport, so the `@container` rule written to split it
in two never fired at any width — and a query that *cannot* match reads exactly
like a threshold nobody reached. The container goes up to the section and the
row takes one of its own, which it owed anyway: split in two, a `cqi` read off
the list measures twice the box the candidate is drawn in. That is the poster's
`.code` and the final board's sub-columns met a third time.

**A player's screen is the console's `finished` one storey down.** Nine players
ran 270px off a 1440×900 there for the reason they ran 269 off a 1280×800 on the
console: a board of short rows kept a single column while the width it needed
sat unused beside it. Which is what moved the split into `Scoreboard` rather
than leaving a copy on each surface — the two callers ask the same question of
the same rows, and only the box differs: `.standings` on the console, the
phase's own section on a player's. A roster does not opt in, because it is read
while it is still growing and nobody reads one downwards.

**Splitting a phase in two only moves the question of which half is taller.**
The player's reveal has divided since the day a laptop had none of the height,
and a room of nine still ran 104px off a 1440×900 afterwards: the board came to
707px beside a payout of 219, so the half nobody had budgeted decided the screen
alone. Every term of its row was fixed — 8px of padding, a 4px gap, a score at a
flat `1.5rem` — and the one clamp in it sat on its floor at every laptop height,
which is fixed furniture met for the third time in one pass and the first where
there was no formula at all to reach it.

Three things it settled, each a rule this world now holds twice over:

- **A numeral takes half a row of nothing unless it is told otherwise.** The
  reset's 1.5 on a score at 1.5rem was the single largest term in a two-line row
  — larger than the name beside it — and the sentence under the name was carrying
  prose leading for a line that can never wrap. Putting the row's furniture in
  `em` and both line-heights at their real job takes a row from 78px to 63 at the
  same size, before any budget exists.
- **A budget below a clamp's floor is the only one that ever fires.** On a phone
  3vmin of a 390px screen is 12px against a floor of 20, and a 768px-tall laptop
  above the split sits on that same floor — so the budget is a `min()` over the
  clamp carrying a floor of its own, which is the question's length term one
  screen over and for the identical reason. It only ever takes size away, so a
  table of four reads exactly as it did.
- **Stacked is not the same arithmetic made smaller, and the payout is what
  changes.** Above the split the board divides the whole screen minus the page's
  chrome; below it the two halves share one column, so what the payout costs
  comes off as well — and the one game whose payout carries a picture costs 147px
  more of it, read off the markup the way the console's reveal panel reads its
  own header rather than asked of the component.

It closes the wide screen and it is not asked to close the narrow one: nine
players measure 0 at every laptop height from 768 up, and a 390×844 phone is
82px short of a payout, nine names and nine sentences — which is the console's
own bargain one storey up, taken for the same reason.

**A buzzer with a question over it splits at the same width, and it is the one
composition where two objects were each sized as though alone.** A clip is the
blind test's stimulus and takes no room; a quiz's is on the screen, so the
circle — `min(78vw, 42vh, 420px)`, sized by the hand — shared 564px with a
question that answered to the viewport alone. Stacked they came to 535 of it and
the page scrolled at every width but one. Above `$wide-screen` the question goes
beside the circle on the reveal's own shares: what you read takes the wide
track, and an object bounded at 420px takes the narrow one. Two things follow
and both are rules this world already holds. The circle takes a `max-width` of
its track, because above the split it sits in a column narrower than `42vh` and
the aspect ratio is what turns that cap back into a height. And stacked, the
circle takes a **fourth** limit the stage publishes — 296px is what the page
keeps for itself at 360×640 and 390×844 alike — because a component says what it
costs and only the stage knows how much there is. It publishes nothing where
there is no question, so the blind test's buzzer is unmoved at every width.

**And the word in a round control is measured against the control.** `BUZZ` is
set in the field's own colour, so a word wider than the ink does not overflow,
it *disappears* — and it was sized against the screen, which had stopped
deciding how big the circle is. It was wrong before the split existed: the dead
buzzer is `30vh` wide, so any screen under 800px tall drew a 226px word in a
210px circle, measured on heights while the lettering in them was not. The
circle declares the container and **the word takes a box of its own, because a
container cannot be asked about its own width** — the vote list's lesson, on an
object rather than a list. `16.9cqi` is the widest share of the diameter this
product already draws, which is the 0.598 a 378px circle at the clamp's own
ceiling gives. That box carries the type mixin again rather than inheriting it,
for the reason a caption under a `monument` number does: `letter-spacing`
inherits as a computed length.

**Two columns is a height argument until it becomes a line-count one.** The vote
list is shorter in two columns at every width — ten rows at 628px against 366 in
two 254px columns — so height alone would say split always. The row says
otherwise: at 254px seven of the ten candidates wrap and the longest runs to
five lines, where at 354px it settles at three and the list bottoms out at 315.
That knee is the threshold, and it is a different question from the one 624px
answers for the final board, where a row cannot wrap at all and truncation is
the whole risk.

**A component says what it costs; a stage says how much there is.** The
invitation is the plainest case and the one with four stages: `RoomInvitation`
owns the stack, the square, the address and its own container, and every stage
answers `--invitation-code-size` and `--invitation-qr-max-width`. The console
reads its code from four metres, the player's lobby from forty centimetres, the
menu's popover is a box 280px wide holding a square scanned off the screen it is
drawn on, and the poster has a wall. One object, four registers, and not one of
them is a variant of the component. The two
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

**The question is the second case, and the one where the floor was the bug.** It
runs from nine characters to a hundred and ninety-two — more than twice the
answer's range — and it was sized at a flat `clamp(1.5rem, 4.5vmin, 3.25rem)`,
so the longest one drew eleven lines and 307px of a 360×640 phone whose whole
budget for a question *and* a buzzer is 344. Archivo at width 125 sets 0.607 of
its font size per character, measured with a `Range` on the rendered node, so
one line holds `164.75cqi` and the three-line term is `494`. What makes this one
different from the answer is which term bound: **on a phone the clamp's floor is
the only term that ever fires** — 4.5vmin of a 360px screen is 16px, so a floor
of 24 drew every question at 24 whatever its length. The length is a `min()`
over the clamp, so it only ever takes size away, and the floor drops to `1rem`
for the questions that reach it. And a count is the whole measurement here where
an answer needs its longest word measured too: a question's longest word is
fourteen characters, and a paragraph of sixty settles on the face's mean.

**And the longest word is the fact the length cannot stand in for.** `Maison-
Blanche` is fourteen characters and seven wide, because a hyphen and a space are
break opportunities where a letter is not — so `--answer-length` sizes a
paragraph and `--longest-word` is the only thing that holds a *word* whole.
`overflow-wrap: anywhere` is the guard against a word leaving its column, and a
guard that fires reads `POC / AHO / NTAS`. Both surfaces reveal the same string
in a column neither of them owns the width of, so the pair travels with the
answer — `helpers/answer-fitting.ts` — rather than being taken twice.

**And the two are counted in different units, because an average is the right
measure of a paragraph and a coin flip on one word.** Fifty letters settle on
the face's mean; eight do not. `monument` averages 0.898 of its own font size
per capital, so the term read `111cqi / n` — and over a fifty-title sample
`ILLINOIS` came in at 0.67 of that mean and `MAMMA` at a fifth over it, which
left the one term that *promises* a whole word keeping the promise fifty-eight
per cent of the time. `WONDERWALL` was drawn as `WONDERWAL / L` in a 509px
column, at the size the formula had picked for it.

So the run is published as a **width** and not a count. `M` and `W` are the two
letters that break the average — every word above the mean in that sample holds
one and every word under two thirds of it holds none — so the pair counts 1.3
and everything else 1. That is what lets the constant stay near the mean while
being the worst case rather than the middle of one: `106cqi` divided by that
width holds every word in the sample on one line, where a flat count would have
needed `91` and cost the answer eighteen per cent of its size instead of four.
`billboard` on the player's screen holds `116cqi`, measured on its own sample,
because that register draws the catalogue's own casing where the console's is
uppercased — a different face of the same family, and `Mamma` at 1.009 is the
word that sets it.

**A second line takes its size from the first, not from the screen.** The artist
under a revealed title is read as one object with it, and only the title knows
how much room its own word needed: sized on `4vmin` alone, `PLK` was drawn at
36px over a `POCAHONTAS` the column had already pushed to 32. It is capped at
0.6 of the answer's size — looser than the 0.41 the two hold wherever the column
is not the binding term, so it is a floor on the hierarchy and never a resize of
it.

**Vertical space is spent on furniture before it is spent on type.** Ten rows of
fixed 12px gap and padding came to 240px of a 548px board, more than the type
they framed — and a formula that only shrinks type cannot reach any of it. Put
the gaps in `em` and a row becomes one multiple of its own size, which is what
makes the divisor mean something. The same arithmetic is why a line carrying
three short things stacked at full width is the expensive shape: who wrote a lie
and who it caught are one row.

## What is out of budget, and stays there

Measured during the pass that assumed the host may be on a phone and the
players on laptops, kept here so nobody measures them a second time. Each one
is content that wants more than the screen at any size a grandparent can read,
which is the bargain every stage on the console already makes.

- **A player's `revealed`** runs 57px off a 1440×700, 82 off a 390×844, 149 at
  the blind test on the same phone, 315 off a 360×640 and 225 off a 899×800
  window. The row is on its hard floor in all of them: a payout, nine names and
  nine sentences do not fit at a legible size.
- **`playing` and `buzzed` on a phone held sideways** (812×375) overflow 137px
  and cannot be closed — a banner, a question, a circle and a line do not fit
  in 375px of height at any size worth drawing.
- **The player's countdown is a viewport term in a column capped at 900px** —
  `clamp(8rem, 42vmin, 32rem)`. At 1600×1300 the `10` is 976px of ink in a
  section of 796, on one line and still on screen. It only fires above 1219px
  of short side, which is why it has not been paid for.
- **The floor's clock with no limit counts up and prints `300`** after five
  minutes, with no unit. The real case is one or two digits, and inside the
  dial three of them fit.
- **The buzzer drops 35px at the moment of the press.** It is a phase change —
  the field turns oxblood on the same frame.
- **The vote list still scrolls 261px on a 390×844** at ten candidates, and the
  vote leaves 38px and 15px over at 1024×768 and 1280×800 — 33 and 14 on the
  final board.
- **The console at `finished` scrolls on the narrow arm** — 16px at 899×800, 37
  at 390×844, 268 at 360×640, and 19 more where the settings line under
  *Rejouer* wraps. The rows are on their hard floor, so the budget has nothing
  left to take.
- **The player's lobby overflows 152px on a 1440×900** at nine players.
- **At 1440 the reconnection alert overlaps the `JoinReminder`'s box** by 5px
  with no ink touching.

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
- **A player gets the room's round as one list, never the console's two
  blocks.** This rule used to read *a receipt, never the board*, and it rested
  on the room's ranking being on the wall — which is often somebody else's
  screen. So the reveal now carries what the round paid everybody and where it
  leaves them, as `RoundBoard`: one row per player, ranked by the round's own
  outcome, with what they said under their own name and what it paid beside it.
  The console draws those as two blocks side by side because it is read across
  a room; folding them into one list is what the same two facts cost at forty
  centimetres. Three asks were declined before this one and every one of them
  was right about the **composition** — what they refused was the room's board
  printed under the answer, and that is still refused. The payout keeps a line
  of its own above the list, drawn whether or not there was one, because a block
  that appears only for the players who gained leaves everybody else inferring
  from an absence — and it is a step smaller than it was, because the row under
  it now says the same number. The place stays in the persistent strip: *2nd of
  6* costs the line the room's size was already spending and is true at every
  phase, not only after one. The gap to the player above went the other way and
  is gone: the board says it by name, by points, and for everybody. What the
  board will not do is draw itself over nothing — before the first point with
  nobody having typed, every column of it is empty and a roster is not a
  reveal.
- **A board ranks only when there is something to rank.** Before the first
  point every player is first on nothing, and a lobby roster printing `1` and
  `0` beside every name says so out loud — while spending on it the width the
  nicknames need. `hasAnybodyScored` is the one predicate: under it the rank and
  score columns are absent rather than empty, the player is told no placing, and
  the final board names nobody. The columns come back at the first point.
- **A state a row carries is a word, and the ink only seconds it.** A seat
  whose screen has gone was `opacity: 0.45` on the whole row, which is the
  contrast floor given away twice over: it takes every glyph in the row under
  4.5:1 on all six fields, and it says nothing whatever to a reader who is not
  looking at it. The name is muted and the state is set beside it in `label`,
  in the cell the name already owns rather than a column of its own — a track
  declared for every row would pay its gap on the rows that have nothing to put
  there, and a track appended only where there is something pushes the score
  column off the alignment the rows above it hold. Which of the two texts
  shrinks is named the same way the reveal names it: the state is atomic and
  the name is what ellipsises, because half a nickname still points at
  somebody.
- **One window, one clock, drawn for everyone waiting it out.** The buzz floor
  is the room's and not the buzzing player's, so `FloorClock` is on every
  screen: the same component read from either end, counting down where the host
  set a limit and up where they judge it themselves. It follows the lines that
  say whose window it is, because a number arriving before the name is a
  countdown to nothing — and it is centred, under the one round object in the
  product. It had sat flush left for as long as it was one player's own clock
  on a screen nobody else read, which is what a fact reaching a second surface
  costs: nothing about it was wrong until somebody else could see it.

  **And the order was right long before the weight was.** That clock is
  `billboard`; the two lines it was told to follow were `caption` in
  `--ink-muted`, so the fact a player does not need was drawn three times the
  size of the one they do — *it is yours, speak* at 16px under a 378px circle,
  on the screen of the person the room is waiting on. A slot that holds a
  control's **reasons** must not also hold the **phase's own line**: three of
  the four messages under the buzzer say why it is dead, which is what muted
  caption is for, and the floor's line is not one of them. It takes the clock's
  register, which is the one the console bills the same fact at.

  Folding it into that slot rather than adding a line is what stopped the room
  being told twice — *someone was faster* and *Bertrand buzzed* were one fact
  twenty pixels apart — and the anonymous half survives exactly where it is not
  a duplicate, which is a buzz whose seat has gone and leaves no nickname to
  name. The height came from the object that had stopped needing it: a buzzer
  nobody can press for the length of the window is no longer sized by the hand,
  the same move `.counting-in` makes one screen up.

  **And then the object it was drawn under became the object it is drawn in.**
  A circle nobody can press is not a button, and it was still setting `BUZZ` in
  the ink reserved for what you cannot do — a control naming an action it
  refuses, which is the one thing on that screen saying something untrue. So
  for the length of the floor the player's buzzer is *swapped* for a **dial**:
  the ring it already had is the window, the number goes in the middle of it,
  and the name stays under it in `billboard`. Three objects become two, the
  circle takes back the size the hand had been sizing it for, and a dead
  control leaves the tab order rather than sitting in it disabled.

  **The ring is the floor, and what is spent of it goes faint.** A window the
  host never set spends nothing, so there is no arc to draw over the track and
  the track *is* the ink: drawn in `--rule` it read as a dial already run out,
  which is the exact opposite of what an untimed floor is, and one shape would
  have meant a thing and its contrary. That is `FloorClock`'s own duality moved
  from the ink to the ring — so the number inside takes **one** register, muting
  being right in a column the console reads and wrong in an object whose only
  content it is.

  It is the round bar's arithmetic on a circle: a CSS animation off the
  server's deadline, re-keyed per snapshot, and `stroke-dashoffset` on a path
  normalised with `pathLength="1"` so the fraction is the geometry. **The ring
  belongs to the buzzer and not to the clock**, which is what leaves the console
  untouched — and what retires the ordering rule above *on the player's screen
  only*. A number arriving before the name is a countdown to nothing when it is
  a bare line in a column; the circle is the context that ordering was standing
  in for. The console still reads it under the name, because it has no circle
  to put it in.

  **The number is sized by the ring and by how much there is to read.** A digit
  of `billboard` sets at 0.785 of its own font size — measured with a `Range` on
  the rendered node, and exactly three times that for three because the figures
  are tabular — so the ring's 89cqi of clear diameter holds `81cqi / n`, and
  `FloorClock` publishes `--reading-length` the way a question publishes its
  own. The `40cqi` ceiling is what two digits come to at that division: without
  it a floor of five seconds is drawn at the size a hundred needs, in a dial
  that never fills. And the headroom the stage publishes drops from `40rem` to
  `34rem`, because the line that used to sit under the circle is now inside it
  — seven widths from 360 to 899 measure 0 on the bank's longest question, and
  320×568 keeps the `7rem` floor's bargain at 48px of scroll where the stack it
  replaced spent 98.
- **Duration references fall back to `0`,** never to a literal, or someone who
  asked for no motion gets motion when a token disappears.

## Related

- [`PRODUCT.md`](PRODUCT.md) — who plays, where, and the constraints that drove
  all of this
- `.claude/rules/sass-architecture.md` — layers, pure vs side-effect modules,
  the two palettes
- `.claude/rules/design-system.md` — wrapping a react-aria primitive
