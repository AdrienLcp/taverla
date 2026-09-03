# 19 — A URL per language, and a page that paints before React

**Two problems with one fix.** They were found separately and they are the same
build step, which is the only reason this stage is worth its size.

## Why

**The room is served one URL, so one language is indexable.** Google indexes a
document per URL. The app decides its language at runtime from
`navigator.languages` — locale-adaptive serving, which Google's own multilingual
guidance says to replace with distinct URLs, because its crawl does not vary
`Accept-Language`. Whatever a French visitor sees, English is what enters the
index. And the unfurl bots — Slack, WhatsApp, Discord, iMessage — do not run
JavaScript at all, so `document.title` set at runtime reaches the browser tab and
nothing else.

**The first paint waits for JavaScript.** Measured on the built app over three
runs per URL:

| | `/` | `/blindtest` | `/credits` |
|---|---|---|---|
| performance | 0.93 | 0.94 | 0.94 |
| accessibility, best-practices, SEO | 1 | 1 | 1 |

The whole deficit is first paint: FCP 2.3 s (0.76), LCP 2.7 s (0.85), against
CLS 0 and TBT 70 ms. The LCP breaks down as **TTFB 458 ms (17%), render delay
2 237 ms (83%)** — the HTML arrives quickly and nothing paints until the bundle
runs, because `index.html` serves an empty `#root`.

Prerendering answers both: each language gets its own served document with its
own `lang`, `title`, `description` and `og:`, and that document has content to
paint before any script runs.

## What is already decided

- **Path prefix**, `/fr/…` and `/en/…`. Subdomains and ccTLDs are for when the
  business differs per country, which it does not.
- **Prerender at build time, not SSR.** The data a room runs on arrives over a
  WebSocket; there is nothing for a loader to do. Framework mode was assessed
  and declined for the same reason — it brings SSR and loaders to an app with no
  server-side data, and would take over a Vite config carrying three sharp
  constraints (the React Compiler on `@rolldown/plugin-babel`, the react-aria
  locale plugin, the LAN dev host the QR code needs).
- **Seven pages are indexable**: home, credits, and the *five* game front
  doors. Times two locales, **fourteen** files. This plan said six and twelve,
  and was already wrong by two when it was written — `reflex` reached
  `shelvedGames` in stage 18. The prerender therefore reads `shelvedGames` and
  `LOCALES` rather than a list of its own, because a game that reaches the shelf
  without a document is a front door no crawler finds and nothing says.
- **Rooms stay out**, and that includes the prefix. `/host/` and `/play/` are
  already `Disallow`ed: a room is one evening long and needs a live socket, so a
  locale segment buys no language back in the index and lengthens the two things
  a room travels by — what the QR code encodes and what somebody reads out
  across the table. They keep negotiating at runtime, which is right for them
  precisely because no crawler is watching. `taverla:seats`, the host tokens and
  the QR code are untouched.

## Steps

1. ~~**`paths` gains a locale segment**~~ **Done.** `paths` is now the union of
   `localizedPaths` (`/:locale`, `/:locale/credits`, `/:locale/:game`) and
   `roomPaths`, which is what decides the route tree: `routes.tsx` hangs the
   first set behind the prefix guard and the second beside it, read off the path
   itself so there is no second list to keep in step. The namespace `/:game`
   shares moved down a segment with it, and the note that says so moved too.
2. ~~**The root negotiates.**~~ **Done.** `/` is an index route rendering
   `NegotiatedLocaleRedirect`, and it is what `hreflang="x-default"` will point
   at — redirecting without an `x-default` is the one thing Google's guidance
   warns can keep a language out of the index entirely. The same component
   answers every *other* unprefixed path, so `/credits` and `/blindtest` from
   before this stage gain the prefix rather than 404. `applyInitialLocale` reads
   the locale out of the served path first, then storage, then
   `navigator.languages`, and **remembers one the URL named** — without that, a
   room reached from a link shared in the other language comes back in the
   reader's own on the first reload, since a room's URL names none. The
   negotiated fallback is deliberately not written: "never chosen" is what keeps
   following the operating system.
3. ~~**Every internal link becomes locale-aware.**~~ **Done.** `homePathFor`,
   `creditsPathFor` and `gameHomePathFor` all take the locale, and `useLocale`
   is the narrow accessor the six call sites read it from. Switching language in
   the menu now **navigates** on a page that names one and stays put on a room —
   leaving a room path would drop the socket and hand the seat back. The guard
   follows the URL back the other way in a layout effect, because going back
   across `/fr` → `/en` moves the URL without passing through the control that
   moved it.
4. ~~**A post-build script**~~ **Done.** `vite build --ssr src/entry-server.tsx`
   emits a Node bundle beside the client one, and `scripts/prerender.ts` imports
   it and writes fourteen documents plus a `prerendered.json` manifest into
   `dist`. The server reads that manifest and registers **one route per URL**,
   which is what the *no trailing slash* section below asks for; a manifest
   rather than a list both sides keep, because only the build knows what it
   actually wrote. Absent, the server says so out loud and falls back to the
   single document — that silence would be this stage's own bug returning.
