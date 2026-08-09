# Changelog

Categories, in order: Breaking Changes, Features, Improvements, Fixes,
Internal. Tag an entry `[Server]`, `[Game]` or `[Shared]` when it is specific to
one part.

## Unreleased

### Features

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
