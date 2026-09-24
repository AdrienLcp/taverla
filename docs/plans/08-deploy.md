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
  itself. `/api/health` answers `{"build":…,"protocolVersion":…,"status":"ok"}`
  on a warm instance in well under a second.

- **The server is bundled**, not run through `tsx`. `tsdown` emits one
  `dist/index.mjs` with the workspace packages inlined — they ship as
  TypeScript source, so anything that left them external would only start under
  a loader. Third-party dependencies stay external; Render installs them.
  `pnpm --filter @taverla/server start` was Render's start command until September 2026, when Render made `/usr/bin` read-only and `corepack enable` began failing with EROFS; The build now runs Render's own pnpm with no corepack, which reads `packageManager` and switches versions itself — a corepack shim under `$HOME` got the install right and then lost the nested `pnpm -r build` to Render's pnpm 10 — and the service starts with plain `node`. **The service does not read `render.yaml`**: its build and start commands live in the dashboard, which is where that change had to be made by hand — the file is a record, and a change to it deploys nothing.

- **`POST /api/rooms` is rate-limited** — 30 per address per ten minutes, which
  is the window the sweeper clears an unjoined room in. It answers 429 with
  `rate_limited`, and the client tells the host to wait rather than showing the
  generic refusal.

- **The menu says which build is running.** `/api/health` carries the deployed
  commit, short, and the corner menu asks for it the first time it is opened.
  The deployment's, not the tab's: a phone on a cached bundle still reads what
  the server was built from, which is the question "is my fix live?" asks.

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

- **Bundling did not fix the cold start** — see below. Nothing else is open.

## The Dockerfile, and why it is not what deploys

There is one at the repository root, and **Render does not read it**: the native
Node runtime builds the workspace from `render.yaml`, which is still the cheapest
path and the one the free plan understands. The image exists for a host that
wants one and for running the production build on a laptop.

Two things in it are not guessable:

- **`pnpm deploy` needs `--legacy`.** From pnpm 10 a deploy refuses a workspace
  that does not inject its packages, and says so with
  `ERR_PNPM_DEPLOY_NONINJECTED_WORKSPACE`. The output is the server package with
  production dependencies only — 15 MB, because `tsdown` has already inlined
  `@taverla/*` into the bundle.
- **Running that command outside the image breaks the checkout.** `--prod` is
  recorded against the workspace, so the next `pnpm` script decides the tree is
  out of date and re-installs it *without* devDependencies: biome, tsc and
  vitest all disappear and every command fails at once, several steps away from
  the cause. `pnpm install` puts it back. Inside Docker it is harmless, because
  the build stage is thrown away — this is a warning about trying the command by
  hand.
- **`SERVE_GAME_FROM` is relative to the process's working directory**, not to
  the image root: `serveStatic` resolves it against `cwd`. The image reproduces
  the deployment's layout — server at `/app/server`, game at `/app/game/dist`,
  the variable set to `../game/dist` — so the two cannot drift into serving the
  SPA from nowhere.

**CI builds it on every push and throws the result away.** A Dockerfile nothing
builds is a file that stops working without anybody finding out, and this one is
not on the path anybody would notice from.
- **Bundling did not fix the cold start, and was never going to.** Measuring it
  is what demoted the idea: the wait is container scheduling, and stripping
  types off a few dozen modules is seconds out of tens. It landed for its own
  sake — one file, no loader in production — and would only become visible on a
  host that wakes fast enough for those seconds to be the ones you feel.

## CI

`.github/workflows/ci.yaml` runs lint, build and test on `main` and on every
pull request. It calls `pnpm lint:ci` rather than `pnpm lint`, because the
latter is `biome check --write`: it would repair the drift and exit 0, passing
on exactly the code the job exists to reject.

There is no deploy job. Render redeploys from `main` itself, and a second
mechanism racing it would only be a way to ship a build CI had not seen.

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
