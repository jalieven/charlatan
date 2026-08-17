# Charlatan — Open Questions, Second Pass

The first-pass register (`03-open-questions.md`, OQ-1 … OQ-21) was fully decided by the
product owner; its decisions are folded into [01-requirements.md](./01-requirements.md) and
[02-flows.md](./02-flows.md) and the file was removed. This register is the result of
**re-running the ambiguity/contradiction analysis on the updated specification** — several
items below are new tensions introduced by the first-pass decisions themselves. Numbering
continues from the first pass (OQ-22 onward) so no reference is ever ambiguous.

Severity: **High** = changes game rules, scoring, or core UX; build is blocked until decided.
**Medium** = affects a feature's design but has a safe default. **Low** = cosmetic or edge case.

| # | Severity | Topic |
|---|---|---|
| OQ-22 | High | Swipe-up reveal vs the hold-to-reveal privacy principle |
| OQ-23 | Medium | Role announcement on ejection is structurally forced |
| OQ-24 | Medium | Whisper card pool semantics |
| OQ-25 | Medium | Whisper target selection & stacking |
| OQ-26 | Medium | Scoring edges: steals with hidden Charlatans, tie-limit wins |
| OQ-27 | Medium | Peek disclosure and the peek-timing leak |
| OQ-28 | Medium | The civilian no-peek reward may warp the point economy |
| OQ-29 | Medium | Join/leave details between rounds |
| OQ-30 | Medium | i18n details (carried over, formerly OQ-21) |
| OQ-31 | Low | Clue-warning specifics |
| OQ-32 | Low | Resume scope after reload |

---

## Contradictions & tensions introduced by the first-pass decisions

### OQ-22 · **High** — "Swipe up to uncover" vs the word-only-while-touching principle
The original notes made hold-to-reveal (word visible **only while a finger is down**) the
single most important interaction decision in the app. The new instruction says "the reveal
should be swipe up to uncover." Read literally — swipe once, word stays uncovered — this
destroys the core privacy invariant: a phone put down mid-reveal, grabbed early, or passed
carelessly shows the word to the room.
**Adopted interpretation (in §3.3):** the word sits behind a cover panel that the player
drags up **and holds**; it snaps shut the instant the finger lifts. This keeps the requested
swipe-up gesture while preserving the only-while-touching guarantee.
**Confirm:** is the snap-back behavior acceptable, or was a persistent uncover genuinely
intended? If persistent, define how the word is re-hidden before the phone moves on.

### OQ-23 · **Medium** — "Reveals nothing but their elimination" is impossible to honor
The OQ-13 decision text says an ejected civilian "reveals nothing but their elimination", but
the OQ-12 decision gives every ejected **Charlatan** an *immediate, visible* steal guess.
Whether the guess screen appears therefore broadcasts the ejected player's role every time —
hiding a civilian's role is structurally impossible while the immediate steal exists.
**Adopted:** every ejection openly announces the role ("NAME was a Civilian/Charlatan"),
matching classic Undercover and what the app leaks anyway.
**Alternative (bigger change):** defer all steal guesses to the end of the round so civilian
ejections stay role-silent; this weakens the immediate-guess beat chosen in OQ-12.

### OQ-27 · **Medium** — Peek must be disclosed for scoring, and peeking leaks in real time
Two sub-issues. (a) Blind doubles and civilian no-peek rewards are score inputs, so the
result screen must disclose **who peeked** — confirm this is wanted, since it also teaches
the room to read future behavior ("she never peeks"). (b) During the reveal phase, opening
the role card takes observable extra screen time; onlookers can see *that* someone peeked
(not what they saw). Since peeking now carries score meaning, that observation is real
information — arguably a feature (bluffing material), arguably a leak.
**Adopted:** disclosure on the result screen is required; live observability of peeking is
accepted as table theater (the role card itself stays identical for both roles). Confirm.

### OQ-28 · **Medium** — The civilian no-peek reward may warp the point economy
+1 per non-peeking civilian per round, unconditional, sits against +2 for a team win: a
civilian who never peeks collects half a win's value every single round, win or lose, for
doing nothing. Over a long session, "never peek, coast on rewards" may out-earn actually
hunting Charlatans; it also stacks oddly with the +1 correct-vote bonus (a peeking civilian
who carries the team can still earn less than an idle non-peeker).
**Proposed resolution:** keep the mechanic (it elegantly prices the peek for civilians) but
consider tuning: award the no-peek +1 only on rounds the civilian team **wins**, or halve the
win/vote points gap by raising the team win to +3. Decide after first playtests; the table in
§3.9 ships as written until then.

---

## Rule gaps & ambiguities in the new mechanics

