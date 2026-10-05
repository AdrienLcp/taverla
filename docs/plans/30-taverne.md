# Stage 30 — Taverne, the tavern on games night

**Proposed, not started, and conditional.** The trigger is Adrien choosing
Taverne after polling people with the shipped stage-29 world (*boîte*, the
board-game shelf) beside the Taverne reference page. **Do not start this stage
without that explicit choice from him** — a plan existing is not a go-ahead, and
neither is any other session saying so.

If it is chosen, this file is the whole brief: it carries the spec, so it still
stands if the reference page is gone.

## What Taverne is

**Thesis.** Taverla is the back room of a village tavern on games night; every
screen is an object on its wall or on its counter. It refuses the party-app
stack of neon cards on near-black, as stage 29 did.

**The room it depicts** is a real village bistrot of today, the night the
tables are pushed together for games — not a medieval inn, not role-play
costume, no tankards, no parchment, no "ye olde". It stays **family-friendly**:
the audience is grandparents and children at the same table as adult friends
(`PRODUCT.md`), so nothing emphasises alcohol. The beer mats and coasters are
café objects carrying colour and shape, never drinks.

**Story.** Walk in, read the code chalked over the bar, scan the coaster, sit
down; the bell decides who speaks, the tally board who wins.

**The name.** It is the obvious theme for a name that comes from *taverne*, and
that is the risk: the line between a room and a costume is thin. Restraint is
the whole direction.

### The reference page

- Local: `.impeccable/directions/taverne.html` (845 lines, **uncommitted**, may
  be gone — `.impeccable/` is never committed).
- Durable copy: https://claude.ai/artifact/Mzu8DmToy9NPthUtCAyseb
- It is a **mock in French**: one self-contained HTML file with the front door
  (1280×760), the player's choice screen (390×844, 812×375, 320×568), the
  console lobby full and empty (1280×720), a blind-test reveal, and a strip of
  the six phases. Its contract is the comment at the top of `<body>`. Its UI
  copy is mock copy, not dictionary entries.

The siblings it was chosen against live beside it: `boite.html` (shipped as
stage 29), `chrono.html`, `embarquement.html`. Seed key `0a5a42fb`.

## The visual spec

Copied from the page so this file stands alone. Values are the page's, verbatim;
contrast was **not** measured on the page (see risks).

### Palettes

Light is **daytime, scrubbed oak** (the terrace by day). Dark is **evening,
oiled walnut**. Tokens absent from the dark block are the same in both — chalk,
slate inks, brass, enamel, mats and coasters are objects, and an object does not
change colour when the lights go down (the same argument stage 29 made for its
paper and tiles).

Light (`:root`):

