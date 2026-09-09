# 20 — A document that paints itself

Served, a page now carries its own styles and its own theme. Nothing between
the document arriving and the room seeing the screen.


## Why

[19](19-locale-urls.md) put a whole page in the served document and the scores
did not move. Its measurement said why: the first paint stopped waiting for
React and started waiting for three render-blocking stylesheets that arrive at
1 930 ms — 16 KB queued behind 550 KB of JavaScript and a 90 KB font, all
requested in the same breath at ~686 ms over a link moving about 200 KB/s.
Priority does not preempt on a shared connection, so the small file waits its
turn with the large ones.

The same document painted the wrong theme for anyone who had overridden their
system, because `ThemeProvider` stamps `data-theme` from an effect and an effect
does not run until React has hydrated.

Two faults, one shape: the document holds everything it needs to paint except
one thing it has to go and ask for.


## What was found before anything was written

**The three linked stylesheets were not the whole set.** `home-page.css` is not
in `en.html` at all — it belongs to the lazy route chunk, so the document could
not paint its own markup correctly even at 1 930 ms. It paints without it, and
the styles land with the bundle four hundred milliseconds later.

That changes what the fix is. Inlining only the three *linked* sheets would move
the paint to ~646 ms and hold a structurally unstyled page for two seconds
instead of four hundred milliseconds: a better FCP and a worse page. The unit is
not "the render-blocking sheets". It is **every stylesheet this document's own
markup paints under**, linked or lazy.


## What is decided

- **Route-scoped, not all of it.** Three ways to inline were measured on the
  wire, where the server already compresses:

  | | `/en` gzipped | blocking requests |
  |---|---|---|
  | before | 3 226 B | 3 |
  | the route's own set | **7 855 B** | 0 |
  | every sheet (`cssCodeSplit: false`) | 13 364 B | 0 |

  The last one is simpler — one file, no manifest, no walk — and it was
  declined: 39 312 B of it is `host-console-page`, `player-page` and
  `floor-clock`, three screens no indexable page ever shows. The 5 509 B between
  the two is 27 ms on the throttled profile, against 1 280 ms of queue removed
  either way, so the choice is not about speed. It is that a document should
  carry its own page.

- **A walk of Vite's manifest, not a list of files.** `stylesheetsOf` follows a
  chunk's static imports and collects their sheets, so a shared chunk the
  bundler splits off tomorrow arrives on the first paint without an edit here.
  A module the build did not emit throws, the way every other assumption in
  `prerender.ts` does.

- **The route module is written beside the import it mirrors.** `pageFor` in
  `routes.tsx` carries `lazy` and `module` in one entry, under one
  `satisfies Record<RoutedPath, …>`, because the prerender cannot read an import
  specifier back out of a closure and two separate tables would drift.

- **The page's own chunk is preloaded, not only its stylesheet.** Taking the
  stylesheets off the critical path exposes what was behind them: the router
  reaches a page through a dynamic import, so nothing names its chunk until the
  entry bundle has been downloaded, parsed and run — a serial round trip
  measured at 870 ms, during which the route fallback replaces the page the
  document had already painted. `preloadsFor` writes a `<link
  rel="modulepreload">` for that chunk and its static imports, minus what the
  template already requests, so it is in flight from the first response. The
  same manifest walk answers both, which is why one table of modules serves the
  styles and the preloads.

- **The theme is stamped by a script in the head, and only for an override.**
  `_tokens.sass` answers `prefers-color-scheme` in CSS on its own, which is why
  a screen following its system never flashed and must keep not depending on
  JavaScript. The script writes `data-theme` for an explicit `'light'` or
  `'dark'` and nothing else — the same condition `ThemeProvider` already
  applies, moved to where it happens before the paint rather than after
  hydration.

- **The two `theme-color` meta tags move with it.** They are media-scoped to the
  system preference, so an override left the browser's own chrome on the palette
  the page had just left — visible on a phone, and wrong for the whole session
  rather than for a second. The script flips their `media` in the same breath.


## Steps

1. `build.manifest: true` in `apps/game/vite.config.ts`.
2. `pageFor` in `routes.tsx` carries each page's manifest key beside its lazy
   import; `pageModuleFor` reads it back.
3. `PrerenderedPage` gains `module`, filled in `entry-server.tsx`.
4. `prerender.ts` walks the manifest, reads the sheets, and replaces the run of
   `<link rel="stylesheet">` with one `<style>`.
5. The same walk adds a `<link rel="modulepreload">` for the page's own chunk to
   the run the template already carries, minus what it already requests.
6. `main.tsx` holds `root.render` until the router can draw the real page,
   where and only where the document already drew one.
7. `index.html` gains the theme script, so the SPA fallback — `/host/:code` and
   the `/play/:code` a QR code lands on — gets it too.


## What it measured

Same three pages, three runs each, median, against the numbers
[19](19-locale-urls.md) published.

| | `/en` | `/en/blindtest` | `/en/credits` |
|---|---|---|---|
| performance | 0.93 → 0.95 | 0.95 → 0.95 | 0.94 → 0.96 |
| FCP | 2.1 s → 2.0 s | 2.1 s → 2.0 s | 2.1 s → 2.0 s |
| LCP | 2.7 s → 2.6 s | 2.68 s → 2.6 s | 2.68 s → 2.4 s |
| TBT | 114 ms → **40 ms** | 63 ms → 40 ms | 66 ms → 30 ms |
| CLS | 0 | 0 | 0 |
| **render-blocking resources** | **3 → 0** | **3 → 0** | **3 → 0** |
| accessibility · best-practices · SEO | 1 · 1 · 1 | 1 · 1 · 1 | 1 · 1 · 1 |