### OQ-24 · **Medium** — Whisper card pool semantics
"At setup the amount of whisper-cards are configured (default 1)" leaves the pool's scope
open: per **session** or per **round**? Shared among all Charlatans or one pool per Charlatan?
With 2 Charlatans and 1 card, who gets it?
**Adopted (in §3.6):** one **session-wide shared pool**, default 1 (this matches the original
"once per game" ability with a configurable count). Cards are first-come-first-served in
reveal order: whichever peeked Charlatan burns a card first consumes it.
**Confirm**, especially: should the pool instead refill each round (making the default "one
Whisper per round")?

### OQ-25 · **Medium** — Whisper target selection & stacking
"A random next player" is adopted as: **uniformly random among the players who reveal after
the whispering Charlatan** (consistent with "unusable if the Charlatan reveals last"). The
plausible alternative — always the immediately next revealer — would make the target
predictable and the ability weaker but more aimed. Also unspecified with pools > 1: can two
Whispers land on the same player in one round (two banners? one?), and can the same Charlatan
burn two cards in one round?
**Proposed resolution:** uniform random among later revealers; at most one Whisper per target
per round; a Charlatan may burn at most one card per round.

### OQ-26 · **Medium** — Scoring edges the decisions created
(a) **Steal with hidden Charlatans:** a correct guess ends the round for *all* Charlatans;
adopted scoring gives +3 to the guesser and survivor points (+4/+8) to still-hidden
Charlatans — confirm the hidden partner should out-earn the guesser who actually won the
round. (b) **Tie-limit win:** a 3rd-consecutive-tie victory is scored as survival (+4/+8) for
all uncaught Charlatans — confirm ties "count" as surviving. (c) **Ejected-then-steal
Charlatan who never peeked:** they were caught, so no survival points; the +3 steal applies
regardless of peek status — confirm the blind double should *not* apply to a steal.
**Proposed resolution:** yes to all three as written in §3.9; revisit with playtest data.

### OQ-29 · **Medium** — Join/leave details between rounds
Adopted so far: roster edits happen only on the scoreboard between rounds; joiners start at 0
points; player count re-validated (4–12); Charlatan scaling re-derived. Still open: does a
leaver's score row stay on the scoreboard (proposed: yes, grayed out, restored if they
rejoin by the same name)? Can names be edited/renamed mid-session (proposed: no — rename =
leave + join, since there is no other identity)? Does a manual Charlatan-count override
survive a roster change that moves the player count across the 7/8 boundary (proposed: keep
the override if still within 1…⌊players/3⌋, else reset to auto)?

### OQ-30 · **Medium** — i18n details (carried over, formerly OQ-21)
Unchanged from the first pass, still undecided: (a) the **default locale** — assumed Dutch,
switchable to English on the Setup screen; (b) whether English UI strings must be
human-polished or may remain developer-written source strings; (c) whether the **word-pair
list** (game content, ~200 pairs) must also exist in Dutch for v1. Word pairs cannot be
translated 1:1 — confusability differs per language (koffie/thee works; many English pairs
won't) — so a Dutch list is a curation effort, not a translation task.
**Proposed resolution:** default locale Dutch; English source strings acceptable for v1;
word pairs ship as a separately curated Dutch list (Appendix A prompt adapted to Dutch),
since a Dutch-UI game with English secret words would be jarring.

---

## Low-severity items

### OQ-31 · **Low** — Clue-warning specifics
"The app could warn" is adopted as non-blocking warnings for: multiple words in the input,
and a clue identical to the player's own secret word. Open: should it also warn on a clue
matching an earlier clue this round (a common house rule), and are warnings logged to the
Ledger or private to the typer? **Proposed:** warn on duplicates too; warnings stay private;
nothing is ever blocked.

### OQ-32 · **Low** — Resume scope after reload
Adopted: full in-progress state (round, phase, cursor, words, votes, tie counter, scores)
persists on every transition and a reload resumes via the handoff interstitial. Open: how
long does an unfinished round survive (proposed: indefinitely until explicitly ended from
Setup, with a "resume or new game?" choice on launch), and is there any privacy concern in
a device's localStorage holding the secret words of an abandoned round (proposed: acceptable
— same trust model as the rest of the app)?

---

## Watch-list (not blocking, revisit during implementation)

- **Threshold + Whisper interplay:** a Whispered civilian who mistrusts their real word gives
  off-word clues and tends to get ejected — with classic eliminations, one Whisper can now
  cascade into a threshold win. Probably the point of a "high-risk sabotage tool"; watch in
  playtests.
- **Minimum-size rounds:** at 4 players (3 civilians + 1 Charlatan), the very first wrong
  ejection hits the threshold (2 = 1 + 1) — classic eliminations degenerate to sudden-death
  at the minimum table. Not a bug, but worth telling players.
- **Extra clue cycles and the "Go to vote" gate:** after ties/ejections the required-cycle
  count grows by one each loop; the Ledger's cycle grouping and the S4 cycle counter must
  handle rounds with e.g. 5 cycles gracefully.
- **Charlatans knowing each other:** with 2 Charlatans, the spec never tells Charlatans who
  their partner is (peeking reveals only "you are the Charlatan"). This is a deliberate
  difference from mafia-style games — confirm it's intended, since "friendly fire is
  allowed" on the Whisper only matters because partners are unknown.
