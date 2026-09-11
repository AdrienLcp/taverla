# Architecture

## The shape

```
        ┌──────────────── apps/game (one Vite SPA) ────────────────┐
        │   /            /host/:code            /play/:code        │
        │   join         host console  (lazy)   player   (lazy)    │
        └───────┬──────────────────────────────────────┬───────────┘
                │  HTTP /api  (create room, catalogue)  │  WS /ws/rooms/:code
                ▼                                       ▼
        ┌──────────────────── apps/server (Hono) ──────────────────┐
        │  http/routes.ts        messaging/socket-handler.ts       │
        │  domain/room/{store,service,view}    music/deezer-client │
        └──────────────────────────────────────────────────────────┘
                │                                       │
                ▼                                       ▼
          packages/core                          packages/protocol
        (scoring, clock, codes)              (the contract, in Zod)
```

`packages/protocol` is the spine. Both sides import it; neither imports the
other. A change to the game's vocabulary starts there and the compiler walks you
through the rest.

## Why there is a server at all

The question a blind test has to answer is *who was first*, and only a machine
that sees both frames arrive can answer it. A client timestamp is wrong twice
over: clocks drift by seconds between devices, and the number is one console
line away from being edited. So `player.buzz` carries no timestamp, and the
server stamps arrival.

The server also holds the answer. Sending the title to a player and asking them
not to look would make the game unplayable for anyone curious enough to open
DevTools.

## Why a raw WebSocket rather than Socket.IO

Socket.IO buys reconnection, rooms, fallbacks and an event API. This project
needed the first two and already has them in twenty lines apiece — the
reconnect loop in `use-room-socket.ts`, the room registry in
`connection-registry.ts`. What it did not want was the event API: a stringly
typed `emit('buzz', payload)` on both ends, with the payload's shape agreed by
convention.

The raw socket forces the opposite. Every frame is parsed by a Zod schema that
is also the TypeScript type, on both ends, and the discriminated union makes
`switch (message.type)` exhaustive. The long-polling fallback Socket.IO is
famous for protects against a 2015 corporate proxy, which is not where this game
is played.

## Why one app rather than two

The QR code decides it. It encodes `location.origin`, so the phone that scans it
reaches the same origin the host is served from — no second domain, no CORS
preflight, no environment variable pointing one deployment at another, and
nothing to reconfigure when the game runs off a laptop on someone's Wi-Fi.

The usual argument for splitting is bundle size, and lazy routes settle it: the
player chunk is 5 kB, the host chunk 19 kB, and a player never downloads the QR
renderer. The routes are lazy for that reason — keep them that way.

## State lives in memory, on purpose

`room-store.ts` is a `Map`, and a restart drops every room. That is a real
limitation and it is still the right call: a game lasts an evening, everyone is
in the same living room, and after a mid-game restart the host would have to
re-share the code whether or not a database had survived. Persistence would buy
a schema, a migration path and a deploy dependency in exchange for a recovery
nobody would use.

A sweeper removes rooms nobody is connected to after ten minutes — long enough
that a host who reloads keeps their game.

Revisit if rooms ever need to outlive a deploy, or to span more than one server
process.

## Time

Every socket runs a ping/pong handshake. The client keeps the sample with the
**shortest** round trip and derives the server's clock from it — Cristian's
algorithm, where the halving assumes symmetric legs and the fastest sample is
where that assumption is least wrong. Averaging would drag the estimate toward
whichever sample was congested.

With an offset in hand, the server can say "the track starts at T" and every
device counts down to the same instant. `millisecondsUntil` is the conversion.

## Music

Deezer, for three reasons: no OAuth, no account, and a 30-second preview MP3 per
track — which is exactly the length of a blind test round.

Two properties leak into the design and should not be hidden:

- `api.deezer.com` answers **without** `Access-Control-Allow-Origin`, so the
  browser cannot call it. Catalogue reads are proxied by the server. Playback is
  unaffected: an `<audio src>` is not a CORS request.
- Preview URLs are **signed with an expiry** of roughly a day. The audio for a
  round is resolved when the round starts, never when the pool is built.

Everything above `deezer-client.ts` speaks `TrackSource`, `TrackSearchResult`
and `HostTrack`. Swapping catalogue means rewriting that one file, and its two
exported functions keep their signatures. Nothing thinner underneath would
reduce that work.

## The question banks

The quiz's port is the same shape and hides the opposite property.
`drawQuestion` is **synchronous**, because the bank is a bundled JSON asset
rather than a service — a game whose data weighs 780 KB has no business going
down because somebody else's web server did. `scripts/` is the only thing that
talks to either upstream, it runs by hand, and its output is committed, so a
deploy depends on nothing outside the repository.

The two upstreams are one module each — `openquizzdb-source.ts` and
`opentdb-source.ts`, both returning what `question-source.ts` declares — rather
than one script with a branch. OpenQuizzDB serves whole packs over HTTP; OpenTDB
has to be drained fifty rows at a time behind a session token and a five-second
rate limit, and refuses a page asking for more rows than remain. Neither is a
detail the other would want flattened into a common denominator.

## Strings and colours

The UI is internationalised — `en` and `fr` — and themed light/dark. Both are
lookups, not conditionals: a component asks for `player.roomSize` and for
`--ink-muted`, and the provider and the palette answer. The theme is resolved
in CSS rather than JavaScript, which is what keeps the first paint from flashing
the wrong ground; `data-theme` appears on `<html>` only for an explicit choice.

Server error codes are translated client-side. `ProtocolErrorMessage.message`
stays English and developer-facing, because a user-visible string arriving from
a server is a design smell — the code is already a closed enum, and mapping it
through a function means widening the enum fails to compile until every locale
has the string.

## This is the first game, not the product

The shell — a room with a readable code, a host screen, players that hold a seat
through a screen lock, an unforgeable arrival order, role-scoped views that make
hidden information a compile error — is not specific to a blind test. A second
game reuses all of it.

`docs/game-catalogue.md` maps the candidates and the seams: where room state and
game state are currently fused, which message names are blind-test verbs, and
the one shape of game (a drawing stream) that legitimately breaks the
whole-snapshot rule. Nothing there is scheduled, and nothing there should be
built in advance of a second game actually existing.

## Where the chrome lives

Everything that must exist on *every* screen is the shell's, not a page's:
`presentation/app-shell.tsx` renders `AppMenu` — language, theme, the connection
and the way home — beside the `Outlet`. The connection it displays is owned by a
*page*, so `presentation/connection/` carries it upwards rather than the menu
being mounted three times.

That direction matters for the second game: the menu, the room, the seats and
the clock are the shell, and a game supplies a surface inside it.

## What is deliberately absent

No database, no authentication, no analytics. Each is a real gap rather than an
oversight, and each has a stage in `docs/plans/` or a note there explaining why
it is not planned. CI is not among them any more —
[`.github/workflows/ci.yaml`](../.github/workflows/ci.yaml) lints, builds and
tests every push.
