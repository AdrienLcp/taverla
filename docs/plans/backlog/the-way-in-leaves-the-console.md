## The way in leaves the console

The QR code is the host's and nobody else's — two call sites, both under
`features/host/`: the 256px square in `room-invitation.tsx:44` that the lobby
and the cold-load branch draw, and the 64px badge in `join-reminder.tsx:31` that
rides the header through every running phase. The room code is better off than
that and it is easy to miss: it is already on the player's screen at **every**
phase, as `Table {code}` in `player-page.tsx:169` and `:223`, and it survives the
host-away guard because it lives in the page chrome above `<PlayerRound>` rather
than inside it. What it does not do is work. It is `label`-sized and muted
(`player-page.sass:24-28`), it *names* the room where the console's own line
invites, and it is not even selectable — the console gives `.room-code` and
`.join-url` `user-select: text` for exactly the reason a player would want it.

Two holes follow, and only one of them is the phone's:

- **A host on a phone leaves the room with no way in.** PRODUCT.md allows it and
  the reflex race made it ordinary, but then the QR is in one person's hand and
  nobody else's, and the code is on a screen nobody else is reading.
- **The console shows nothing at `finished`.** `host-console-page.tsx:278-280`
  excludes `lobby` and `finished`, and the second exclusion is wrong: the final
  board is precisely when somebody says *on en refait une, j'appelle Marc*.

## What was decided, 5 September 2026

**The QR does not go on the player's round screen.** It is a big-screen
affordance — it exists because a code read at four metres cannot be typed. Phone
to phone the four characters win, which is what an alphabet with no confusable
glyphs is *for*, and scanning another phone's 64px square through glare and
autofocus is the worse of the two. A square beside the buzzer would be a second
object on the one screen allowed to carry a single idea, and it would not beat
the line already there.

So the invitation goes where a player can reach it without leaving the game:

- **The player's lobby carries it in full** — code, square, address. The lobby is
  the one phase where waiting *is* the activity and filling the table is the
  point.
- **The menu carries it everywhere else**, beside `RoomRecovery`: on every screen
  at every phase, behind a popover no thumb aiming at the game can hit. That is
  the placement `AppMenu` already exists to give.
- **The header line becomes selectable**, matching the console.
- **`finished` gets `JoinReminder` back.**

And a third surface, because an event may want to project the invitation and
nothing else: **`/invite/:roomCode`, the invitation alone at poster scale.**

## What that costs: `RoomInvitation` moves

It is already portable in every way but one. It is a `React.FC<{ roomCode }>`
that calls `playUrlFor` and `useTranslate` itself, imports nothing from the host
feature but `CopyButton`, and is rendered from two places including the branch
that draws before the socket has answered. But it **emits no stylesheet**: every
rule for `.invitation`, `.code`, `.room-code`, `.qr`, `.invite` and `.join-url`
is nested under the host stage at `host-console-page.sass:247-307`. Rendered
anywhere else it is unstyled.

Three consumers is what makes it the shell's rather than the host's, so it goes
to `presentation/components/` with a stylesheet of its own — and the split is the
seam DESIGN.md already names: **a component says what it costs; a stage says how
much there is.** The component's sass takes the stack, the gaps, the QR block and
the address line. The *size* stays with each stage:

- the console keeps `min(clamp(4.5rem, 21vmin, 20rem), 21cqi)`, which is that
  column's answer and nothing else's;
- the phone gets a register a phone can hold;
- the poster page gets `vmin` with no ceiling, because it is the one screen in
  the product with nothing else on it.

**Watch the container query.** `21cqi` is measured against
`container-type: inline-size` declared on `.invitation` under the stage. Move the
declaration and the unit silently re-bases — the failure it was written to fix is
in DESIGN.md under the stage ceiling, where the code was 302px of type in a 928px
column and broke across two lines. Nothing warns.

## The poster page

- **Route `/invite/:roomCode`**, with no locale segment: the two room paths
  already carry none (`navigation.ts:36-46`).
- **No socket.** The code comes from the address bar, which is rung 1 of the
  waiting ladder and already what lets the console put the invitation up before
  the first snapshot. An existence check on the `GET /api/rooms/:code` that
  `join-with-code.tsx:68` already calls is worth having — projecting a dead code
  onto a wall is the failure it prevents — but it must not gate the first paint.
