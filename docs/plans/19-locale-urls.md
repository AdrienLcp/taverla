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
- **Six pages are indexable**: home, credits, and the four game front doors.
  Times two locales, twelve files.
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
4. **A post-build script** renders the six routes twice with
   `react-dom/server`, writing each into its own `index.html` with that
   language's head. The server already compresses and caches what it hands out;
   it gains a static-file route per prefix.
5. **`hreflang` reciprocal on every page**, including a self-reference, plus a
   `canonical` per URL pointing at itself. Non-reciprocal `hreflang` is ignored
   in silence.
6. **`og:locale` per page**, and `og:locale:alternate` finally means something —
   today `index.html` promises `fr_FR` with no French URL behind it.
7. **The document title, twice.** The prerendered head carries it per language,
   which is what a crawler and an unfurl read. The tab after an in-app
   navigation is a separate thing and still needs two dictionary keys and a
   write to `document.title` — today it is the English string from
   `index.html`, in both locales, for the life of the tab.
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
