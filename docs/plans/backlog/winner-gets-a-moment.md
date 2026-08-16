## 8 · The winner gets a moment — **done, 15 August 2026**

**What shipped**, against what this entry expected:

- **The podium is made of type, not of blocks.** Three rows that differed only
  by a muted numeral now step: the rank numerals run 1.9em, 1.45em, 1.15em down
  to the base, in the ink where the rest stay muted, on rows that are
  baseline-aligned so a taller numeral grows *off* the line the names sit on
  rather than pushing its row about. It is the one podium this world can draw —
  three stacked blocks would be a graphic in a product that has none.
- **Keyed on `data-rank`, never on the row's position.** `Scoreboard` carries
  the rank it was ranked with now, which is what lets two players sharing first
  both wear it while the row under them is third. Styling `nth-child` would have
  made the visual podium contradict the component's own doctrine — *ties are
  named rather than broken* — and it is exactly the kind of lie a room checks.
- **The fireworks are a rule and a strike.** A burst of particles is a costume
  on a product made of hard edges, ink and no shadows; the same *gesture* in
  this material is the name struck the way a second of the countdown is, and a
  3px rule drawn out from the middle underneath it as it settles. The board
  settles under both, one row every 60 ms, which is what makes the three read as
  one moment rather than three.
- `finished` is the phase with no clock, which is the whole reason there is a
  budget: everything above sits inside `prefers-reduced-motion: no-preference`
  and every duration falls back to `0`.
- **Everything this entry asked to keep is kept**: the two-column overflow past
  eight players, the `.tie` and `.nobody` arms, and a single winner whose name
  is twenty characters with nowhere to break.
- **The phone's final board is unchanged**, deliberately: it already tells that
  player where *they* finished, in `monument`, and the podium is what the room's
  screen is for.

---

> *Playtest 8 — "ajouter une petite animation « podium + feu d'artifice » pour le
> gagnant ?"*

`FinalBoard` today is a header — a label, the winners joined by ` · ` at
`clamp(3rem, 13vmin, 11rem)`, the winning score — over the full `Scoreboard`,
splitting into two columns past eight players (`final-board.tsx:16`). **There is
no podium**: first, second and third are three rows differing only by a muted
rank number. And there is **no animation of its own** — only the inherited
`page-enter` and the slow field transition.

Motion is not new here, which makes this cheaper than it sounds: seven keyframes
already exist (`card-strike`, `countdown-strike`, `round-drain`,
`popover-strike`, `connection-pulse`, `spinner-turn`, `page-enter`), every
duration token collapses to `0ms` under `prefers-reduced-motion`, and the reveal
already has a strike shared by both surfaces.

The one doctrine to respect, from `DESIGN.md`: **nothing inside a running round
animates.** `finished` is a terminal phase with no clock, so it is precisely
where the budget for this lives — and the only place in the product where a
celebration would not be competing with a question somebody is trying to read.

The design belongs to `/impeccable`. What this file can say is what the screen
must keep: the two-column overflow past eight players, ties (the label already
has `.tie` and `.nobody` arms), and a single winner whose name is long.

---