**The simulated scores barely moved, and that is the second stage running.**
They are not worth much here: the same build measured twice an hour apart gave
FCP 1.8 s and 2.0 s, a spread wider than anything that column shows, because
this machine runs other dev servers. Read the row that cannot drift — **no
render-blocking resource on any of the three**, where there were three — and
TBT, which fell by two thirds on the page that carried the most.

**The throttled timeline is where the change is legible.** Under
`--throttling-method=devtools`, the same way [19](19-locale-urls.md) got its
waterfall:

| | before | after |
|---|---|---|
| FCP | 2 224 ms | **1 044 ms** |
| the three stylesheets | 1 278 · 1 309 · **1 930 ms** | inlined; no request |
| the page's own chunk | 3 587 ms | **2 055 ms** |
| LCP element | the app-menu button | a paragraph of the page |

The document costs 3 226 → 8 293 B gzipped for that, and answers with one
response what took four.

**What a browser was actually asked**, because nothing above says whether a
screen works. With the bundles aborted, the page renders whole — five shelf
cards, the right ground — on all three route shapes at 390 px and 1 440 px, with
no horizontal overflow. With `taverla:theme` set to `dark` on a system
preferring light and `window.React` undefined, the dark field paints and the
`theme-color` tags have already flipped. And under 200 KB/s with the CPU at a
quarter, a `MutationObserver` installed before the first byte records the
wordmark arriving at 35 ms and **never leaving** — where the same observer
against the previous build recorded the route fallback holding the screen from
1 739 to 1 940 ms. `/play/ABCD` still shows its loader, 1 627 to 1 954 ms,
which is the case that had to keep working.


## Traps found while building

- **`replaceOnce` needs the links matched as one run.** Three separate matches
  fail its exactly-once guard, so `LINKED_STYLESHEETS` matches the whole
  consecutive run and a build that ever emits them apart fails loudly rather
  than shipping documents with their styles both inlined and linked.

- **Two sheets are fetched again after hydration, and that is fine.** Vite's
  preload helper re-injects a dynamic import's CSS unless a `<link>` with that
  exact href is already in the document, and an inline `<style>` is not one. So
  `button.css` and `home-page.css` are fetched a second time once the bundle
  runs — 6.1 KB raw, identical rules, after the page is interactive and off
  every path that matters. The tricks that would prevent it (`media="not all"`
  links, a `disabled` stylesheet) all key off the helper's internals.

- **`matchAll` groups are `string | undefined`** under this repo's
  `noUncheckedIndexedAccess`. `flatMap(([, href]) => href ?? [])` types as
  `string[]` where `map` does not.

- **The inline script is not transpiled.** Vite processes `<script type="module">`
  and `src=`, and leaves a plain inline script exactly as written, so it is the
  one place in the app whose syntax is not compiled down. Biome does not read
  `.html` either — the pre-commit hook filters on `.ts .tsx .js .jsx .mjs .json
  .css .scss`.

- **Blocking `**/assets/*.js` is how the first paint is actually verified.**
  A page loaded with its bundles aborted *is* the first-paint state, and it can
  be screenshotted and queried. `window.React` undefined beside a stamped
  `data-theme` and the dark ground on a light system is the whole proof, and no
  amount of waiting for a hydrated page produces it.

- **Taking the stylesheets off the path is what made the route fallback
  visible.** Lighthouse named `<p class="loader">` as the LCP element on three
  devtools runs out of three, at 3 341 ms: the page painted at 1 107 ms and was
  then replaced by a spinner until its chunk landed at 3 587 ms. It predates this
  stage, and [19](19-locale-urls.md) measured straight past it because a paint at
  2 224 ms left a window too narrow to win the LCP. **A number improving is how a
  fault becomes legible, not evidence there was none.**

- **An init script runs before `document.documentElement` exists.** A
  `MutationObserver` pointed at it throws, and an observer that was never
  installed reports the same empty log as a page where nothing happened — which
  is how two passes here concluded the loader never rendered. Observe
  `document`. Written up in [`../browser-driving.md`](../browser-driving.md).

- **`lhci` dies on Windows cleaning up its own temp file** — `ENOENT` on
  `unlink` of `.lighthouseci/flags-*.json`, mid-run, leaving a partial
  `manifest.json` behind and a preview server still holding the port. The next
  run then reads a manifest mixing two URLs, which is where a phantom SEO 0.92
  came from. One URL per invocation, and kill whatever still listens before
  retrying.


## What it did not buy

- **`theme-color` still does not follow the menu.** The script fixes the load;
  `ThemeProvider` does not touch the meta tags, so changing theme from the menu
  leaves the browser chrome on the previous palette until the next navigation.
  It was fixed on 4 September 2026.

- **Nothing was done about the 550 KB of JavaScript.** It no longer gates the
  paint, and it still gates interactivity. The dictionary split
  [19](19-locale-urls.md) repriced was settled here rather than left hanging:
  the unused locale is 6 610 B gzipped, 1.2% of a cold load, and splitting it
  buys less than the states it adds, so it is not coming back for a smaller
  number. What is left in that chunk is react-aria's locale
  machinery, 72 KB gzipped, which nobody has weighed.
