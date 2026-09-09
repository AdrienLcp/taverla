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
