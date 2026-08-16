## 9 · Arriving cold in a running blind test — **done, 15 August 2026**

**What shipped**, against what this entry expected — which was right about all
of it, including that the premise it inherited was wrong:

- **The console admits it.** `isClipUnheard` is the rule and it lives in core
  with a test, because the fault is invisible from a browser: a silent round is
  *identical* to one that plays. Whenever no gesture has blessed an element on
  this screen and the round serves a clip, the stage carries *Le son ne sort pas
  d'ici.* and one press — during the countdown and during the clip alike.
- **The refused unlock could not have been retried, and now can.** The element
  was stored whether or not `play()` resolved, so the guard on it turned every
  later press into a silent no-op and the tab was mute for the evening. It is
  kept only on success now.
- **The thrown-away rejection had a use after all.** `NotAllowedError` means the
  element is not blessed, so the console disarms and offers the press again;
  `AbortError` is the next `load()` cutting this one short and is ignored, which
  is what the bare `.catch(() => {})` was right about.
- **One thing this entry did not see**: arming mid-round was not enough on its
  own. The phase effect is what loads, seeks and plays, and it read the element
  through a **ref** — so a press during a round changed nothing until the next
  phase turned over. The blessed element is state now and the effect's own
  dependency, which is what makes the press take at once; `canPlay` is derived
  from it rather than kept beside it, because a boolean next to a ref says the
  same thing twice and only one of the two is in the list.
- The seek at the heart of it is `seekTargetMs` in core now, with the rule the
  old inline comparison only implied: **only ever forward**. A clip ahead of the
  round is a rounding error, and yanking it back is audible where letting it run
  is not.
- **Verified muted**, deliberately: the press was driven on a console reloaded
  mid-round, the block appeared and went away. That the clip then *sounds* is
  the one thing a muted browser cannot answer, and it is what the unit test on
  the seek is for.

---

Carried over whole from the previous handoff, and still true.

**The premise "no gesture, so autoplay is blocked" is wrong, and the truth is
worse.** `.play()` is never reached: `audioRef.current` is populated only by
`unlock()`, called only from a press (`host-console-page.tsx:190-194`), and the
phase effect returns early on a null ref (`round-audio.ts:93-97`). A host who
reloads mid-round, pastes `/host/CODE` or restores a tab gets no `src`, no
`load()`, no seek, no `play()` and **no `NotAllowedError`** — the browser is never
asked. Everything else looks normal: `Listening…` renders unconditionally,
`RoundProgress` advances on the server's `roundElapsedMs`, buzzes work, the reveal
lands. **A silent round is visually identical to one that plays.** It recovers on
the next round, because opening one is a press.

`02-host-console.md:58` already requires the opposite, and the seek code at
`round-audio.ts:121-130` — whose comment names this exact case — is unreachable
after a real reload.

Volume is not the lever; `DEFAULT_VOLUME = 0.8` is right. What is missing is a
*gesture*, and the view already holds `audioUrl` and `roundElapsedMs`. The shape:
in `countdown` or `playing` with no audio element, the screen says so and offers
the one press that fixes it — unlock, seek, play. It would be the only screen in
the product that admits to being muted, which is why it starts with
`/impeccable`.

Two smaller faults in the same module: a refused unlock is never retried (the
guard is on the element existing, `round-audio.ts:167`, not on `play()`
resolving, and the element is stored even when the promise rejects, `:180-182` —
so the tab is mute for life), and both `.catch(() => {})` throw away the one thing
worth keeping, whether the rejection was `AbortError` or `NotAllowedError`.
Players are unaffected: audio is the host screen's alone. There is no test on this
hook at all.

---

