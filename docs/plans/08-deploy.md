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

## Work

- **Build the server for production.** It runs through `tsx` today, which is a
  dev tool. Bundle it (`tsdown` or `tsup`, `noExternal` the workspace packages
  so Node never has to resolve them) or run `tsx` deliberately and say why.
- **Serve the static build from Hono** — `hono/serve-static` for `apps/game/dist`,
  with an SPA fallback to `index.html` so `/play/K3M9` resolves on a cold load.
  That single change is what gives you one origin.
- **Dockerfile**, multi-stage, `pnpm deploy --filter` rather than copying
  `node_modules` — pnpm's symlinks do not survive a copy.
- **`ALLOWED_ORIGINS` and `PORT`** are already read from the environment.
- **HTTPS is not optional.** `getUserMedia` is not in play, but `crypto.randomUUID`
  requires a secure context, and without it `ensureSessionId` throws and nobody
  can join. Test on the deployed URL, not on localhost, which is exempt.

## Worth adding at the same time

- **Rate-limit room creation.** `POST /api/rooms` is unauthenticated and
  allocates memory. One line with `hono-rate-limiter`.
- **A health check** — `/api/health` already exists and returns the protocol
  version.
- **Something that says a deploy happened.** A version string in the footer is
  enough to answer "is my fix live?".

## Done when

- A phone on mobile data can scan the QR code and play
- `/play/K3M9` resolves on a cold load, not only via client navigation
- The socket survives ten minutes idle — check the platform's idle timeout, and
  note that the 5-second ping already keeps it warm
- A restart is survivable in practice: it drops rooms, which is documented and
  accepted, but it must not leave a client reconnecting forever

## Out of scope

CI, staging, monitoring, a custom domain. A friends-and-family game does not
need a pipeline; add one if this ever grows.