```css
--room: oklch(0.86 0.035 72);
--room-ink: oklch(0.24 0.045 50);
--room-muted: oklch(0.4 0.05 55);
--room-line: oklch(0.7 0.05 62);
--grain-1: oklch(0.5 0.06 55 / 0.09);
--grain-2: oklch(0.42 0.06 50 / 0.07);
--seam: oklch(0.55 0.06 55 / 0.35);
--wood: oklch(0.79 0.06 68);
--wood-hi: oklch(0.85 0.05 72);
--wood-lo: oklch(0.71 0.065 62);
--wood-ink: oklch(0.24 0.045 50);
--wood-muted: oklch(0.36 0.05 52);
--frame: oklch(0.5 0.07 52);
--frame-hi: oklch(0.62 0.07 60);
--frame-lo: oklch(0.38 0.06 48);
--slate: oklch(0.29 0.02 170);
--slate-hi: oklch(0.34 0.022 170);
--chalk: oklch(0.96 0.008 100);
--chalk-dim: oklch(0.85 0.014 110);
--chalk-yellow: oklch(0.9 0.11 95);
--chalk-pink: oklch(0.83 0.09 12);
--chalk-blue: oklch(0.85 0.07 225);
--chalk-dust: oklch(0.96 0.01 100 / 0.07);
--brass: oklch(0.72 0.12 80);
--brass-hi: oklch(0.88 0.1 90);
--brass-lo: oklch(0.5 0.1 68);
--on-brass: oklch(0.22 0.04 60);
--lamp: oklch(0.98 0.05 90 / 0.55);
--shadow: oklch(0.28 0.05 50 / 0.3);
--enamel: oklch(0.42 0.09 165);
--enamel-hi: oklch(0.52 0.09 165);
--on-enamel: oklch(0.97 0.015 95);
--card: oklch(0.95 0.02 85);
--card-ink: oklch(0.24 0.04 55);
--bezel: oklch(0.2 0.012 60);
--focus: oklch(0.48 0.15 255);

/* answer mats: sang-de-boeuf, green, blue, ochre */
--mat-a: oklch(0.46 0.14 24);
--mat-b: oklch(0.42 0.085 162);
--mat-c: oklch(0.42 0.1 255);
--mat-d: oklch(0.76 0.12 80);
--on-mat: oklch(0.97 0.015 90);
--on-mat-d: oklch(0.22 0.045 55);

/* eight player coasters (named after the mock's players) */
--p-mamie: oklch(0.5 0.15 25);
--p-theo: oklch(0.45 0.11 255);
--p-zoe: oklch(0.78 0.12 88);
--p-bertrand: oklch(0.45 0.085 160);
--p-ines: oklch(0.5 0.13 330);
--p-karim: oklch(0.7 0.13 55);
--p-lulu: oklch(0.8 0.08 15);
--p-wolf: oklch(0.55 0.07 205);
```

Dark (overrides only):

```css
--room: oklch(0.24 0.03 48);
--room-ink: oklch(0.93 0.025 85);
--room-muted: oklch(0.78 0.04 75);
--room-line: oklch(0.36 0.04 50);
--grain-1: oklch(0.12 0.03 40 / 0.22);
--grain-2: oklch(0.45 0.06 60 / 0.08);
--seam: oklch(0.12 0.02 40 / 0.65);
--wood: oklch(0.37 0.06 50);
--wood-hi: oklch(0.43 0.065 55);
--wood-lo: oklch(0.3 0.055 45);
--wood-ink: oklch(0.95 0.02 85);
--wood-muted: oklch(0.82 0.04 75);
--frame: oklch(0.42 0.065 52);
--frame-hi: oklch(0.52 0.07 58);
--frame-lo: oklch(0.28 0.05 45);
--slate: oklch(0.25 0.018 170);
--slate-hi: oklch(0.3 0.02 170);
--lamp: oklch(0.82 0.13 75 / 0.24);
--shadow: oklch(0.08 0.02 40 / 0.6);
--card: oklch(0.92 0.025 82);
--bezel: oklch(0.13 0.01 60);
--focus: oklch(0.88 0.13 92);
```

The pawns are named after mock players; in the build they become `--coaster-1`
… `--coaster-8` in that order (mamie, theo, zoe, bertrand, ines, karim, lulu,
wolf), with the light ones (zoe, karim, lulu, and mat d) taking the dark ink
`--on-mat-d`. `--bezel` only frames the mock's device outlines and is not a
product token.

### Type

| Face | Role | Never |
|---|---|---|
| **Shrikhand** (400) | sign paint: the wordmark on the hanging sign, big headings, the reveal's painted title, points, *X a la main* | body text |
| **Cabin Sketch** (700) | large chalk: the room code, the countdown digit, game names on the *ardoise du jour*, board titles, scores on the tally board | anything under ~30px |
| **Kalam** (400, 700) | small chalk: the category over the question, labels on a slate, game taglines, names and ranks on the tally board, *c'était…* | a question, a choice, an instruction |
| **Bitter** (400–800, italic 400–600) | everything read: the question, the four choices, buttons, names on coasters, form fields, the menu | — |

