---
description: A superseded HTTP request is aborted, not merely ignored — the signal, the effect cleanup, the abort that is never an error
paths:
  - "apps/game/src/**"
  - "apps/server/src/infrastructure/**"
---

# A superseded request is aborted

A request fired because a value changed — a toggle, a route param, an effect
dependency, a difficulty — is cancelled the moment a newer one replaces it, and
on unmount. A stale-write guard (`isCurrent`, a counter) only hides the answer;
the request keeps running, and on the preview routes it keeps spending the
Deezer quota on a fan-out nobody reads. A debounce limits how often requests
start, never the order they resolve in.

## The shape here

- **Every function in `taverla-api.ts` takes an optional `signal`** and forwards
  it to `fetch`. A signal dropped on the way is no signal.
- **`aborted` is an `ApiFailure`, never an `ApiError`.** `apiErrorKey` accepts
  only `ApiError`, so the compiler makes a caller handle an abort before it can
  render one — drop it, write no state.
- **The owner of the request owns one `AbortController`**: an effect creates it
  and aborts it in its cleanup, then reads `controller.signal.aborted` instead of
  an `isCurrent` flag; a hook that asks on demand keeps it in a ref, aborts the
  previous one before each new request and aborts on unmount
  (`use-playlist-preview.ts`).
- **A poll waits for its answer** before scheduling the next (`setTimeout` after
  each, never `setInterval`), so one is in flight at a time
  (`wall-pairing-page.tsx`).
- **The server forwards the browser's abort**: a route passes
  `context.req.raw.signal` down to `deezer-client.ts`, which races it against its
  own timeout with `AbortSignal.any`, and an abort is not logged as an outage.

A one-shot press (create a room, pair a wall, join with a code) is not
superseded by anything and needs no controller.
