# Stage 08 — Somewhere friends can reach

**Goal.** A URL that works from a phone that is not on your Wi-Fi.

**Depends on** stage 04 at least — deploying a lobby is not worth the effort.

## The one hard requirement

**Both surfaces must be served from a single origin,** because the QR code
encodes `location.origin`. Break that and you inherit CORS, a second domain, and
an environment variable pointing one deployment at the other — the exact
complexity the one-app decision avoided.

Concretely: one host serves the static build **and** proxies `/api` and `/ws` to
the server, the same way Vite does in dev.

## The second requirement, which rules out most platforms

**Long-lived WebSockets and in-process state.** Rooms live in a `Map` in one
process, so the deployment must be a single long-running instance with sticky
behaviour by construction — not a serverless function, not an autoscaling group.

That eliminates Vercel, Netlify Functions and Cloudflare Workers as-is. It does
not eliminate Cloudflare if you are willing to move rooms into Durable Objects,
which is a genuine architectural alternative rather than a deployment
detail — one object per room, state where the socket is. Worth considering
seriously; it is a bigger change than this stage.

## Candidates

| | Fits | Cost |
|---|---|---|
| **Fly.io** — one machine, WS native, scale-to-zero | yes, well | free-ish |
| **Railway / Render** — same shape, simpler | yes | free tier, cold starts |
| **A small VPS + Caddy** | yes, total control | a few € a month, you own the TLS |
| **Cloudflare Durable Objects** | after a rewrite of the room store | very cheap, real work |

Fly is the natural first choice: one `fly.toml`, one region, WebSockets need no
configuration.

## Done

- **Hono serves the static build**, behind `SERVE_GAME_FROM`. Its absence is
  what keeps development on Vite; its presence is what makes production one
  origin. Registered after the API and the socket upgrade, because the SPA
  fallback answers everything and would otherwise swallow them.
- **`render.yaml`** — free tier, one instance, `/api/health` as the check. The
  instance count is pinned with a comment: two of them would each hold half the
  rooms in memory and a phone would reach the wrong one.
- **`crypto.randomUUID` no longer throws off a secure origin.** It exists only
  in a secure context, and the obvious way to try this on real phones is plain
  HTTP on a LAN address. `ensureSessionId` now falls back, and says why the
  weaker id is acceptable for a seat claim.

Verified locally by running the server with `SERVE_GAME_FROM` set: index served,
`/host/YDEQ` resolving on a cold load, the API answering, the socket connecting
on the same port, and the QR code encoding that origin.

## Still to do

- **The server still runs through `tsx`**, a dev tool, deliberately for now. It
  costs a slower boot on a free instance that sleeps. Bundling it (`tsdown`,
  `noExternal` the workspace packages) is the fix when the cold start annoys.
- **No Dockerfile.** Render's native Node runtime handles the pnpm workspace, so
  there is nothing for one to solve yet.
- **Rate-limit `POST /api/rooms`** — unauthenticated and it allocates memory.

## CI

`.github/workflows/ci.yaml` runs lint, build and test on `main` and on every
pull request. It calls `pnpm lint:ci` rather than `pnpm lint`, because the
latter is `biome check --write`: it would repair the drift and exit 0, passing
on exactly the code the job exists to reject.

There is no deploy job. Render redeploys from `main` itself, and a second
mechanism racing it would only be a way to ship a build CI had not seen.

## Worth adding at the same time

- **Rate-limit room creation.** `POST /api/rooms` is unauthenticated and
  allocates memory. One line with `hono-rate-limiter`.
- **A health check** — `/api/health` already exists and returns the protocol
  version.
- **Something that says a deploy happened.** A version string in the footer is
  enough to answer "is my fix live?".

## Done when

- A phone on mobile data can scan the QR code and play — **not verified**, no
  deployment exists yet. The repository is published at
  `AdrienLcp/taverla` (private) with CI green; what remains is one action in
  Render's own UI, which needs Adrien's account
- `/play/K3M9` resolves on a cold load, not only via client navigation
- The socket survives ten minutes idle — check the platform's idle timeout, and
  note that the 5-second ping already keeps it warm
- A restart is survivable in practice: it drops rooms, which is documented and
  accepted, but it must not leave a client reconnecting forever

## Out of scope

Staging, monitoring, a custom domain. CI was in this list and is no longer: it
is one file and it catches the class of mistake that only shows up on a machine
that is not yours.