- **Three doors, because the machine projecting it is often not the one
  hosting.** The URL alone is the first and it needs nothing else, which is the
  point of taking no socket: a laptop wired to a projector has no room to join.
  The host's menu is the second, and it **must open in a new tab** — a plain
  navigation off the console drops the host socket, and the server cannot tell
  that from a closed tab. This is the `Exits` rule met from a new direction.
- **The third is a code field on the home, and it is safe where the one this
  backlog refuses is not.** Typing a URL by hand on an event laptop is the thing
  the product refuses everywhere else. The refusal in
  [the host's way back](the-hosts-way-back.md) is about the door to
  `/host/:code`, which hands over the room; **this page grants nothing** — no
  seat, no console, no token, no frame sent. It draws what the room is already
  showing on a wall. The two must not be collapsed into one field: the poster
  takes a code and shows it, and that is the whole of its authority.

## Strings

`host.invite.title`, `host.joinLate`, `host.copyCode` and `player.room` all
exist. The first three are about to be read by players and on a page belonging to
neither role, so the `host.` prefix stops being true — the invitation's strings
take a prefix of the shell's own. There is no key for the square itself and
there should not be: both call sites are `aria-hidden` on purpose, and the reason
is written in `room-invitation.tsx`.

## Refused here, so it is not re-proposed

- **A QR on the round screen** — above.
- **A code field on the home that opens the console.** Reaching `/host/:code`
  needs the URL today, which is a soft lock but a real one against a party being
  taken over by whoever read the code off the wall. See
  [the host's way back](the-hosts-way-back.md), which is what makes the lock
  affordable.

## Verifying it

Real browser, muted — `taverla:volume` to `'0'` in an init script before the
first navigation, per `docs/browser-driving.md`. Three screens and one width
each: the player lobby on a phone, the player menu open mid-round, and
`/invite/:code` at projector width.

## What landed, 8 September 2026

All of it, and four things the plan did not say.

**The stylesheet seam held, and the container unit had one more level to it.**
The component declares `container-type` so the pairing the plan warns about
cannot be split, and each stage answers `--invitation-code-size` and
`--invitation-qr-max-width`. That is enough everywhere except the poster, where
the invitation is *two columns*: `28cqi` measured against the whole grid put
`7T9` on one line and `Y` on the next — the console's own 302px fault, one
composition further on. The fix is `container-type: inline-size` on `.code`, so
the unit means the column the code is actually drawn in. **The rule the console
learned is one level short of the truth**: it is not enough to size against a
container rather than the viewport, the container has to be the box the text
sits in. Recorded in `apps/game/DESIGN.md`.

**The badge moved when it came back.** `finished` has no round index, and the
header is `justify-content: space-between` — which hands a lone child the
*start*. So the way in crossed the screen at the exact moment the room is
deciding whether to play another. `margin-inline-start: auto` pins it, and it is
the general fix rather than a `finished` special case.

**The menu's square is 180px, not 256.** In a 320px popover the invitation was
half the menu and pushed language, theme and every exit below the fold. The
square there is scanned at arm's length off the screen it is drawn on — a
console's own big one is on the field behind it — so seven pixels a module is
plenty and the controls get their room back.

**The home's door is a fold, not a third field.** The plan argued the field is
*safe*, and it is; what it did not price is what a third code field costs the
two doors above it. Two fields side by side, one that seats you and one that
projects, is a fork every visitor has to read past for a job almost none of them
have. It is a `Disclosure` under the shelf: a ruled row that names itself, which
is the material this design system already gives a section somebody opens. The
argument the plan won is untouched — the field exists, and it grants nothing.

**Refused a second time, and now for a measured reason**: the poster does not
strip the copy button, though it is useless on a wall. It is one component with
four stages, and forking it on a prop for one of them is the variance this
repository does not invent before there are two cases.

Verified in a browser, muted, at 414px, 1280px, 1920px and 3440px: the console
lobby (unchanged, `21cqi` still resolving to 200.2px on one line), the player
lobby, both menus, `finished`, the home fold, and the poster at four widths with
the code on one line at every one of them. `pnpm validate` green — 498 unit
tests and the three journeys.