**Chalk never carries question or choice text**, and never a long line: the
question is chalk-*coloured* Bitter on the slate, 600 weight, a 1px soft glow.
All four faces are on Google Fonts in the mock and must be **self-hosted**
(`public/fonts`, `_fonts.sass`, latin + latin-ext subsets) like stage 29's —
four families is two more than today, so measure the first-paint cost.

### Materials

- **Wood** — `--wood*` with two repeating-gradient grains (1deg / −0.6deg) over
  a top-lit vertical gradient. The page ground is `--room` with plank seams
  every ~160–180px and a **lamp pool** (radial `--lamp`) from the top.
- **Slate** — `--slate` → `--slate-hi` at 160deg, two chalk-dust smudges, an SVG
  `feTurbulence` chalk noise, in a wood frame (`--fw` 6–18px, lit top
  `--frame-hi`, shaded bottom `--frame-lo`), radius 6px, inset shadow.
- **Brass** — the counter's rail (a 12px gradient bar on top of the counter),
  the round menu button, outlined secondary buttons (`inset 0 0 0 3px
  --brass`), the speed bonus `+2`, the pin on the reveal's sleeve, the bell.
- **Enamel plaques** — green `--enamel`, a double inset keyline: the primary
  button (*Créer une salle*, *Ouvrir la première manche*) and the round plaque
  in the player chrome (*Manche 4/10*).
- **Coasters** (round) — a person. Their colour, card noise, a top-left sheen,
  a printed ring at 6% / 7.5% of the size, the initial in Shrikhand. Tilted
  −5° / +4° alternately on the counter.
- **Beer mats** (square, radius 11px) — an answer. A mat colour, a printed
  inset keyline, card noise, and a **card suit** in a disc: heart (a),
  club (b), spade (c), diamond (d), so colour is never the only cue. Hover
  lifts 1px and turns −0.3°.
- **Chalk marks** — a hand-drawn loop (circles the chosen game and the leader),
  a hand-drawn rule under a slate title, tally marks grouped by five with the
  fifth struck across, drawn on with `stroke-dashoffset` (off under reduced
  motion).
- Icons in the mock: a hanging enamel lamp, the counter bell, a stopwatch, a
  menu glyph, the four suits.

### The object map

| Product thing | Taverne object |
|---|---|
| Front door `/:locale` | A **hanging painted sign** on a brass bracket under a lamp (*Taverla*, *Jeux pour toute la tablée*), the two promises below it (*Cinq jeux pour toute la soirée.* as the heading, *On joue en quelques secondes* leading the pitch), the enamel *create* beside a brass-ringed *join with a code* |
| Game picker (front door and lobby) | **L'ardoise du jour** — a slate listing the five games, name in large chalk, tagline in small chalk; the chosen one circled in yellow chalk |
| Room code | Chalked huge on the **big slate over the bar** (172px at 1280×720), *La salle* above, *Scannez le sous-bock, ou tapez le code.* below |
| QR code | Printed on a **round card coaster** leaning on the slate (−6°), ringed in mat-a with *SCANNEZ POUR VOUS ASSEOIR* set round it; the QR stays dark on light in both palettes |
| Players / roster | **Coasters on the counter** — a wood band along the foot of the console, brass rail on top; name under each; *tient la salle* under the host |
| Empty lobby | Three dashed rings on an empty counter, *Personne à table pour l'instant*, the code spelled `K · W · R · H`, a brass *Prendre une place*; the start button disabled with its reason |
| The question | Chalk-coloured Bitter on a **slate**, the category in Kalam over a chalk underline |
| The four choices | **Square beer mats** with a suit each |
| Player chrome | **One line**: enamel round plaque, own coaster + score + *pts*, stopwatch + time, round brass menu button at the end |
| Buzz | The **counter bell**, and the whole room goes brass: *Inès a la main* in sign paint |
| Reveal (blind test) | The **sleeve pinned to the wall** at its 250px (brass pin, −2.5°), *Manche 4/10, c'était…* in Kalam, the title painted in Shrikhand, the artist in Bitter; the scorers' coasters on the counter with what they got and `2 +2` (answer, then the speed bonus in brass) |
| Standings | The **tally board** — a slate, *Le classement*, rank, name, tally marks, score in large chalk, the round's delta in yellow, the leader circled in pink |
| Final board | The tally board with the **winner's name chalked large and circled**, *14 points, bravo !* |

