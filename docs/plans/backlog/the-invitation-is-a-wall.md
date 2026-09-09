## The invitation is a wall, not a screen

`/invite/:code` exists to be thrown on a projector and left there. What it draws
is still a page somebody is standing at.

**It carries a control nobody can press.** The page renders nothing of its own
— `invite-page.tsx` is `<main><RoomInvitation /></main>` — and `RoomInvitation`
stamps a `CopyButton` beside the code (`room-invitation.tsx`). That button earns
its place on the other two stages the component serves: the host console, and
the menu popover where a host copies the code to paste it into a group chat.
On a wall it is a target four metres away with no pointer, and it is the only
thing on the screen that is not the invitation.

**The menu is on it too**, because `app-shell.tsx` is the layout route every
page renders inside and the menu is what "must exist on every screen" bought.
Every other screen in the product is one somebody is holding or standing at.
This one is furniture.

**The size seam is already there and is not the problem.**
`--invitation-code-size` and `--invitation-qr-max-width` are declared per stage,
against a `container-type` on the component itself — so a projector stage can
already ask for a wall's worth of code without touching the component. What is
missing is the *composition*: what a wall shows, and what it does not.

## What the session decides

The full join URL **stays** — it is what somebody with no camera types, and the
one line on the screen that is not decoration.

Two things it has to weigh rather than assume:

- **The menu carries language and theme.** Hiding it takes both off a screen
  where theme is not cosmetic: a dark field and a light one are very different
  walls, and the machine wired to the projector is often set up by somebody who
  is not the host. Options are hiding it outright and setting the page up before
  it goes full screen, or letting it fade on idle the way a video player's
  chrome does. The second is more machinery and the first may simply be right —
  decide it on the room, not on the tidiness.
- **The missing-room state is not a wall.** `invite-page.tsx` renders a heading,
  a line and a way home when the code resolves to nothing; that screen *is* read
  by somebody at a keyboard, and stripping its chrome would strip the only way
  out of it.

## Settled, so nobody re-opens it

**The new tab is right, and it is not a style preference.** The menu opens
`inviteUrlFor(roomCode)` with `target='_blank'` because a plain navigation off
the host screen closes the host socket, and the server cannot tell that from a
closed tab — the same rule that keeps every exit out of a plain link. The
`target` also makes it a document request rather than a client-side navigation,
which is what lets the tab be dragged onto the machine wired to the projector.
Both reasons still hold; do not turn it into an in-page navigation.

## Verifying it

Real browser, muted — `taverla:volume` to `'0'` before the first navigation. Two
sizes, because the point is the one this repository cannot open: a laptop at
1440 and a viewport wide enough to stand in for a projector. Confirm the code is
readable at a distance the screenshot cannot show by measuring it — the `code`
against the viewport, not against the card.

## What it did — **9 September 2026**

Both of the two it had to weigh came out on **the room**, and both answers are
the same sentence: this is the only screen in the product nobody is at.

**The copy button is gone from the wall alone.** `RoomInvitation` takes
`isUnattended`, and the invitation page is the one stage that passes it. The
other four are screens somebody is holding or standing at, and on those the code
is copied to be *sent* — the console's lobby, the console mid-game, the menu's
popover, and a player's phone showing the code to a friend. Hiding a live
control with a page stylesheet was the cheaper edit and the wrong one: it stays
in the tab order, it keeps mounting a component with a timer in it, and the next
person to reorder the markup un-hides it with nothing to warn them.

**The menu fades instead of going.** The entry offered hiding it outright and
called that possibly right; it is not, and the case that kills it is the one the
entry itself raised. The machine wired to the projector is often not the one
running the room, so the tab is as likely to arrive by somebody typing the URL
on an event PC as by being dragged across from the host's browser — and that
browser has its own `taverla:theme`. With the menu gone, a light field in a dark
room has no way to be said, on the one screen the product promises at four
metres. There is no *before* to set it up in when the URL was typed straight in.

So `useIdleChrome` stamps `data-idle` on the root four seconds after the last
pointer, key or focus, and `app-menu.sass` reads it — the same seam
`usePhaseField` already uses to let a page decide the colour of the field, which
is the only way a page can reach chrome the shell draws one level above it. It
is armed on arrival rather than on the first event, because a wall nobody sets
up is the common case. Two exclusions, and neither is a state this code
invented: `:focus-within`, and the trigger's own `aria-expanded` — the popover
is portalled out of the box, so somebody reading it with no pointer moving would
otherwise have it fade under them.

**The missing room keeps every bit of its chrome**, as the entry asked. The hook
is passed the same predicate the page branches on, so nothing is ever stamped
there.

## What the browser found that no reading would have

**The code was breaking in half, and it had been all along.** `28cqi` put a
four-character code 40px wider than its column at 1920, and `word-break` split
`VGDQ` into `VGD` and `Q` — two objects on the one screen allowed to carry a
single idea. The size seam this entry called *already there and not the problem*
was the problem.

The number is now measured rather than chosen. Four `W` — the widest glyph
`ROOM_CODE_ALPHABET` holds — set in `monument` come to **4.78 times their own
font size**, so a code holds one line up to `100 / 4.78 = 20.9cqi` and no
further.

**The console had the same fault, one tenth of a unit deep.** Its
`--invitation-code-size` read `21cqi` on the estimate that four characters *need
every bit* of it. They need slightly less than all of it: `WWWW` is the one code
in six hundred thousand that `21` breaks in half, and it is now `20` there too.
The comment that carried the estimate carries the measurement instead.

| | code | column | worst code (`WWWW`) | lines |
|---|---|---|---|---|
| wall, 1920×1080 | 201px | 1003px | 959px | 1 |
| wall, 1440×900 | 152px | 760px | 727px | 1 |
| console, 1920×1080 | 191px | 953px | 911px | 1 |
| console, 1440×900 | 150px | 751px | 718px | 1 |

Driven muted, both palettes, both widths: no horizontal scroll, no control left
inside the invitation on the wall and the copy button still named on the
console, the chrome gone at four seconds and back on the first pointer, pinned
while the popover is open, and `prefers-reduced-motion` collapsing the fade to
`0s` without stranding it half-drawn.
