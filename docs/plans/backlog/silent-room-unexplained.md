## 13 · The room is silent and the console cannot say why — **half done, 16 August 2026; narrowed to one cause, 19 August 2026**

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

## What the second pass found — **19 August 2026**

Three causes were open. Two are now closed without a phone, and the message was
pointing away from the third.

- **The decode question is answered: the silence is fine.** `decodeAudioData`
  accepts the data URI — one channel, eight samples resampled to 48 kHz, 1 ms —
  and `canPlayType('audio/wav; codecs="1"')` answers `probably`. That is
  evidence about a phone in a way a desktop pass usually is not: **Chromium
  decodes PCM WAV in its own process on every platform**, and reaches the
  device's MediaCodec only for compressed formats. So there is no Android
  decoder to fail here, and the alternative this entry left open — blessing a
  real in-DOM `<audio>` — buys nothing it was wanted for. Left undone
  deliberately.
- **What a desktop browser cannot answer, stated so nobody re-runs it.** The
  Playwright Chromium starts with `--autoplay-policy=no-user-gesture-required`,
  so `play()` resolves there whatever a phone would have decided. Every refusal
  on this screen is verified by replacing `HTMLMediaElement.prototype.play`, and
  that is the only way it can be.
- **One candidate is left, and it is a setting rather than an accident.** The
  gesture is real, the resource decodes — so a `NotAllowedError` on that phone
  is most likely the site's own **sound permission**: per-origin, invisible, and
  identical on every press for the rest of the evening. *Le navigateur a
  refusé. Réessaie.* was the one instruction that cannot work against it, which
  is why a console could be pressed all evening.
- **So the copy changed rather than the code.** `blocked` names the permission
  and the way out, `broken` keeps the retry and gains the same way out, and
  `unsupported` completes its ellipsis — all three end on *tiens la table depuis
  un autre écran*, so a screen that cannot be fixed where it stands is told once
  what to do instead of three times what went wrong. Verified at 414 px and
  1920 px, both locales switched live with a refusal already on screen, light
  and dark: two lines on a phone, one on a television, and the stamped block
  reads on the chrome yellow it lands on half the time.

### The one reading that closes this

Open the room on the Android phone from note 6, press *Lancer le son*, and read
the line under the button. It is now the whole diagnosis:

| The line says | What it means | What follows |
|---|---|---|
| *Le navigateur a refusé le son…* | the site's sound permission, or a policy no gesture satisfies | the fix is in the phone, not in this repository — and the message now says so |
| *Cet écran ne sait pas lire l'extrait.* | the decode measured above is wrong for that engine | bless an element with a source it does read; the in-DOM `<audio>` alternative comes back with it |
| *Ça a cassé de notre côté.* | a `DOMException` name nobody predicted | capture the name, then give it its own answer in `clipRefusalFor` |

**Nothing else here is worth changing before that line has been read**, and the
entry stays open for exactly that reason.

---

