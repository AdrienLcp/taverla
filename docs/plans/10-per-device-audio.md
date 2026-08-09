# Stage 10 — Everyone hears it on their own phone

**Goal.** A switch on the host console that sends the clip to every device
instead of only the big screen, for playing at a distance or on headphones.

**Depends on** nothing beyond what is shipped. Small.

## Why it is off by default, and must stay off by default

Twelve phones in one living room playing the same clip a few milliseconds apart
is not a party, it is a mess. The product's rule — *audio only ever plays on the
host screen* — is right for the room it was designed for, and this mode exists
for the two cases it is wrong for: people who are not in the same room, and
people on headphones.

## What it costs, stated plainly

Sending `previewUrl` to players moves an anti-cheat boundary. The URL does not
contain the title or the artist, so nothing is leaked in plain text — but it
does contain the Deezer track id, and a curious player with a console can ask
Deezer what that id is. **That is an acceptable trade for remote play and an
unacceptable one for a room where everyone can see everyone.** Hence a switch,
never a default, and the switch belongs to the host.

## The sync is already built

This is the payoff of the clock handshake. Each device has its own estimated
offset, `audioStartsAt` is a server time, and `millisecondsUntil` already turns
one into the other. `round-audio.ts` on the host does the scheduling — wake
early, spin on `requestAnimationFrame` — and the player needs the same thing.

**Extract it rather than copying it.** It is the same problem on both surfaces
and the second copy will drift from the first.

Two traps that carry over:

- **The autoplay unlock.** The host is blessed inside the press on "start". A
  player has no equivalent gesture at the right moment, so the element must be
  unlocked when they tap "join" — long before there is anything to play.
- **A phone that arrives mid-clip** should seek, not restart. The host uses
  `playbackElapsedMs`; the player view would need it too.

## Work

- `RoomSettings.audioOnPlayers: boolean`, default `false`
- `previewUrl` on the player round view **only when the mode is on**, which the
  role-scoped schemas make explicit rather than incidental
- The shared scheduler, and a volume control on the player screen
- A line on the host switch saying what it does, because "everyone hears it"
  and "everyone hears it slightly out of step" are different promises

## Done when

- Two phones and the host start the same clip within ~100 ms of each other,
  measured on real devices rather than two tabs
- Turning the switch off mid-game silences the phones and leaves the host
  playing
- With the mode off, no player frame contains a preview URL — the stage 01
  transcript assertion still passes untouched
- Verified on a real phone, with headphones

## Out of scope

Per-player volume normalisation, a phone acting as the only speaker.
