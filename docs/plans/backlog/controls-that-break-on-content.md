## 5 · Two controls that break on their content — **done, 15 August 2026**

**What shipped**, against what this entry expected:

- **The answer buttons wrap rather than ellipsise**, which the entry left open
  between its two precedents. The scoreboard ellipsises because a row is a fixed
  height and the name is only being *read*; these four are being **told apart**,
  and the tail is often what does it — `Sunday Bloody Sunday` against
  `Sunday Bloody Sunday - Live`. The box grows: `min-height` was already right,
  what was missing was vertical padding, `white-space: normal` and
  `overflow-wrap: anywhere` for a title with no spaces in it at all.
- **The arrow became a stamp**, not another mark. `.you .nickname` is the ink
  with the field's colour on it — the same block a banked half wears — which is
  the product's own way of saying *this one is yours*, survives all six phase
  fields by *being* the ink rather than a shade of it, and tells itself apart
  from every neighbour without hue. The word travels in the markup now, in
  `visually-hidden`: generated content is read by some screen readers and by
  none of the others, so the old `←` left the row either mislabelled or
  unlabelled depending on who was reading it. Two alternatives were rejected and
  are cheap to switch to — muting every *other* row's name, which makes a board
  about one player, and a thicker rule on the row, which reads as a section
  boundary rather than as a person.
- **The third lever is answered: a hover is painted only where a pointer can
  hover.** `@media (hover: hover) and (pointer: fine)` around the three
  `[data-hovered]` arms, with `[data-pressed]` left unconditional because it is
  the whole of a thumb's feedback. Session 1 could only fix the *cascade* — the
  disabled rule now wins — and this is the other half: a screen with no pointer
  has no business painting a hover at all, whatever react-aria latched.
- **A fault this entry did not know about, found on the way and fixed on
  sight**: the phone's final board printed every nickname as one letter and an
  ellipsis. `.player-round.centred` is `align-items: center`, which shrink-wraps
  a child to its min-content — and a nickname's min-content is *zero*, because
  `overflow: hidden` is what buys it the ellipsis in the first place. The board
  takes the column now. It is session 8's surface and it was broken today.

> *Playtest 6 — "quand le texte dans une proposition est trop long, il déborde
> hors du bouton."*
> *Playtest 12 — "il y a toujours la flèche sur notre pseudo dans la liste des
> joueurs, je ne suis pas fan, tu aurais d'autres idées ?"*

Both are one component each, and both have a precedent in the repo — which is
what makes this an hour rather than an afternoon. **Options belong to the
`/impeccable` pass that opens the session, not to this file.**

The menu's half of the overflow is already done — see session 2 — and what it
settled is worth reading first: a control whose width is a constant rather than
its content's is where `_control.sass`'s `white-space: nowrap` cannot hold. An
answer button is not that; it is as wide as its column. So the decision below is
still open, and the precedent above does not pre-empt it.

**The overflow is real and its cause is shared.** `_control.sass:28` puts
`white-space: nowrap` on *every* control, Button and Link alike, and
`answer-forms.sass:19-43` never lifts it: no `overflow`, no `text-overflow`, no
`overflow-wrap`, and no `min-width: 0` on the `li`. A long track title leaves the
button and takes the layout with it. Two precedents to weigh against each other:
`verdict-panel.sass:49-52` lets one control wrap on purpose (*"the one control in
the product allowed to wrap"*), and `scoreboard.sass:41-43` ellipsises. Note what
`DESIGN.md` requires: any server or typed text at display size must wrap, with
`min-width: 0` on the parent. The same component is rendered on the host console
when the host has taken a seat (`host-console-page.tsx:331`), so whatever is
decided is decided for both screens at once.

**The arrow is one CSS rule.** `scoreboard.sass:57-58`:
`.you .nickname::after { content: ' ←' }`, a literal U+2190, not an icon and not
a translated string. Two constraints for whatever replaces it: the comment above
it states the intent — the mark has to survive whichever of the six phase fields
is painted behind it, which is why it is not a tint — and generated content is
read aloud by some screen readers, so a purely visual replacement needs a
`visually-hidden` equivalent (the class exists, `globals.sass:36`). It is only
ever visible on the player's own phone: the host passes no `youId`.

The third lever from session 1 lands here too — whether a touch-first product
should paint a filled background on `[data-hovered]` at all.

---