### Phases are read by light

The phase stays legible across a room through **the light and the object on the
wall**, not a field of saturated colour:

| Phase | What the room sees |
|---|---|
| `lobby` | One lamp low (`brightness(0.82)`), the code on the slate |
| `countdown` | The lamps come up; one chalk digit, yellow, on a slate |
| `playing` | Full light: the slate and the mats |
| `buzzed` | The bell rings and the **whole room turns brass** (`--brass` ground, `--on-brass` ink) |
| `revealed` | **Green enamel** ground; the right mat alone at full strength, the others at 25% |
| `finished` | The tally board, the winner circled |

This **repaints the ground** in two phases, which stage 29 deliberately stopped
doing (its phase sets `--phase-ink` for the score track only). It is closer to
the pre-29 world's *the phase is the colour*, kept to two moments.

### Measured fit (the mock, choice screen)

| Viewport | Overflow | Smallest choice |
|---|---|---|
| 390×844, 192-char prompt | 0px | 24.2px |
| 812×375, landscape, slate beside a 2×2 of mats | 0px | 17.8px |
| 320×568, four ~160-char choices | 0px | 14px (the floor) |

Sizes are `k / sqrt(length)` between a floor and a box cap, as stage 29's are:
`--kq: min(71cqi, 33cqh)`, `--capq: min(7.4cqi, 4cqh)` for the prompt, `--kc:
min(34cqi, 16cqh)`, `--capc: min(7cqi, 3.6cqh)` for the mats, floors 15px and
14px; landscape (`aspect-ratio > 1.3`) swaps to `--kq: min(31cqi, 66cqh)`,
`--capq: min(3.4cqi, 7cqh)`, `--kc: min(12cqi, 26cqh)`, `--capc: min(2.4cqi,
5cqh)`. 2×2 mats when lying down or ≥560px wide upright.

### Honest risks

- **Costume.** Every object added is a step toward an RPG inn. Rule for the
  build: an object earns its place by doing a job (the bell *is* the buzz, the
  coaster *is* the person); none is decoration.
- **"L'Ardoise" collides.** The slate game is called *L'Ardoise* in French
  (`slate.name`), and in Taverne *every* question sits on a slate and the
  picker is *l'ardoise du jour*. See the open questions.
- **Contrast is unmeasured.** The mock uses `--brass` as text on `--room` (the
  seat count) — about 0.72 on 0.86 lightness, which will fail 4.5:1 in the
  light palette; use `--brass-lo` there. `--room-muted`, `--chalk-dim` on slate
  and the light mats with `--on-mat` all need `tokens-contrast.test.ts` rows.
  The suit discs owe 3:1 against their mat.
- **Rendering cost.** Grain, chalk noise and lamp pools are layered gradients
  and SVG turbulence filters on every screen; measure paint on a low-end phone
  and keep `background-attachment: fixed` off mobile if it janks.
- **Chalk fonts at small sizes** are hard to read; the type table's *never*
  column is the guard.
- **Not drawn in the mock**: the wall, the reflex race (wait, flip, finishing
  order), the slate game's sheet and marking, the buzzer and typed screens, the
  setup fold, the menu's popover, the countdown's recap, reconnecting and
  refused states. Each is designed in the build from the object map, not
  invented outside it.

## What stays and what changes

