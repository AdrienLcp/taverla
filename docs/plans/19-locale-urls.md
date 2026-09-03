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
- **Rooms stay out.** `/host/` and `/play/` are already `Disallow`ed: a room is
  one evening long and needs a live socket.

## Steps

1. **`paths` gains a locale segment** for the six indexable routes. The room
   routes are the open question below.
2. **The root negotiates.** `/` keeps `applyInitialLocale`'s reading of
   `navigator.languages` and redirects to the prefixed URL, and it is what
   `hreflang="x-default"` points at. Redirecting without an `x-default` is the
   one thing Google's guidance warns can keep a language out of the index
   entirely.
3. **Every internal link becomes locale-aware.** `gameHomePathFor` and the
   `paths.home` / `paths.credits` links in `app-menu`, `credits-page`,
   `not-found-page`, `connection-refused` and `error-screen`. `pathFor` is the
   chokepoint, so this is where its params type earns itself.
4. **A post-build script** renders the six routes twice with
   `react-dom/server`, writing each into its own `index.html` with that
   language's head. The server already compresses and caches what it hands out;
   it gains a static-file route per prefix.
5. **`hreflang` reciprocal on every page**, including a self-reference, plus a
   `canonical` per URL pointing at itself. Non-reciprocal `hreflang` is ignored
   in silence.
6. **`og:locale` per page**, and `og:locale:alternate` finally means something —
   today `index.html` promises `fr_FR` with no French URL behind it.
7. **The e2e journeys navigate URLs**, so all three need the prefix.

## The open question

**Do the room routes take a prefix?** `/play/:code` is what the QR code encodes
and what a person reads aloud, and a locale segment makes both longer for no
indexing gain. Against that, one rule for every route is simpler than two, and a
phone joining a French room should probably not open in English.

The narrower answer, if the seam holds: leave the room routes unprefixed and let
them keep negotiating at runtime, which is correct for them precisely because
nobody indexes them. Decide it before step 1 — it decides whether
`taverla:seats`, the host tokens and the QR code are touched at all.

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
