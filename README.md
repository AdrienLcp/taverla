# Taverla

A shelf of party games sharing one room, one QR code and one set of screens. One
screen runs the game and shows the code, everyone else plays on whatever they
have to hand, and the first to know it takes the round.

Three games are on the shelf. **Blind test** plays a clip and asks for the title
and the artist. **Buzzer** serves no content at all — the host brings the
charade, the quiz on paper or the lesson, and the room only needs an honest race
for the floor. **Quiz** asks 1 800 French questions bundled with the server.

The product is `Taverla`; a game is one thing on it. Packages are scoped
`@taverla/*` because they belong to the shelf, while the translation keys a
single game owns keep its own prefix — `blindtest.*`, `buzzer.*`, `quiz.*`.

```bash
pnpm install
pnpm dev          # server on :3100, app on :5273
```

Open `http://localhost:5273`, hit **Create a room**, and either scan the QR code
or type the four-character code on another device on the same Wi-Fi. The Vite
dev server listens on the network address, so the QR code resolves for real
devices without any tunnelling.

## What is here today

**Three games, playable end to end and deployed.** Create a room, join by QR or
by code, claim a seat that survives a locked screen. The round engine draws what
the game serves, counts every device in on the same instant, arms the buzzers,
stamps who was first, takes the host's verdict and reveals. A wrong answer locks
that player out and the round picks up where the buzz stopped it, then a running
scoreboard and a final board that keeps everyone for another game. English and
French, light and dark, on a phone or a laptop.

Three ways to answer, and the game narrows them: the first press on the buzzer,
four choices on screen, or everyone typing at once against the same clock — the
last two decided by the server and scored by speed on top of being right.

It is covered end to end: the socket suites drive a real server over real
sockets, and three Playwright journeys drive the two screens against a stubbed
catalogue. What is *not* covered is any single component in isolation, on
purpose — see [`docs/plans/06-testing.md`](docs/plans/06-testing.md). The stages
past 08 came out of playing the game rather than out of planning it. See
[`docs/plans/`](docs/plans/).

No game is the whole product: the room, the QR code, the seats, the anti-cheat
and the corner menu are a shell the three of them share, and the seam between
the shell and one game on it — `settings.game`, `round.content`, the verdict —
was cut only once there were two cases to measure it against. See
[`docs/game-catalogue.md`](docs/game-catalogue.md) — and note that nothing there
is being built in advance.

## Layout

```
apps/server         Hono + native WebSocket. Owns the game state.
apps/game           One Vite SPA: /host/:code and /play/:code, lazily split.
packages/protocol   The wire contract, in Zod. The spine of the repo.
packages/core       Pure domain rules — scoring, clock, room codes.
```

## Three decisions worth knowing before reading the code

**The server is not optional.** Buzz order is the whole game, and a client
timestamp is both clock-skewed and trivially edited. The server stamps arrival;
`player.buzz` carries no timestamp at all.

**One app, two routes.** The QR code encodes `location.origin`, so a player
lands on the same origin the host is served from — one deployment, no CORS, no
second domain. The bundles stay apart because the routes are lazy: the player
chunk is 5 kB, the host chunk 19 kB.

**A player is never sent the answer.** Host and player have separate message
unions, and player frames are encoded *through* their schema so Zod strips
anything host-only that leaked. There is a test that fails when the strip is
removed.

## Commands

| | |
|---|---|
| `pnpm dev` | Server and app together |
| `pnpm build` | Type-check everything, build the app |
| `pnpm lint` | Biome, with fixes applied |
| `pnpm lint:ci` | Biome, reporting instead of fixing |
| `pnpm test` | protocol + core + server |
| `pnpm test:e2e` | Three Playwright journeys, on their own ports |
| `pnpm validate` | build + test + e2e |

## CI

[`.github/workflows/ci.yaml`](.github/workflows/ci.yaml) lints, builds and tests
on every push to `main` and every pull request.

## Deploying

One instance, one origin. [`render.yaml`](render.yaml) is a Render blueprint: it
builds the workspace and starts the server with `SERVE_GAME_FROM` pointing at
the app's `dist`, so Hono answers the static build, the API and the socket on a
single port — which is what makes the QR code resolve for the phone that scans
it.

1. On Render, **New → Blueprint**, and pick this repository. It reads
   `render.yaml`; there is nothing to fill in.
2. Deploy, and wait for `/api/health` to go green.
3. Open the URL, create a room, and scan the QR code from a phone on mobile
   data rather than the Wi-Fi — that is the thing being tested.

Pushes to `main` redeploy from then on.

The instance count is pinned to one deliberately: rooms live in a `Map` in the
process, so a second instance would hold half of them and a player would reach
the wrong one. The free tier sleeps when idle, which costs a cold start on the
first request and drops whatever rooms were open — fine for a party, not for a
demo you are about to give.

Fly.io and a small VPS fit the same shape. What rules a platform in or out is in
[`docs/plans/08-deploy.md`](docs/plans/08-deploy.md).

## Docs

- [`docs/architecture.md`](docs/architecture.md) — how the pieces fit, and why
- [`apps/game/DESIGN.md`](apps/game/DESIGN.md) — the visual world: the phase is
  the colour, the three control materials, the icon family. Read it before
  touching anything a user sees
- [`apps/game/PRODUCT.md`](apps/game/PRODUCT.md) — who plays, where, and the
  naming decisions with every rejected candidate
- [`docs/realtime-protocol.md`](docs/realtime-protocol.md) — the wire format
- [`docs/game-catalogue.md`](docs/game-catalogue.md) — the games after this one,
  and the seams that stay open for them
- [`docs/plans/`](docs/plans/) — the staged build, one file per session
- [`.claude/`](.claude/) — the conventions, for humans and assistants alike

## Contributing

Issues and pull requests are welcome, and the conventions that decide a review
are written down rather than implied: [`.claude/rules/`](.claude/rules/) holds
them, and `CLAUDE.md` at each level says which apply where. Run `pnpm validate`
before opening one — build, tests and journeys, in that order.

**One honest caveat, so nobody wastes an evening.** A pull request that adds a
*new game* is not something this repository can take yet, and that is a design
position rather than an oversight.

Half the seam now exists: `settings.game` and `round.content` are unions
discriminated on the game, so what a game asks and what it is configured with
are separated from what every game needs. What does not exist is an *extension
point*. A second game is added by editing those unions — not by registering
anything — and that is deliberate: two implementations are enough to see the
shared shape and not enough to abstract it, so there is no plugin interface to
write against and none is planned before a third case makes one knowable.

`RoomPhase` is still `lobby → countdown → playing → buzzed → revealed →
finished`, which is the blind test's life cycle wearing the room's name. Every
phase happens to be true of a quiz too — a countdown is a countdown and a reveal
is a reveal — so it has not been split, and the day it is wrong for a game is
the day it should move. The reasoning is in
[`docs/game-catalogue.md`](docs/game-catalogue.md).

Everything else is open: bugs, translations, accessibility, the design system,
the question bank, a platform this does not run well on.

## Licence

[GNU AGPL-3.0](LICENSE). You may run, study, change and redistribute this — and
if you deploy a modified version for other people to use over a network, that
version's source has to be available to them too. The network clause is the
whole reason for the choice: this is a thing people reach over a URL, so the
ordinary GPL would have left the case that matters uncovered.

`.claude/skills/` is deliberately untracked. Those are vendored third-party
assistant skills with licences of their own, and they are personal tooling
rather than part of this project.
