## 11 · The field the whole game is typed into — **done, 16 August 2026**

> *Note 1 — "autofocus dans l'input quand « on tape » ce serait pratique plutôt
> que de devoir taper dans l'input avant de taper sur le clavier. En plus, sur
> android, ça crée un décalage et il faut scroller après avoir ouvert le clavier
> pour accéder au bouton « envoyer »."*
> *Note 4 — "quand on donne une réponse dans « on tape » qui n'est pas bonne, y a
> un petit décalage qui se crée dans la UI, verticalement. Mais rien n'apparaît
> de visible."*

One component, `TypedAnswer` (`answer-forms.tsx:144-199`), and three faults on
it. It is the surface a whole quiz or blind test is played through, which is why
this is first.

### Note 4 is an empty paragraph, and it is exact

`bankedHalves` (`helpers/round-content.ts:84-86`) returns the verdict for **any**
`kind === 'halves'` verdict — including `{ titleCorrect: false, artistCorrect:
false }`. So from the first guess onward, right *or* wrong, `Banked`
(`answer-forms.tsx:207-226`) stops returning `null` and mounts

```tsx
<p className='banked' role='status'>{/* both halves false: nothing */}</p>
```

An empty flex child has no height and still spends one `gap: var(--space-m)` of
the column (`answer-forms.sass:4-9`) — **20px of downward shift with nothing to
show for it**, which is the note word for word. `.status` beside it already
reserves `min-height: 2.5em` (`answer-forms.sass:11-17`); `.banked` reserves
nothing.

In the quiz the verdict is `{ kind: 'single', isCorrect: false }`, so `Banked`
stays `null` and **nothing at all happens**: the text vanishes and no word
anywhere says it was wrong. The description under the field still reads *As many
goes as you like*, and `AnswerStatus` shows a room-wide count. The host console
holds what the player said and whether it was right (`reveal-panel.tsx:128-145`,
`round.revealedAnswers`); the player's own screen never reads it.

So the fix is two things, not one: stop mounting the empty paragraph, **and**
decide what a wrong guess says. A wrong guess in a mode that allows retries is
not an error state — it is *not yet*, and the register matters.

### Note 1 is three missing lines and one layout that cannot hold

- **No `autoFocus` exists anywhere in `apps/game/src`**, and no `.focus()`, and
  no ref. `TextFieldProps` extends react-aria's, so the prop is available and
  simply never passed. `key={round.id}` (`player-round.tsx:229-241`) remounts
  the form every round, so every round starts with the field cold.
- **No global key handler either** — the only `addEventListener` calls in the
  SPA are the socket's. A laptop player must click into the field before any
  keystroke goes anywhere.
- **The Android displacement is real and has a cheaper fix than scrolling.**
  The submit button is inside the `<Form>`, below the field, at `size='large'` =
  72px (`_control.sass:44-47`); there is **no `visualViewport` handling in the
  repo at all**, and `.answer-form { flex: 1; justify-content: center }` re-centres
  the form in the shrunken viewport, which pushes the button under the keyboard
  with nothing to scroll it back. **`enterKeyHint='send'` on the input is the
  answer**: a single-field form already submits on Enter, so the keyboard's own
  action key becomes the send button and the one under the keyboard stops
  mattering. `visualViewport` work, if any, comes after that and is measured
  against it.
- Not a problem, and worth not chasing: the input is ≥16px
  (`_typography.sass:26-31`), so there is no iOS zoom-on-focus.

### The design question, which is the reason this starts with `/impeccable`

**Autofocus opens the keyboard, and the keyboard eats half a phone.** In the
quiz that is right — the question is on the big screen and the phone is a
keyboard. In the **blind test** the first seconds are for *listening*, and a
keyboard covering the screen from the countdown onward is a worse round than one
tap. Focusing at `playing` rather than at `countdown`, or per game, or per mode,
is the call — and it is a composition question, not a prop.

**It had already been made.** `player-round.tsx` renders the countdown and the
form from two different branches, so `TypedAnswer` only ever mounts on
`playing` — there was no keyboard-over-the-countdown case to design away, and a
bare `autoFocus` is the whole of it. The question was real and the answer was
sitting in the composition, which is the argument for reading the phase gate
before reaching for a prop.

### How to tell it is done

- A wrong guess in the blind test moves nothing; a wrong guess in the quiz says
  something, in both locales.
- On a real Android phone, the field is focused and the keyboard's action key
  sends. Nothing has to be scrolled.
- On a laptop, the round opens and typing lands in the field.

### What it found — **done, 16 August 2026**

- **The empty paragraph and a live region nobody heard were one bug.** `.banked`
  now mounts on every round and holds its height, which stops the shift *and*
  gives the `role='status'` an empty region to change — a status that arrives
  already holding its text is a change no screen reader watched happen, the same
  rule `Loader` was built on. Measured rather than eyeballed: the field and the
  send button sit at the same subpixel before and after a judged guess, empty,
  missed, and stamped, at 414px and 1920px.
- **The predicate already existed.** `isMiss` — a verdict worth no points — is
  exactly *nothing landed*, and it is what makes a stamp and a miss mutually
  exclusive rather than a case to handle: a banked half is worth points.
- **A miss is muted ink, never `--danger`.** The field is still open and the line
  under it still says *as many goes as you like*, so what the row owes is proof
  the frame landed, not a warning. `round.answer.missed` is the shell's, since
  every typed game misses the same way.
- **`enterKeyHint` is not in react-aria's types**, so it goes on the `Input`
  inside `TextField` the way `autoCapitalize` does. Le Fake's lie form is the
  same field above the same button and took it too.
- `bankedSingle` in `helpers/round-content.ts` has no callers and did not gain
  one here. Left alone rather than folded into this diff.

---

