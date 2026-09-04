# The backlog — index

**Read one entry.** The tables below are enough to choose; open the single file
of the session you take, and nothing else. Delivered sessions keep their file so
what they found stays readable, and are never opened to plan new work.

What a session picks up next, and nothing that is already in flight — the
uncommitted tree is the job of the handoff files under `.handoff/`, which are
local to one machine. This one is committed, because a backlog that dies with a
laptop is a to-do list somebody has to remember.

Each entry is **scoped to one session**. Read it, read what it links, and update
it when reality diverges. A session that turns out to be two says so in its own
file rather than half-landing.

## Open

Four entries, and one is a fault. The last playtest fault waits on a phone
rather than on a session; two beside it are decisions the oklch palette opened
and nobody has taken; the fourth is what stage 20 found while fixing its own
half of it.

| Session | In one line | Cost | Starts with | Holds |
|---|---|---|---|---|
| [The room is silent, unexplained](silent-room-unexplained.md) | **Half done.** Two of the three causes are ruled out and the console names the third; one reading on the Android phone closes it | waits on a phone | — | note 6, and what each of the three lines means |
| [The borders that do not quite carry](borders-that-do-not-quite-carry.md) | `--rule` is 1.84:1 and two of its twelve uses are a control's border, not a divider. Decide whether WCAG 1.4.11's 3:1 applies to a frame around type that already reads | small, one decision | the two uses that are not dividers | the argument both ways, and the cheap third answer |
| [The fields a phone could show](fields-a-phone-could-show.md) | `oklch()` can name a colour sRGB cannot, and every phone in the room has a P3 screen. Three fields would gain; the twelve contrast pairs would need re-measuring | a session, and a phone to review on | the three highest-chroma fields | why it is a design decision and not a conversion |
| [The chrome keeps the palette the page left](theme-color-after-the-menu.md) | The two `theme-color` tags are media-scoped to the system, so a theme changed from the menu leaves a phone's address bar on the old ground until the tab closes. Stage 20 fixed the reload, not the switch | small, one effect | `ThemeProvider`'s stamping effect | why the `'system'` branch is the hard one |

**One diagnosis disagrees with the note that raised it** — read the entry before
planning it:

- **A seated host's clip is not withheld.** The server sends `audioUrl` to a
  seated host and holds back only the title and artist. *Le son ne sort pas
  d'ici.* is an autoplay message that predates the seat entirely, and the
  silence has a different cause. **Do not pick a fix before somebody has read
  the refusal on the Android phone that produced note 6.**

## Delivered

