## The screen nobody is touching

> **The premise below was overruled on 19 August 2026, and the conclusion came
> out stronger.** `PRODUCT.md` no longer says the phone is looked at rarely: it
> is read far more often than it is pressed, because the big screen is often
> somebody else's. The wake lock is *more* justified under that model, not less
> — a screen lock counts presses rather than attention, so the screen a player
> is reading goes dark while they read it. What follows is the diagnosis as it
> was written, and it reached the same fault from the opposite premise.

`PRODUCT.md` said the phone *is held one-handed and looked at rarely*, and that
success is the moment nobody is looking at their phone as a phone. That is not
an aside — it is the exact condition that makes a phone lock its own screen. The
product's best moment and its worst failure have the same cause.

The code already treats a locked screen as expected and painful. The whole of
`session-storage.ts` exists for it — `:55-70` names *the same path a phone takes
when it reconnects after a screen lock*, and `:89-95` calls a tab discarded on a
screen lock *routine on Android*. Every one of those lines is a recovery. None
of them is a prevention, and nothing in the app asks for one:
`navigator.wakeLock` appears **zero times**.

The console has the same fault with a bigger blast radius: a laptop that sleeps
mid-round stops the audio, and it is the room's only speaker.

## The myth that must not be relied on

**Playing audio does not keep any screen awake, on any platform.** Chromium's
media wake lock is `VideoWakeLock`, it is constructed only from an
`HTMLVideoElement`, and its `ShouldBeActive()` requires `HasVideo()` — an actual
video track. An `<audio>` element, an audio-only `<video>`, and an
`AudioContext` take no screen wake lock at all. The thirty-second Deezer preview
protects nothing. (The looping-silent-*video* trick the community used on iOS is
a different thing, and became unreliable anyway.)

## The API, and what it needs

`navigator.wakeLock.request('screen')`. Chrome 84, Firefox 126, **Safari 16.4 in
an ordinary tab** — the two-year gap where an installed Home Screen web app got
a valid sentinel and locked anyway was fixed in 18.4, and is moot here because
there is no manifest.

- **Secure context, and the document must be visible.** Otherwise it rejects
  with `NotAllowedError`.
- **No user gesture is required.** Chromium's own `wake_lock/README.md` says
  screen wake lock requests *are always granted without prompting or user
  activation checks*, justified by the `<video>` precedent. The many blog posts
  claiming a gesture is mandatory are wrong. Requesting from one is still the
  pragmatic default, for the iOS reason below.
- **It prevents dimming, locking and switching off** — but a manual power-button
  press still wins, by spec.

## The plumbing is the actual cost

The sentinel is released whenever the document stops being visible — tab hidden,
window minimised, app backgrounded — and the user agent may drop it for power
reasons at any time. It has to be re-acquired on the way back, and **the app has
no lifecycle handling whatsoever**: no `visibilitychange`, no `document.hidden`,
no `pagehide`, anywhere in `apps/game`. That listener is new ground, and it is
most of the work.

Track intent explicitly rather than copying MDN's snippet, which re-acquires on
`if (wakeLock !== null)` while nothing ever nulls the stale sentinel — so its
condition really reads *did I ever hold one*.

Where it goes is already decided by the rules: `navigator` may only be touched
in `infrastructure/env.ts` (`abstraction-boundaries.md:31`, which is where
`buzzFeedback` and `copyToClipboard` already live), so the request belongs
there and the hook belongs in `presentation/`, beside `use-phase-field.ts` —
the other thing that reaches document level from a phase.

## When to hold it

**The whole seated session, not the round.** Gating on
`PHASES_WITH_A_ROUND_IN_PLAY` is the tempting answer and the wrong one: a phone
that locks during the lobby misses the countdown, which is the moment it most
needs to be awake. Take it when a seat is taken, release it on `host.endGame`,
`player.leave` and `host.closeRoom` — the three exits already named in
`CLAUDE.md`.

The console holds it for as long as it is running a room, for the audio.

## Failure is a normal outcome

Low battery and power-saver modes may refuse or revoke the lock; the spec
sanctions both. `request()` failing is never an error to surface — no toast, no
`--danger` block, nothing. Catch and carry on.

One reported iOS quirk to design around rather than fight: re-acquiring inside
the `visibilitychange` handler can reject with `NotAllowedError` even on a
visible document. It is a community report, unconfirmed by Apple and unverified
on current iOS, so do not build a workaround for it — just make sure one failed
attempt is not the end. Retry on the next visible tick or the next tap.

