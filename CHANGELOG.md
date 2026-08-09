# Changelog

Categories, in order: Breaking Changes, Features, Improvements, Fixes,
Internal. Tag an entry `[Server]`, `[Game]` or `[Shared]` when it is specific to
one part.

## Unreleased

### Features

- `[Game]` A visual world, replacing the prototype's dark-with-a-neon-accent
  look: the screen is a title card, and the phase is the colour. Six saturated
  fields, one per phase, so the far side of a room knows where the game is
  before reading a word. Archivo self-hosted, hard edges, and the buzzer as the
  one round object because it is the one physical button
- `[Server]` One origin in production: Hono serves the built SPA with an SPA
  fallback, so `/play/K3M9` resolves on a cold load and the QR code's
  `location.origin` holds without a proxy or a second domain
- `[Game]` The host console runs an evening: a genre picker, audio scheduled
  against the server clock, a judging panel that takes one tap, a reveal with
  the cover art, running scores and a final board that keeps the players for
  another game
- `[Game]` The phone plays: a countdown synchronised with every other device, a
  buzzer that answers on the press rather than the release, an honest reason
  whenever it is dead, and the reveal on the small screen too
- `[Server]` Only songs a room will recognise. Deezer's popularity score is the
  one field that separates a hit from AI-generated lo-fi, and the floor is set
  from measurements: classics sit at 830k–990k, the junk at 25k–405k
- `[Game]` Twelve Deezer genre charts to choose from, so the evening is a few
  thousand well-known tracks rather than today's global top 100
- `[Game]` A volume slider, and a switch that chains rounds by itself — the
  wait is served by the server, because the host screen is exactly the tab most
  likely to be in the background when its timers get throttled
- `[Server]` The round engine: a track drawn without repeats, a countdown every
  device lands on together, buzzes ordered by arrival, the host's verdict, and
  the reveal. A wrong answer locks that player out and the clip resumes for the
  others from where the buzz stopped it, rather than ending the round
- `[Server]` A round survives what a party does to it — the buzzer holder
  locking their phone, the host reloading, a player being removed mid-answer
- `[Shared]` The wire contract: role-scoped message unions, room views, error
  codes, and a codec that strips host-only fields from player frames
- `[Server]` Hono server with a native WebSocket endpoint — room creation, host
  claiming, player seats that survive a reload, live roster broadcast, and a
  clock handshake answered before the socket has even introduced itself
- `[Server]` Deezer adapter behind a domain port, proxied because
  `api.deezer.com` answers without an `Access-Control-Allow-Origin` header
- `[Game]` One Vite SPA serving both surfaces by lazy route: join, host console
  with QR code and live roster, player screen with a buzzer that explains why it
  is disabled
- `[Shared]` Pure domain rules with tests — clock offset estimation, room-code
  alphabet, buzz eligibility, competition ranking, locale negotiation
- `[Game]` English and French, with no i18n library: the English dictionary is
  the key type, so a missing translation does not compile. Server error codes
  are translated client-side and the server's `message` is no longer rendered
- `[Game]` Light and dark themes, resolved in CSS so the first paint cannot
  flash the wrong ground — `data-theme` is stamped only for an explicit choice
- `[Game]` A preferences bar on every screen, so the phone that arrived from a
  QR code can switch language without a settings page
- `[Game]` The join form remembers what you like being called, so the second
  room of the evening costs one tap instead of typing a name again

### Fixes

- `[Game]` Taking a seat no longer throws off a secure origin.
  `crypto.randomUUID` exists only in a secure context, and testing on real
  phones over the LAN is plain HTTP on an IP address

### Internal

- `[Game]` Design-system wrappers extend the react-aria props they wrap rather
  than re-declaring a subset, merged through a `composeClassName` helper
- `[Game]` `Button` and `Link` share one control mixin, so a variant is declared
  once; a pending button overlays a `Spinner` on a transparent label rather than
  replacing it, which keeps the box — and the accessible name — unchanged
- `[Game]` react-aria's `RouterProvider` wired to react-router in the app shell,
  so an `href` navigates client-side instead of reloading and dropping the socket
- Cross-project seams documented in `docs/game-catalogue.md`: the blind test is
  the first game on a shared party-game shell, not the whole product
- pnpm workspace on TypeScript 7, Biome 2.5.7, Vitest 4, React 19 with the React
  Compiler enabled
- `@babel/core` held at 7.x: the React Compiler cannot parse Babel 8's AST for a
  destructured parameter with a default, and it bails silently
- Staged build plan under `docs/plans/`, project conventions under `.claude/`