**Only presentation changes.** Protocol, server, `packages/core`, every
behaviour, every route and every **i18n key** stay. Copy may be *re-worded*
inside existing keys (both dictionaries); a new key is added only for a string
that did not exist (e.g. a coaster's ring text). The no-scroll contract of
stage 29 §2 and `e2e/choice-fits.spec.ts` stay and are the gate.

**The copy no longer speaks tavern.** On 2026-10-05 the shipped dictionaries were
moved off the tavern vocabulary to match the box world: *l'aubergiste* /
*the innkeeper* became *l'hôte* / *the host*, *la tournée* became *la manche*,
the doors (*pousser la porte*, *walk in*, *pull up a chair*) became *rejoindre* /
*join*, and *lever la table* / *clear the table* became *fermer* / *close*. The
table stays, as the people playing. So the copy this stage wants is part of its
presentation work: re-wording those keys, in both dictionaries and the voice
table of `.claude/rules/i18n.md`, is in scope here — and open question 1 decides
how far it goes.

Stage 29's structural work is kept: `framed.page`, `ChoosingRound`,
`RoundChrome`, the size-container stages, `useFittedGrid`, `answerFitting`, the
`k / sqrt(length)` sizing, `trackInkHolderOf` / `winnersOf` as rules. What is
replaced is the world drawn on top of them.

## Migration map

Mapped against stage 29 **as of 2026-10-04, while it was still moving**. The
first session re-maps every row against stage 29 as shipped before touching a
file; a row that no longer matches is corrected here first.

| Stage-29 seam | Taverne | Kind |
|---|---|---|
| `styles/_tokens.sass` — board, track, chipboard, paper, socket, tiles, spines, pawns, primary, `--phase-ink` | room, wood, frame, slate, chalk, brass, enamel, card, mats, coasters; keep the `light-dark()` pair shape and the `--field` / `--ink` contract; phase rules re-pointed to light (lobby dim, buzzed brass ground, revealed enamel ground) | re-skin + rewrite |
| `styles/_fonts.sass`, `public/fonts/` — Bricolage, Atkinson | Shrikhand, Cabin Sketch, Kalam, Bitter, self-hosted; delete the old two | replace |
| `styles/_piece.sass` (`piece`, `pressable`, `card`) | `wood`, `slate`, `mat`, `coaster`, `enamel`, `brass` materials | replace |
| `styles/_control.sass` (`filled` coral, `outlined` piece) | `filled` = enamel plaque, `outlined` = brass ring | re-skin |
| `styles/_box-lid.sass` | the hanging painted sign (wood, brass keyline, bracket) | replace |
| `features/home/game-spines.tsx` | *l'ardoise du jour* on the front door; a game's own door `/:locale/:game` = the sign with that game chalked under it | replace |
| `components/box-shelf.tsx` (lobby picker) | the same *ardoise du jour*, circled choice — one component for both doors | replace + merge |
| `components/pawn.tsx`, `--pawn-N`, `--on-pawn-N` | `Coaster` (initial in Shrikhand), `--coaster-N` | replace, rename |
| `components/answer-tile.tsx`, `tile-mark.tsx`, `--tile-N`, `--tile-mark-N` | the beer mat and its suit (`SuitMark`: heart, club, spade, diamond) | replace |
| `components/score-track.tsx` (ring, `--track-room`, `--layout-padding`) | **removed**: the tally board carries the standings and the light carries the phase. Every `100dvh - chrome` budget that divides `--track-room` is re-pointed — the riskiest row | remove |
| `trackInkHolderOf` (track takes the floor holder's / winner's colour) | the holder's coaster rings the bell; the winner is circled — the rule stays, its consumer changes | re-consume |
| `components/countdown.tsx` (paper token) | one chalk digit on a slate | re-skin |
| `features/host/playing-stage.tsx`, `printed-choices.tsx`, `answered-pawns.tsx` | the slate, four printed mats, coasters standing for an answer in | re-skin |
| `features/host/reveal-panel.tsx`, `_boxed-standings.sass`, `standings.tsx`, `scoreboard.tsx` | pinned sleeve, painted title, scorers' coasters with `2 +2`; tally board | re-skin + new tally marks |
| `features/host/final-board.tsx` | winner chalked and circled on the tally board | re-skin |
| `features/host/verdict-panel.tsx`, floor clock | bell, brass room, holder's coaster; verdicts as enamel (right) and brass-ring (missed) | re-skin |
| `features/host/lobby-stage.tsx`, `room-invitation.tsx` | big slate with the code, QR coaster, counter of coasters, empty-counter state | re-skin |
| `features/host/reflex-stage.tsx`, `reaction-board.tsx` | not in the mock — design it: likely the lamp going out and coming on as the flip | design |
| `features/host/slate-stages.tsx`, `features/player/slate-sheet.tsx` | not in the mock — and see the *L'Ardoise* question | design |
| `features/player/*` (buzzer, typed, round board) | not in the mock — the bell is the buzzer's obvious object | design |
| `app-menu.tsx` trigger | round brass button | re-skin |
| `index.html` `theme-color` metas, `favicon.svg`, `apple-touch-icon.png`, `og.png` | `--room` in both palettes; a new mark | redraw |
| `apps/game/DESIGN.md` | rewritten for Taverne | rewrite |

## Sessions

Sized one session each; order matters for the first two.

1. **Re-map and the world.** Re-read stage 29 as shipped and correct the map
   above. Run `/impeccable` in its redesign flow with Taverne as the chosen
   direction and the reference page as the target. Tokens (both palettes,
   contrast rows in `tokens-contrast.test.ts`, broken on purpose once), fonts
   self-hosted, materials as partials, `theme-color` metas. Nothing redrawn
   yet beyond what the token swap repaints.
2. **The choice screen**, player and seated host: slate, mats with suits,
   coaster, the one-line chrome. `choice-fits.spec.ts` green over its sixteen
   viewports — this is the stage's hard gate, and it is re-run by every session
   after.
3. **Remove the score track** and re-budget every stage that divided
   `--track-room`; lobby (big slate, QR coaster, counter, empty state) and the
   *ardoise du jour* picker.
4. **The round on the console and wall**: countdown, playing, buzzed (bell,
   brass room), reveal (sleeve, scorers, tally board), final board.
5. **What the mock did not draw**: reflex, the slate game, player buzzer and
   typed screens, the menu, recovery and refused states.
6. **The front door and the finish**: sign, promises, *ardoise du jour*,
   `/:locale/:game`, favicon and `og.png`; `DESIGN.md` rewritten; impeccable's
   finish review; `PRODUCT.md` if the product's voice changed.

## Done means

- Every screen seen in a **real, muted browser** — `taverla:volume = '0'` from
  an init script before the first navigation (`docs/browser-driving.md`) — in
  both palettes and both locales, at the stage-29 viewport set.
- `e2e/choice-fits.spec.ts` green (and broken on purpose once in this world),
  `pnpm validate` green, contrast test green in both palettes.
- No colour outside `_tokens.sass`, no user string outside the dictionaries,
  no Bricolage, Atkinson, pawn, tile or score-track left behind.
- `DESIGN.md` describes Taverne as built; this file and `README.md` updated.

## Open questions for Adrien

1. **Does the word appear?** Should copy ever say *taverne*, *bistrot* or
   *comptoir* to the room (e.g. *Prendre une place au comptoir*), or does the
   world stay purely visual with today's neutral wording?
2. **The slate game's name.** With slates everywhere, does *L'Ardoise* keep its
   name, or does the game get its own object (a paper sheet, a notepad) so the
   word is not doing two jobs?
3. **Card suits on the mats.** They read as playing cards; is that the family
   register he wants, or should the four marks be neutral shapes as in stage 29?
4. **Rollout.** One switch on `main` at the end, as stage 29 did on its own
   branch — or a period where both worlds ship (e.g. a setting) to settle the
   poll with real rooms?