## Verifying it

In a browser, muted, per `docs/browser-driving.md`. What is observable from
script is the sentinel and its `release` event, which is enough to prove the
acquire/re-acquire cycle: hide the tab, come back, assert a live sentinel again.
Whether the physical screen actually stays lit is a device's business and not
this session's.

## Adjacent, and deliberately not in scope

`buzzFeedback()` (`env.ts:12-18`) is the other half of *the phone is a buzzer*
and it is already right — thirty milliseconds, three call sites, all inside an
`onPressStart`, and a JSDoc that already says nothing may be built on top of it.
Two facts strengthen that comment rather than changing it: WebKit is formally
`position: oppose` on the Vibration API and has said it *wouldn't even be
possible to support on Apple's native platforms*, and Firefox **removed** it in
129 — Firefox Android 79+ returns `true` and vibrates nothing, so neither the
return value nor `'vibrate' in navigator` is a usable feature detect.

If a later session extends it, the rule it must not break: **never vibrate for
anything that starts a race.** In the reflex race, an Android player feeling the
flip while an iPhone player feels nothing is a measurable advantage, and *the
server decides anything that decides a winner* is the principle it would break.
Confirmation after the fact only — which is what the three existing call sites
already are.

## What landed

`keepScreenAwake()` in `infrastructure/env.ts`, `useScreenAwake(isWanted)` in
`presentation/use-screen-awake.ts`, and one line beside `usePhaseField` on each
of the two surfaces — `Lobby` in `player-page.tsx` and `HostConsole` in
`host-console-page.tsx`. Four files, no new dependency, no protocol change.

**The whole capability went to the boundary, not just the request.** The plan
put `navigator.wakeLock` in `env.ts` and the lifecycle listener in the hook;
that split leaks the sentinel's shape into `presentation/` for no gain, and
`abstraction-boundaries.md` asks for a capability rather than a wrapper.
`keepScreenAwake()` therefore owns the sentinel, the `visibilitychange` that
re-takes it and every way it can fail, and returns the release function — which
is exactly the shape `useEffect` wants, so the hook is four lines and the
`WakeLockSentinel` type appears in one file.

**The MDN trap was avoided without an intent flag on the sentinel.**
`sentinel.released` is the property that answers *do I still hold one*, so the
guard is `sentinel !== null && !sentinel.released` and there is no stale
sentinel to null out. An `isTaking` flag is still needed: two returns in the
same tick would otherwise both pass the guard before either request resolved,
and the second sentinel would leak.

**Both surfaces got the same rule**, where the plan gave the console a longer
one — held while it is running a room at all. The console's stated reason is the
audio, and a final board plays none, so the two rules only differed where the
reason had already run out. What ends it on either screen is
`status !== 'refused' && view?.phase !== 'finished'`.

**`host.endGame` is not the end of the room.** `replay` (`socket-handler.ts`)
takes a `finished` room back to `lobby`, so a phone that let its screen sleep on
the final board is re-locked the moment the table plays again, at the cost of
one unlock. That is the right way round: holding a screen awake in a pocket for
the rest of an evening is worse than one press.

## What the browser proved, and what it could not

Driven muted at `taverla:volume` `'0'`, with `navigator.wakeLock.request`
wrapped to count sentinels:

- the home page takes **nothing** — zero requests outside a room;
- the console takes one when the room opens, the phone takes one **in the
  lobby**;
- dropping the sentinel by hand and firing `visibilitychange` takes a fresh one,
  and three more returns while holding one take nothing — the acquire,
  re-acquire and don't-double-take paths;
- closing the room releases everything on the console (3 taken, 3 released) and,
  the case that matters, **on the phone that never navigated**: it sits on
  `/play/:code` showing *L'aubergiste a levé la table* with 2 taken and 2
  released. An implementation resting on unmount alone would hold that screen
  awake for as long as the tab lived.

Two things it could not be asked, and neither is worth a session:

- **Playwright does not background a tab.** Selecting another one leaves the
  first reporting `visibilityState: 'visible'`, so the user agent never released
  anything on its own and the return had to be simulated. Recorded in
  [`docs/browser-driving.md`](../../browser-driving.md).
- **No device has confirmed a screen physically staying lit.** That is a
  device's business, as this file said before the work started; what is provable
  from script is the sentinel, and the sentinel is proved.
