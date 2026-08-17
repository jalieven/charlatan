# Charlatan — Open Questions, Fourth Pass

Three decision passes are complete (OQ-1 … OQ-21, OQ-22 … OQ-32, OQ-27 / OQ-33 … OQ-39); all
decisions are folded into [01-requirements.md](./01-requirements.md) and
[02-flows.md](./02-flows.md) and the earlier register files removed. This fourth analysis
pass found the specification **largely converged**: no contradictions remain, and only two
items need a decision — one of them the result-screen design the product owner asked for.

Severity: **High** = blocks build. **Medium** = safe default exists. **Low** = edge case.

| # | Severity | Topic |
|---|---|---|
| OQ-40 | Medium | The five-act result screen — proposed design, validate |
| OQ-41 | Low | Whisper-availability micro-leak to a peeked Charlatan |

---

### OQ-40 · **Medium** — The result screen as five acts of progressive disclosure

The result screen (S8) had accumulated everything: winner, roles, words, steal guess, peeks,
blind doubles, Whisper disclosure, replay, and points — too much for one phone screen held up
to a table. Proposed design, now written into §4 step 8 and the S8 inventory:

**One act on screen at a time, advanced by tap.** The phone-holder becomes the narrator — a
game-show host reading the results aloud, act by act, instead of the table crowding around a
wall of data. Dramaturgy orders the acts for maximum table noise:

1. **The verdict** — who won, huge type, and the Charlatan identities: the app's single
   accent-color moment. (The loudest beat first; everything after is explanation.)
2. **The words** — real vs decoy, side by side. The "OHHH that's why you said 'beans'" beat.
3. **The secrets** — the steal guess shown for near-miss judging, who peeked, blind doubles
   earned, and the Whisper: who burned it, on whom, and the fake word. The "you did THAT on
   no information?!" beats.
4. **The replay** — every clue in order, grouped by cycle, annotated with vote outcomes:
   where the room's suspicion turned. The shareable, screenshot-friendly moment; the one act
   that scrolls (internally).
5. **The damage** — per-player point deltas, then Continue → scoreboard.

Mechanics: tap anywhere (or a ≥56 px Continue) advances; a five-dot progress strip shows
position; back-swiping to a previous act is allowed — everything on S8 is public, so no
privacy machinery is needed; each act fits one screen without scrolling except the replay;
one motion accent per act (per the "let one thing move" design rule).

**Validate the act order and mechanics** — in particular whether the verdict should come
first (maximum drama, spoils the replay's suspense) or last (builds suspense, but the table
has usually already guessed by then). The proposal deliberately front-loads it: after the
final vote, the table wants the answer, not a recap.

### OQ-41 · **Low** — Whisper-availability micro-leak

With the Whisper capped at **one per round, first-come in reveal order**, the "burn a
Whisper" target disappears from later role cards once any Charlatan has burned a card. A
later-revealing Charlatan who peeks, holds an unspent personal card, is not last in reveal
order, and *still* sees no Whisper target can deduce their unknown partner already whispered
this round — a small crack in partner anonymity, visible only to a peeked Charlatan.
**Proposed resolution:** accept it (spec'd as accepted in §3.6). The alternative — showing a
fake target whose release does nothing — is worse: the Charlatan would believe they whispered
when they didn't, and the result screen's disclosure would expose the app as having lied.

---

## Watch-list (not blocking, revisit during implementation or playtests)

- **Whisper cascade under parity:** a Whispered civilian who mistrusts their real word tends
  to get ejected — with eliminations plus the parity threshold, one Whisper can cascade into
  a Charlatan win. Probably the point of a high-risk tool; watch in playtests.
- **Charlatan count clamp vs scaling defaults:** the clamp (1…⌊players/3⌋) allows up to 4
  Charlatans at 12 players while the auto default never exceeds 2; a 4-Charlatan round ends
  at 4v4 parity. Legal but barely tested — consider labeling counts above the auto default
  as "experimental" in the setup UI.
- **Blind-double asymmetry on steals (decided, worth remembering in balance passes):** a
  blind hidden partner banks +8 off a teammate's +3 steal — the highest payout in the game
  for a player who did nothing knowingly. Explicitly wanted; keep an eye on it when tuning
  point values.
