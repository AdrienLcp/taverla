# Taverla

A shelf of party games sharing one room, one QR code and one set of screens.
**Blind test** is the first of them: one screen runs the game and shows the QR
code, everyone else plays on whatever screen they have to hand, and the first to
buzz gets to name the track.

The product is `Taverla`; the game is `Blind test`. Packages are scoped
`@taverla/*` because they belong to the shelf, while the translation keys a
single game owns keep its own `blindtest.*` prefix.

```bash
pnpm install
pnpm dev          # server on :3100, app on :5273
```

Open `http://localhost:5273`, hit **Create a room**, and either scan the QR code
or type the four-character code on another device on the same Wi-Fi. The Vite
dev server listens on the network address, so the QR code resolves for real
devices without any tunnelling.

## What is here today

**A whole game, playable end to end and deployed.** Create a room, join by QR or
by code, claim a seat that survives a locked screen. The round engine draws a
track, counts every device in on the same instant, arms the buzzers, stamps who
was first, takes the host's verdict and reveals with the cover art. A wrong
answer locks that player out and the clip picks up where the buzz stopped it,
then a running scoreboard and a final board that keeps everyone for another
game. English and French, light and dark, on a phone or a laptop.

What is missing is **tests** — nothing client-side has one, so every claim about
a screen rests on someone driving a browser. That is stage 06. Stages 09 and 10
(answer modes, per-device audio) came out of playing the game rather than out of
planning it. See [`docs/plans/`](docs/plans/).

The blind test is the first game rather than the whole product: the room, the QR
code, the seats, the anti-cheat and the corner menu are a shell several games
will share. See
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

**One app, two routes.** The QR code encodes `location.origin`, so the phone
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
| `pnpm validate` | build + test |

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
process, so a second instance would hold half of them and a phone would reach
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