5. ~~**`hreflang` reciprocal on every page**~~ **Done.** Each document lists both
   languages including itself, plus `x-default` on `/`.
6. ~~**`og:locale` per page**~~ **Done**, with `og:locale:alternate` naming the
   other language's URL — and `og:image:alt` localized with it, which was the
   last English string a French unfurl would have read aloud.
7. ~~**The document title, twice.**~~ **Done.** The head is written per document
   at build time, and `useDocumentTitle` writes the tab on an in-app navigation
   and on a language change. The copy lives in
   `presentation/head/document-head.ts` rather than the dictionary — see below.
8. ~~**The e2e journeys navigate URLs**~~ **Done.** `everyone-answers` goes to
   `/en` and asserts `/en/blindtest`, `dead-socket` expects the way out to land
   on `/en`, and `full-game` keeps arriving at `/` and now asserts the
   negotiation that sends it to `/en` — one journey covering the front door
   where a room actually starts.

## No trailing slash

`/fr`, `/fr/credits`, `/fr/blindtest`. It is what `generatePath` produces, so
`pathFor` stays the one place a path is built, and it is what every link in the
app now carries. The prerender step therefore maps each of the twelve URLs to
its file explicitly rather than leaning on a directory index — which the plan
already called for (*"a static-file route per prefix"*), and which is the only
shape that does not depend on how a given static server resolves a directory.

## Where the head copy lives, and why it is not in the dictionary

`presentation/head/document-head.ts` holds a title and a description per page
per language, and it is the one user-visible string outside the dictionary.
That is the exception `.claude/rules/i18n.md` already carved for the document
head, kept rather than widened: this copy is read by somebody with no room in
front of them. The home screen says `Taverla` and `The tavern is open.`; neither
is a search result. It is also read in Node with no provider mounted, which a
dictionary key cannot be. It is typed `Record<Locale, Record<IndexedPage, …>>`
over `ShelvedGame`, so a game reaching the shelf stops compiling until both
languages can introduce it to a stranger — the same guarantee the dictionary
gives.

## Traps found while building

- **`createStaticRouter(routes, context)` renders the `HydrateFallback`.** Every
  page here is `lazy`, and it is `createStaticHandler.query` that resolves those
  chunks — into `handler.dataRoutes`, not into the array it was given. Handed
  the original tree the router has no component to mount, and writes the loader
  into all fourteen documents with the build green and every file the right
  size. `renderPage` now throws on `ROUTE_FALLBACK_CLASS` so it cannot come back
  quietly.
- **The client still calls `createRoot`, not `hydrateRoot`**, and that is a
  decision. The document is written at build time and cannot know the device's
  theme, which is read from storage at first render; hydrating would mismatch on
  every load, or push the theme into an effect and trade one flash for another.
  Nothing here comes from a loader, so hydration would buy the reuse of a few
  dozen nodes. React replaces the container's children inside its first commit,
  so the prerendered text is what paints and nothing blanks between the two.
- **The theme flash is now visible, and it was not before.**
  `theme-provider.tsx` stamps `data-theme` only for an explicit choice, in an
  effect, and says why: `_tokens.sass` answers `prefers-color-scheme` on its own.
  Until this stage the page was empty while that was decided, so a reader whose
  choice differs from their OS saw two seconds of an empty field in the wrong
  colour. They now see two seconds of *text* in it. Nothing regressed — the same
  attribute is stamped at the same moment — but the argument the comment records
  was written against a blank first paint, and prerendering is what changes its
  price. It belongs with the render-blocking-stylesheet trap below: both are
  answered by putting what the first paint needs in the served document.
- **`lighthouserc.json` audited `/`, `/blindtest` and `/credits`**, all three of
  which now negotiate and redirect. They are `/en`, `/en/blindtest` and
  `/en/credits`, and the baseline in this file stays comparable because the old
  URLs served exactly this document.

## Traps found while measuring

- **Splitting the dictionaries is not obviously a win.** 89 KiB of the first
  load is unused JavaScript, and 43 KiB of it is the other locale's dictionary
  inside the 78 KiB `i18n-provider` chunk. But a dynamic import awaited before
  render adds a round trip to the critical path, which under the throttled
  profile costs more than the 20 KiB saves. It only pays if the import is issued
  from the **entry** so it is discovered in parallel with the provider chunk —
  and once the page is prerendered, the whole question changes shape. Measure
  again after this stage, not before.
- **Three render-blocking stylesheets** (4.1 + 1.2 + 1.0 KiB) cost ~150 ms in
  round trips. Prerendering is the moment to inline the tokens the first paint
  needs, which is the lobby field and its ink.
- **`lang` is already stamped before React renders** (`applyInitialLocale`), so
  the runtime half of this is done. What is missing is the *served* document.
