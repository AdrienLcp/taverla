## 7 · Say it the way a table says it — **done, 15 August 2026**

**What shipped**, against what this entry expected — and most of it had already
happened before the session opened:

- **The register pass landed with the tavern copy**, in the session that renamed
  a room to *une table* and a host to *l'aubergiste*. The setup panel this entry
  wanted re-read in one sitting was re-read there: *Comment on répond · Quatre
  propositions · On tape · Le premier qui buzze* is what playtest 1 asked for.
- **The tagline question closed itself.** *Prenez place.* against *Prends
  place.* was a choice between two ways of addressing the room; the front door
  says **La taverne est ouverte.** now and addresses nobody, so there is nothing
  left to answer. Adrien never had to.
- **What was actually left was four sentences**, and they were the ones the note
  quoted: *"Tout le monde choisit parmi quatre, contre la montre"* — parmi four
  *what*, and then *la montre* twice in one breath once session 4 rewrote the
  arithmetic on top. They open on the shape of the round now: *Quatre
  propositions, et tout le monde répond en même temps.*
- **Playtest 11 is answered by naming them, up to three.** A count is what the
  room already knows; *Trouvée par Zoe* is the thing it does not. Past three the
  line is a wall of names on a board sized by how many candidates there are, and
  the count says more. **Naming who fell for a lie is the same call and it is
  deliberate**: the room watched the vote happen, the board already names who
  wrote each line, and the score pays the author per person caught — a count
  hides nothing and says less. Both strings are invariable (*Trouvée par …* /
  *Ça a mordu : …*), which is what keeps a name list out of the plural
  machinery.
- **Session 6's owed check is discharged here**: Le Fake's reveal carries the
  new standings without crowding, verified with a five-line board. A room of ten
  writing ten lies is still unmeasured, and that is the one to watch.
