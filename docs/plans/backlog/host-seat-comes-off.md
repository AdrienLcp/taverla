## 14 · A host's seat comes off by itself

> *Note 8, second half — "quand l'hôte fait « jouer aussi sous le nom de », il
> est kické/déconnecté (on ne sait pas trop) après quelques rounds apparemment,
> et redevient juste « hôte ». Peut-être que ma co-testeuse a fait une mauvaise
> manip, mais chelou quand même."*

It is not a mis-tap. The seat lives in **two places that must agree** and one of
them is not persisted.

- On the server, `Connection.playerId`, set by `seatHost` from the `nickname` on
  the `hello` frame (`socket-handler.ts:198-256`). There is no seat message —
  a host that names itself takes a seat.
- On the client, `seatNickname`, **plain component state**
  (`host-console-page.tsx:94`), and the only thing that puts the nickname back
  on the next `hello`. Nothing writes it anywhere, where the host *token* and
  the session id are both in `localStorage`.

So a phone whose tab is discarded on screen-lock or an app switch — which is
routine on Android, and which is a *reload*, not a socket blink — comes back
with `nickname: undefined`, is seated `null`, and **cannot retake the seat**,
because `HostSeat` renders only in the lobby (`setup-fold.tsx:117-123`). The
answer form disappears, the *leave seat* exit disappears, the stale participant
greys out, and the sweeper deletes it ten minutes later. That is the reported
symptom exactly, including *after a few rounds*.

Three more paths reach the same place, and the third is the one to watch because
it needs no reload at all:

- **The sweeper.** `releaseAbandonedSeats` (`round-conductor.ts:410-437`) calls
  `forgetSeat`, which nulls `connection.playerId` on a **still-open** host
  socket with no frame sent. It fires on any participant stuck `isConnected:
  false` for `ABANDONED_SEAT_MS` — which is what a half-open iOS socket leaves
  behind. Ten minutes is *a few rounds*.
- **A second console.** `host_already_connected` is in `refusalVoidsSeat`
  (`packages/core/src/room/session-memory.ts:70-77`), so the refusal drops the
  session id; the retry mints a new one, `joinAsPlayer` no longer matches the
  host's own ghost participant, and it collides with it — `nickname_taken`,
  which is **non-fatal**, so the room comes back and the seat silently does not.
- **Room full on reconnect**, same silent landing.

### The structural fault, which is what the session actually fixes

**A seat that fails to be re-taken is reported as a non-fatal error frame and
nothing else.** There is no *you lost your seat* signal, the console's own copy
of the seat is unpersisted, and the only control that could restore it is gated
on the lobby. Three levers, and the session should take all three:

- **Persist the fact.** `taverla:seats` is already keyed per room *and role*,
  and `role: 'host'` is already a value in it — so what is missing is one flag,
  not a store. The name itself is already device-global in `taverla:nickname`
  (see [17](name-you-give-once.md)), so nothing new needs writing down.
- **Let the seat be retaken outside the lobby.** `HostSeat`'s lobby gate is what
  turns a recoverable state into a lost evening.
- **Say it.** A console that asked for a seat and did not get one should read
  the refusal, not discover it by noticing the answer form is gone.

### The fourth lever, found next door

**A seat can also outlive the reason it was allowed**, which is the same fault
read the other way. `HostSeat` is offered in the lobby to a game that needs no
judge and withheld from one that does — but nothing takes the seat *back* when
the room moves to a judged game, and the picker sits on the lobby stage where a
console can already be seated. So a host who takes a seat and then picks the
bare buzzer holds a seat with no buzzer behind it, on the board and unable to
score. Nothing hangs, which is why this is filed rather than fixed:
[the host may race](host-may-race.md) closed the twin that did hang, by giving
the reflex race a tap target rather than by revoking anything.

Whichever lever this session pulls, the seat's rule is the same on both sides —
**the room decides whether this console holds one, and the console follows** —
so the guard belongs where `isJudgedByHost` is read at the settings frame, not
only where the form is drawn.

### How to tell it is done

- A seated host reloads mid-round and comes back seated, with their score.
- A console that seats itself and then picks the bare buzzer does not keep a seat
  it cannot play.
- A second console takes the room and hands it back: the seat survives, or the
  screen says it did not.
- A socket test beside `second-console.test.ts` on the ghost-participant
  collision, since that path never touches a browser.

---

## Delivered, 17 August 2026

All four levers, and one the diagnosis did not name.

- **The name lives on `taverla:seats`, not as a flag beside
  `taverla:nickname`.** `RememberedSeat` grew `nickname: Nickname | null`, which
  *is* the flag — a seat is held exactly when it carries a name. The entry
  proposed a flag plus the device-global name, and that is wrong for the case it
  exists for: the global name belongs to whichever room this device joined last,
  so a console that seated itself as *Marina* and then joined a friend's room as
  *Adrien* would have come back to its own room renamed. The store is already
  keyed per room *and* role, which is the scope a seat's name actually has.
- **The seat is offered in every phase but a round in play**, not in every phase.
  Reopening the socket under a running clip is the one cost the lobby gate was
  paying for, and the reveal is close enough that nobody waits out a game. The
  entry's *lost evening* was the lobby gate, not the round.
- **The refusal was already said**, which is why lever 3 turned out to be the
  small one: `seatHost` sends a non-fatal error and the console renders it in the
  footer. The reported silence was upstream of it — nothing had *asked*. Nothing
  new says it, and the one thing that would have — a line derived from *asked and
  not seated* — was rejected on purpose: `view` is stale across a reconnect, so
  that line flashes on every seat taken. What replaced it is the form being
  reachable, which says the same thing without asserting a refusal that has not
  happened yet.
- **The room's rule is enforced in three places, not one.** `hostMustJudge` is
  read where the seat is granted (`seatHost`) and where the settings that allowed
  it change (`reconfigure`, which unseats every console holding one). The third
  is the console's own `changeSettings`: it drops the remembered name in the same
  breath as the frame, because that is the only moment the loss is knowable
  without watching the view come back.

The lever nobody had counted: **`HostSeat` had no `maxLength`**, where the join
form has always had one. A name over 20 characters is a `hello` the contract
refuses, so the socket never introduces itself and no form is left to explain it.
`NICKNAME_MAX_LENGTH` is exported from the protocol now, and both fields read it.

Two existing suites were describing a room the product forbids — a console seated
on a buzzer-mode blind test, which the settings frame now takes the seat back
from. `SEATED_CONSOLE_GAME` in the harness is the fixture they should have had.
One of them, `[eviction] gives a console back the answer when it removes its own
seat`, had already stopped testing anything: with no seat to remove it passed on
an empty roster.

`host-seat.test.ts` holds the four socket cases, the ghost collision among them.
What no socket suite reaches is the client half — that the browser now remembers
what to say — and that was checked by driving the console: seated, reloaded
mid-clip, back on the board with the answer form; the name cleared from storage
by hand to watch the old symptom return; the seat retaken from a reveal; and the
switch to the bare buzzer taking it back on both sides.

