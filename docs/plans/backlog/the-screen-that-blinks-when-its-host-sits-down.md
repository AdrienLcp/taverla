# The screen that blinks when its host sits down

Adrien, playing a room solo on a phone as host and player at once: pressing
`Prendre place` flashes the whole console before the lobby comes back.

## What is certainly true

The seat is claimed through the `hello`, so taking one means opening a new
socket. `useRoomSocket`'s effect carries `nickname` in its dependency array
(`apps/game/src/infrastructure/messaging/use-room-socket.ts:265`) and its
cleanup closes the socket, so `takeSeat` → `setSeatNickname` → **the connection
is torn down and reopened**. That much is read straight off the code.

## What is not true, and was written down as though it were

The first diagnosis said the console falls back to its cold-load branch while
the socket cycles, and that the entire lobby is replaced. It does not.
`useHostConnection` holds the room view in its own state and writes it only when
a frame arrives — `apps/game/src/infrastructure/messaging/use-host-connection.ts:25-33`
— and nothing clears it on a close. The hook instance survives, because
`seatNickname` is state in `HostConsole` rather than a key on it, so nothing
remounts. `Stage`'s `view === null` branch is therefore never reached, and what
the screen draws during the cycle is the last snapshot it had.

**So start by reproducing it**, with the DOM under observation across the press,
rather than by fixing the mechanism above. Two candidates that are not bugs at
all and would both look like a blink: the shell putting up its connection state
while `status` leaves `open`, and the seat form being replaced by its own
*you are playing as* line, which is the press doing exactly what it says.

## If it is real

- **Do not let a reconnect change what the screen draws.** Whatever redraws
  here costs the same on a Wi-Fi blink, which is a class rather than this one
  press — and the page already holds everything it needs to keep drawing.
- **Take the seat with a frame rather than a new `hello`.** `player.rename` is
  already a frame (`host-console-page.tsx`); the seat is not, because the hello
  is what claims it and what a reconnect re-claims it with. This is a protocol
  change and the more expensive of the two: read
  `.claude/rules/realtime-protocol.md` and `docs/game-catalogue.md` before
  costing it, and note that the same hello is what makes a seat survive a locked
  screen.

## Where the code is

- `apps/game/src/infrastructure/messaging/use-room-socket.ts` — the effect and
  its dependencies
- `apps/game/src/infrastructure/messaging/use-host-connection.ts` — the view
  that survives the cycle
- `apps/game/src/features/host/host-console-page.tsx` — `takeSeat`,
  `renameSeat`, and what the stage draws with no view
- `apps/game/src/presentation/connection/` — what the shell says about a socket
