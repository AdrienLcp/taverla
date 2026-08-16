## 6 · The gap between two rounds — **done, 15 August 2026**

**What shipped**, against what this entry expected:

- **Neither of the two merges this entry offered was possible**, and for a
  reason it had half-seen: `openRound` *replaces* `room.round`, so by the time a
  countdown is on screen the reveal it interrupted is gone from the snapshot
  entirely. Keeping the panel mounted through `countdown` had nothing to mount,
  and `advancesAt` would only have bought a clock on the reveal — not the reveal
  on the countdown, which is what playtest 10 asked for.
- **So the console remembers it.** `useRoundStillBeingTalkedAbout` holds the
  last `revealed` round view and the countdown draws it underneath the number.
  Nothing joins the wire: the server has nothing to say about a round it has
  finished with, and a second round on the room view would have to be kept
  honest through a reload, a takeover and a game change for one screen's sake. A
  console reloading mid-countdown gets the number alone, which is exactly the
  screen this replaced.
- **The field question answered itself once the content was the variable.** The
  merged screen is painted on the **countdown's** own field, because the colour
  is what says a new round is coming and the content is what says what the last
  one was — the two carry different halves of the same moment rather than
  competing. The number gives up the screen it had (42vmin → 18vmin) and keeps
  the size that reaches the far side of a room, and the panel's `card-strike` is
  suppressed there: it struck when the answer landed, and striking again would
  say a second thing had happened.
- **The standings join the reveal**, which is playtest 4 — they were on this
  screen during `playing` only, where nobody is looking at them. **Not on the
  phones**: [17](../17-mid-game-join.md) declined that and this session found no
  reason it did not have.
- Playtest 7's overflow was one screen, not three: `AskedQuestion` and the lie
  board already wrap. The reveal's title and artist come from a catalogue, at
  `monument` size, and `min-width: 0` is only half a fix — a flex item stops
  growing where an unbreakable word does not. A nickname in the said/scored
  lists now ellipsises, because the number at the end of that row is the half
  the room is reading.
- ~~**Still owed, and cheap**: Le Fake's reveal was not driven in a browser, so
  its board *plus* the new standings is unmeasured on a tall room.~~ Measured
  and fixed on 15 August 2026 — see session 6's entry below. It was neither
  cheap nor a detail: the standings were entirely below the fold.

---

> *Playtest 4 — "ce serait pas mal de voir les points de tous les joueurs sur
> l'écran hôte, voire sur tous les écrans à chaque fois qu'on voit le
> classement."*
> *Playtest 7 — "ajoute des ellipsis sur l'écran hôte quand on montre la réponse
> + le décompte jusqu'au prochain round."*
> *Playtest 10 — "fusionner l'écran de décompte et de résultat d'une réponse ?
> Je trouvais ça répétitif — on pourrait afficher le décompte AVEC les résultats
> de la manche d'avant."*

Three notes about the same twenty seconds, which is why they are one session.
The facts it starts from:

- **The full scoreboard is already on the host screen — during `playing` only**
  (`host-console-page.tsx:341`). Not at `revealed`, not at `countdown`, not at
  `buzzed` or `voting`. The reveal shows the round's own `+N` and nothing
  cumulative (`reveal-panel.tsx:93`). So playtest 4 is not "add a scoreboard", it
  is "the one moment the table wants it is the one moment it is missing".
- **Reveal and countdown are two screens, and the countdown wins.**
  `host-console-page.tsx:278-284` returns early on the `countdown` phase, so the
  whole stage becomes one number. Merging them is not a layout question first —
  it is a protocol one: the round view carries `startsAt` only
  (`packages/protocol/src/room.ts:301`), which during `revealed` is the round
  *already played*, and the auto-advance deadline is a server-side timer that is
  never broadcast (`round-conductor.ts:251`). Either a field like `advancesAt`
  joins the round view, or the merge only works the other way round — keep the
  reveal mounted *through* the countdown phase, where `startsAt` is finally the
  right target.
- **Each phase owns a colour** (`_tokens.sass:111-129`), and `DESIGN.md` states
  the phase is the colour. A merged screen has to answer which field it is
  painted on. That is the real design question of the session, and it decides
  whether this is a merge or a reveal that grows a clock.
- Playtest 7's *"ellipsis"* is about the same screens overflowing on long
  content — the reveal and the countdown are where the answer text and the
  nicknames are largest. Session 5 fixes the choice buttons; this one has to
  check `RevealPanel`, `AskedQuestion` and the `lie-board`.
- The player's side of playtest 4 was already argued and declined once, in
  [17](../17-mid-game-join.md): repeating the room's big-screen ranking on every
  phone asks the table to look down at a phone, against the product's first
  principle. If the phones are to show it, it needs a reason that plan did not
  have.

---

