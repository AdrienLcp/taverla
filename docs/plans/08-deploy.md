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

- **It is live at `taverla.onrender.com`**, redeployed from `main` by Render
  itself. `/api/health` answers `{"protocolVersion":2,"status":"ok"}` on a warm
  instance in well under a second.

## The free instance sleeps, and that is accepted for now

After ~15 minutes without traffic Render stops the instance, and the next
request is held behind Render's own loading page for the 30–60 seconds the
container takes to come back. A custom domain would change nothing: the veil is
the plan's, not the URL's.

The arbitration, so it is not reopened for free:

- **Render Starter (7 $/month) is the only thing that removes the cause.** It is
  the answer the day strangers, rather than Adrien, are the first to open the
  link.
- **Fly's scale-to-zero wakes in a second or two and shows no interstitial**, but
  it now wants a card and a monthly minimum of its own, plus a Dockerfile for the
  pnpm workspace and a deploy path to replace push-to-`main`. Against Starter's
  7 $, the migration no longer pays for itself.
- **Keeping the instance awake with an external ping** costs 744 of the free
  plan's 750 monthly instance-hours, which leaves no margin and only works while
  this is the sole free service on the account.
- **Preheating is what is actually used.** Open the host screen a minute before
  the guests arrive; the 5-second socket ping keeps it up for the rest of the
  party, and nobody but the host ever meets the loading page.

## Still to do

- **The server still runs through `tsx`**, a dev tool, deliberately. Bundling it
  (`tsdown`, `noExternal` the workspace packages) was meant as the answer to the
  cold start, and measuring it demoted the idea: the wait is container
  scheduling, and stripping types off a few dozen modules is seconds out of
  tens. It is worth doing for its own sake — a single file, no `pnpm install` at
  runtime — and it only becomes worth doing *for the boot* on a host that wakes
  fast enough for those seconds to be the visible ones.
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

- A phone on mobile data can scan the QR code and play — the deployment now
  exists and answers, so what is left is one real game played over mobile data
  rather than another local run
- `/play/K3M9` resolves on a cold load, not only via client navigation
- The socket survives ten minutes idle — check the platform's idle timeout, and
  note that the 5-second ping already keeps it warm
- A restart is survivable in practice: it drops rooms, which is documented and
  accepted, but it must not leave a client reconnecting forever

## Out of scope

Staging, monitoring, a custom domain. CI was in this list and is no longer: it
is one file and it catches the class of mistake that only shows up on a machine
that is not yours.
