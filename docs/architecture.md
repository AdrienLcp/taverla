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
over: clocks drift by seconds between phones, and the number is one console line
away from being edited. So `player.buzz` carries no timestamp, and the server
stamps arrival.

The server also holds the answer. Sending the title to a phone and asking it not
to look would make the game unplayable for anyone curious enough to open
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
player chunk is 5 kB, the host chunk 19 kB, and a phone never downloads the QR
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

Everything above `deezer-client.ts` speaks `TrackSource` and `HostTrack`.
Swapping catalogue means rewriting that one file.

## What is deliberately absent

No database, no authentication, no analytics, no i18n layer, no CI. Each is a
real gap rather than an oversight, and each has a stage in `docs/plans/` or a
note there explaining why it is not planned.