- **It was worth watching — measured 15 August 2026, and it was the worst
  overflow in the product.** Ten players, ten lies, votes spread so every line
  carries its own count: **2 377px of document against a 1080px screen**, 2.74×
  on a 1366 laptop. The standings ended at 2 028px — the half the room actually
  asks for, eight hundred pixels below the fold on a screen nobody walks over to
  scroll. Five lines fit and hid all of it.

  Three things fixed it, and none of them is new: the stage takes **two columns**
  above `$wide-screen` the way `voting` does one press earlier, the board
  **divides the viewport by its line count** the way the vote's board does, and
  each line stopped spending **three full-width rows** on a lie plus two short
  fragments — who wrote it and who it caught now share one row. 1920 tops out at
  1080px exactly; 1366 is a 1.26× scroll, down from 2.74×.

  Two traps, both of which cost a pass and neither of which fails loudly:
  **`container-type: size` needs a height imposed from outside** — a grid item
  that is `align-items: center`, or the stage itself getting its height from a
  chain of `flex: 1` under `min-height`, both resolve `100cqh` to nothing, every
  clamp lands on its floor and the screen merely looks a little small. And
  **`contain: size` also contains the overflow**: where ten lines do not fit at
  any legible size, the board ran out of its box and the launch button was drawn
  straight through it. Dividing `100dvh` minus the measured chrome keeps the
  worst case a scroll instead of a collision, which is what this screen already
  does below the split.

  ~~**Still open, and now measured**: the other three games' reveals print
  `Outcome`, one unbounded row per player.~~ Closed the same day, and it turned
  out to be four faults rather than one — three of them found by driving the
  screen the fix was for, which is the only place any of them were visible.

  **The list**, which is what was owed. `Outcome` writes `--outcome-rows` — its
  own count, not the room's, because a phone that never answered is in neither
  list — and the row divides `100dvh` minus the chrome, with its padding in `em`
  so a row is one multiple of its own type. The bare buzzer is excluded by
  selector rather than tuned: its reveal is a scoreline set in `billboard` on
  purpose, and only one player can ever be paid for a buzz.

  **The answer, which was worse and nobody had looked.** A quiz answer is
  catalogue text of unknown length at a fixed `9vmin`: the bank's median is 9
  characters, its 90th percentile 17, and its longest **83** — six lines and
  490px of a 587px budget, overrunning by 141px with *four* players on screen.
  `--answer-length` is published beside the row count and the clamp divides by
  it. Notes turned out to be French-only and on a fifth of the bank, which is
  why `:has(.note)` buys back six rows rather than a blanket allowance costing
  the other four fifths their type.

  **The bare buzzer's `billboard` had never applied.** `.reveal-panel.bare
  .scorers li` and `.reveal-panel .identity .scorers li` weigh exactly the same
  and `.bare` was written first, so the buzzer's entire screen carried one 28px
  line — *smaller than the standings beside it*. Moving the block to the end of
  the file is the whole fix, and nothing about it was visible in a build.

  **The count-in recap had inherited the same overflow**, because it is the same
  panel one phase earlier: eight players ran past the bottom and ten made
  1 291px. So the arithmetic moved to where both phases can reach it — the panel
  publishes `--outcome-header`, which is what it knows, and each stage subtracts
  it from the screen along with its own chrome, which is what the stage knows.
  A phase that sets no budget at all falls back to a number large enough that
  the clamp lands on its ceiling, so nothing else on the console moved.

  Measured at 1920×1080 across the bank's real distribution, seven answer
  lengths × four room sizes: **27 of 28 cases land at exactly 1080px**, every
  ten-player case included. The one left is French, a two-line answer, a note
  *and* twelve players, at 17px. The count-in fits to nine and scrolls 15px at
  ten, down from 211px. 1366×768 is a 1.19× scroll with no collision, and 414px
  is untouched — the arithmetic is inside the two-column branch, and the answer
  bound is inert wherever `9vmin` is already the smaller number.

---

> *Playtest 1 — "reformuler « tout le monde choisit parmi 4 ». La plupart des
> wordings ne font pas très naturels. Il faut ajouter « parmi 4 propositions » à
> la limite, ou reformuler autrement."*
> *Playtest 11 — "dans Le Fake, quand une seule personne a trouvé, on voit « 1 a
> trouvé » ; on pourrait afficher le pseudo ? Ou trop overkill ?"*

A copy pass over the host's setup panel and two reveal strings. English is the
reference — `dictionary-en.ts` types `dictionary-fr.ts`, so both move together or
neither compiles.

**The strings Adrien is quoting** are `quiz.scoring.*` and `blindtest.scoring.*`,
the hint under the answer-mode control (`settings-panel.tsx:291-293`, built by
`scoringKey`). *"Tout le monde choisit parmi quatre, contre la montre. La bonne
proposition rapporte 1 point, et les deux premiers à la trouver gagnent +2 et +1
en plus."* — one sentence carrying the mode, the clock, the base points and the
speed bonus. The mode labels themselves are `host.answerMode.*`
(`dictionary-fr.ts:174-179`): *Quatre propositions · On tape · Le premier qui
buzze*. The whole panel's inventory is worth re-reading in one sitting rather
than patching one line — it is roughly twenty-five strings, and their register
drifts.

Two things that are *not* only copy, and are why this session is not free:

- Whatever those hint strings end up saying, they **describe the scoring**, so
  they cannot be written before session 4 decides whether the bonus table
  changes. Take 4 first, or write these last.
- Playtest 11 is a one-line code change, not a translation.
  `revealedCandidateSchema` already carries `voterIds`
  (`packages/protocol/src/lefake.ts:40`) and it is on the player's view too;
  `revealed-lie-board.tsx:25-26` already holds `nicknameOf` and only uses it for
  authors. So *"Léa · Max · Sam"* is available without touching the protocol. The
  product question — whether naming who fell for a lie is funny or unkind at a
  table with children in it — is the session's, and `PRODUCT.md` names mixed-age
  families as the stricter audience.

**The tagline rides along**, since it is the same file and the same decision:
`home.tagline` is settled as **Prenez place. / Take a seat.**, with one thing
open — the four game taglines below it use *tu*, so vouvoyer above them is
inconsistent. The recommendation was ***Prends place.*** Adrien has not answered.

---