| Session | Landed |
|---|---|
| [A reconnecting phone stays half-dead](reconnecting-phone-half-dead.md) | 15 Aug 2026 |
| [Three exits that say nothing](three-exits-that-say-nothing.md) | 15 Aug 2026 |
| [The question bank's spelling](question-bank-spelling.md) | 15 Aug 2026 |
| [Speed pays by rank; it should pay by the clock](speed-pays-by-rank.md) | 15 Aug 2026 |
| [Two controls that break on their content](controls-that-break-on-content.md) | 15 Aug 2026 |
| [The gap between two rounds](gap-between-two-rounds.md) | 15 Aug 2026 |
| [Say it the way a table says it](say-it-the-way-a-table-says-it.md) | 15 Aug 2026 |
| [The winner gets a moment](winner-gets-a-moment.md) | 15 Aug 2026 |
| [Arriving cold in a running blind test](arriving-cold-mid-blind-test.md) | 15 Aug 2026 |
| [Stage 18 — Reflex race](../18-reflex-race.md) | the fifth game |
| [The field the whole game is typed into](field-the-game-is-typed-into.md) | 16 Aug 2026 |
| [The speed bonus nobody sees](speed-bonus-unseen.md) | 16 Aug 2026 |
| [The host may race](host-may-race.md) | 16 Aug 2026 |
| [The board a phone never sees](board-a-phone-never-sees.md) | 16 Aug 2026 |
| [Who owns a room](who-owns-a-room.md) | 15 Aug 2026 |
| [A host's seat comes off](host-seat-comes-off.md) | 17 Aug 2026 |
| [A name you give once](name-you-give-once.md) | 17 Aug 2026 |
| [Decades on the shelf](decades-on-the-shelf.md) | 17 Aug 2026 |
| [Edges the page already took](edges-the-page-already-took.md) | 19 Aug 2026 |
| [The screen nobody is touching](screen-nobody-is-touching.md) | 19 Aug 2026 |
| [The film a table shouts](the-film-a-table-shouts.md) | 19 Aug 2026 |
| [Everything the phone is already sent](everything-the-phone-is-already-sent.md) | 19 Aug 2026, in two halves |

**Three delivered entries are worth opening**, and each warns about a different
half of what is written here.

[The question bank's spelling](question-bank-spelling.md): two of the three
faults it was given turned out not to be faults at all. A **diagnosis** written
here can be wrong.

[Decades on the shelf](decades-on-the-shelf.md): the diagnosis held in full and
the **shape it prescribed** was overruled — it argued for reusing the `playlist`
arm and counted "no protocol arm" as the saving, where that turned out to be the
cost. So an entry's *what is wrong* is worth more than its *so build this*, and
the second is the half a session may throw away.

[The film a table shouts](the-film-a-table-shouts.md): the diagnosis was right
about *where* the fault was and wrong about *what* it was. It read
`CATALOGUE_NOISE` as the thing to fix, and the answer was to stop asking for the
title at all — the regex was never touched, and is now used to clean the line it
was accused of ruining. Its two measured numbers, the floor and the composer
count, were both replaced by measuring again. So even a number an entry took the
trouble to measure is a starting point.

## Where this came from

Two playtests, one audit and one idea, all four traced into the code before being
written down, so every entry is a diagnosis and not a wish.

- **14 August 2026**, Adrien and Marina, on an iPhone and a laptop — thirteen
  observations, which became the twelve delivered entries above.
- **16 August 2026**, Adrien and a co-tester, on Android — eight notes, *note 1*
  through *note 8*, which became the one entry from that batch still open,
  [decades on the shelf](decades-on-the-shelf.md),
  [a name you give once](name-you-give-once.md),
  [a host's seat comes off](host-seat-comes-off.md),
  [the field the whole game is typed into](field-the-game-is-typed-into.md),
  [the speed bonus nobody sees](speed-bonus-unseen.md),
  [the host may race](host-may-race.md) and
  [the board a phone never sees](board-a-phone-never-sees.md).
- **19 August 2026**, a survey of five browser APIs against this codebase and
  another — screen wake lock, vibration, `navigator.locks`, web share, and every
  `env()` variable that exists. Three of the five were settled as *no* and are
  recorded as settled inside the two entries, so nobody re-surveys them. The two
  that landed here differ from everything above in one way worth stating: they
  were **traced in the code but never seen in a room**. [Edges the page already
  took](edges-the-page-already-took.md) was a fault by arithmetic on committed
  tokens, delivered the same day against insets a browser was told to fake — a
  notched phone has confirmed neither the fault nor the fix. [The screen nobody
  is touching](screen-nobody-is-touching.md) is nearer *what is missing* than
  *what is wrong*, and landed the same day — the acquire and re-acquire cycle
  is proved from script, but whether a screen physically stays lit is a device's
  business, and no device has said.
- **19 August 2026**, an idea rather than an observation — *"musiques de films
  in the blind test, can we?"* — traced into the code and measured against
  Deezer the same afternoon, which is what turned it into [the film a table
  shouts](the-film-a-table-shouts.md) rather than a wish. It is the first entry
  here that no room asked for, the only one where nothing was broken, and it
  landed the same day.

Three times now, a session's own design question turned out to have been
answered before it was asked. It is the ratio [the plans'
README](../README.md) warns about: *the plans cover what is missing; what is
wrong surfaces by playing.*

## Settled, so nobody re-opens them

- **The 10 883 "pending" OpenTDB questions do not exist locally.** They are
  OpenTDB's own review queue; the API serves only the 5 298 verified rows, which
  are already bundled. Getting them means scraping, which
  [stage 14](../14-question-languages.md) rejected on purpose. Recommendation: no.
- **Emoji reactions**: not for now.
- **Mid-game joining stays**: a phone that arrives takes a seat and plays from
  the next round.
- **The dictionaries are not split.** [Stage 19](../19-locale-urls.md) left this
  open on new terms — off the first-paint path, worth bandwidth and post-paint
  blocking time — and [stage 20](../20-critical-css.md) is what made those terms
  measurable. Measured: the unused locale is **6 610 B gzipped**, against a
  `i18n-provider` chunk of 79 028 B and roughly 550 KB of JavaScript on a cold
  load. That is 1.2% of what a phone downloads and about 35 ms of a 200 KB/s
  connection, spent after a paint that now happens at 1 044 ms. Stage 19's
  "43 KiB" was the raw figure; gzip is what travels.

  Against it stands a permanent cost that no measurement shrinks: a provider
  with a not-yet-loaded state, a fetch on the language switch, and an SPA
  fallback that does not know its locale — on party Wi-Fi, three new ways for a
  screen to have no words on it. **Recommendation: no**, and it does not come
  back for a smaller number.

  The finding worth keeping is the other one: **87% of that chunk is not
  dictionaries**. 72 KB gzipped of it is react-aria's locale machinery, which is
  a different question and the only one worth asking about this chunk.
