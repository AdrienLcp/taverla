## 13 · The room is silent and the console cannot say why — **half done, 16 August 2026**

> *Note 6 — "quand on lance l'hôte sur téléphone et qu'on fait « jouer aussi
> sous le nom de », on a « le son ne sort pas d'ici ». Mais du coup il sort d'où ?
> On a beau cliquer et augmenter le son du téléphone il n'y a aucun son, alors
> que le timer défile, et que le message reste."*

**The seat is not the cause, and the answer to *il sort d'où ?* is: from that
same phone.** `toHostContent` (`room-view.ts:47-80`) nulls `track` for a seated
host and keeps `audioUrl`, which is the whole point of the two fields being
separate — the schema says so at `packages/protocol/src/room.ts:374-383` and so
does `docs/realtime-protocol.md:163-175`. `useRoundAudio` reads `audioUrl` with
no seat check. A seated host hears the clip and does not see the answer.

`blindtest.audio.silent` — *Le son ne sort pas d'ici.* — is
[session 9](arriving-cold-mid-blind-test.md)'s
autoplay message and predates the seat entirely. It is shown when
`isClipUnheard` reports that **no press has ever blessed an audio element on
this tab**. That it stayed up through repeated presses is the diagnosis: every
press ran, and every press failed.

### The failure is thrown away, in the one branch session 9 did not fix

`round-audio.ts:194-215`:

```ts
      void blessed.play().then(
        () => {
          blessed.pause()
          setAudio(blessed)
        },
        () => {}
      )
```

Session 9's whole lesson was that `.catch(() => {})` discards the one fact worth
having — and it fixed the *playback* branch (`play()` at `:37-43` now separates
`NotAllowedError` from `AbortError`) while leaving the **unlock** branch
swallowing everything. So the console knows the press failed, cannot say why,
and offers the same press again forever. That is exactly what the note
describes, and fixing it is the first thing this session does: **whatever
happens next, the screen has to be able to name the refusal.**

### The candidate underneath, to be confirmed rather than assumed

`unlock()` blesses a constructed `new Audio(SILENCE)` where `SILENCE` is a
one-millisecond 8-bit data-URI WAV (`round-audio.ts:26-27`). That trick exists
because permission attaches to the element and cannot be granted later, when the
preview URL finally arrives — the comment at `:21-25` is right about the
constraint. But a synthetic, undecodable-in-some-engines resource is a plausible
way for `play()` to reject **inside a genuine gesture**, which is otherwise
unusual on Android Chrome. Two alternatives to weigh once the rejection is
actually readable: bless a real `<audio>` element that is in the DOM, or bless
with `muted = true` (always permitted) and unmute on the first real source.

Not the cause, and worth ruling out in one line so nobody chases it: a stored
`taverla:volume` of `0` would make the clip inaudible but would **clear** the
message, since `canPlay` would be true. The message staying is what says the
element was never blessed.

### The documentation that sent this the wrong way

`.claude/CLAUDE.md` said the server *"stops sending it the track"* for a seated
host, which reads as if the audio stopped. Corrected on 16 August 2026 in the
same pass as this entry — it withholds the title and artist and keeps the clip.
Worth knowing that the wrong sentence is what made the note point at the seat.

### How to tell it is done

- A console that fails to arm says which refusal it got, in both locales, rather
  than repeating the same offer.
- A host on a phone takes a seat mid-blind-test and the clip is audible from
  that phone. This is the half no muted browser can answer; the unit-testable
  half is the rejection handling and the seek.

### What it found — **readable, 16 August 2026; the cause still open**

The first half shipped and the second is **not closed**: nothing here proves a
clip comes out of an Android phone, because no browser on this machine can
answer that. What it can now do is *say why it did not*, which is what the next
playtest is for.

- **The gesture was never the problem, and that is worth not re-checking.** Both
  `unlock()` call sites are synchronous inside `onPress`
  (`host-console-page.tsx`), so the press really did reach the browser. Every
  press failing was therefore a refusal, not a lost gesture.
- **The silence is well-formed**, against what this entry assumed. Decoding the
  data URI gives a valid RIFF header — PCM, 8 kHz, 8-bit, eight samples, sizes
  consistent — so "malformed resource" is not the candidate. 8-bit PCM support
  on a given engine still is.
- **The muted-unlock alternative is a trap, and this is the argument against
  it.** A muted element is always allowed to play, so `play()` would resolve
  whatever the policy had decided — and `setAudio` would then mark *armed* a
  screen the browser will refuse the moment it is unmuted. That turns a console
  that says it is silent into one that says nothing at all, which is strictly
  worse. Blessing a real in-DOM `<audio>` remains open and does not change the
  decode question.
- **Three answers, not the browser's list.** `clipRefusalFor` maps a
  `DOMException` name to `blocked` / `unsupported` / `broken`, and `null` for an
  `AbortError` — the one rejection that must stay silent, since the round is the
  server's either way and a message there would apologise for working. It is in
  core, taking the *name* rather than the exception so nothing DOM crosses that
  boundary.
- **The playback branch had the same hole, one refusal wide.** It answered
  `NotAllowedError` alone, so a preview that failed to decode left the console
  silent with `canPlay` still true and nothing said. Both branches now go
  through the same classification.
- The refusal is a **stamped `--danger` block**, not tinted text: it sits on the
  countdown's chrome yellow as often as on the playing teal, and DESIGN.md
  already measured red text there at 4.0:1.

---

