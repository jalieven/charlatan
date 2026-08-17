# Charlatan — Open Questions, Inconsistencies & Gaps

Every item below is something the source notes contradict, leave ambiguous, or simply do not
say. Each has a **proposed resolution** — the requirements in
[01-requirements.md](./01-requirements.md) are written against these proposals, so rejecting a
proposal means amending that document too.

Severity: **High** = changes game rules, scoring, or core UX; build is blocked until decided.
**Medium** = affects a feature's design but has a safe default. **Low** = cosmetic or edge case.

| # | Severity | Type |
|---|---|---|
| OQ-4, OQ-12, OQ-13, OQ-15, OQ-18 | High | Contradiction / rule gap |
| OQ-2, OQ-3, OQ-9, OQ-11, OQ-19, OQ-20 | Medium | Ambiguity / gap |
| OQ-1, OQ-5, OQ-6, OQ-7, OQ-8, OQ-10, OQ-14, OQ-16, OQ-17 | Low–Medium | Under-specification |

---

## Contradictions (the source disagrees with itself)

### OQ-4 · **High** — Hard mode and the Whisper contradict "the Charlatan may not know"
The core design bet is that a Charlatan holding a related word *"may not know they're the
Charlatan"*. But two other features require the Charlatan to knowingly act as the Charlatan
**at reveal time**: secretly picking a risk level "before the round" (hard mode), and arming
the Whisper. You cannot wager on being the Charlatan without being told you are the Charlatan.
Worse, if the reveal screen shows a wager control only to the Charlatan, its mere presence
outs the role — destroying the flagship mechanic.

**Proposed resolution:** every player's reveal screen shows an identical, optional "press and
hold 3s to peek at your role" affordance. Peeking is a free choice: a Charlatan who never
peeks keeps the delicious uncertainty; one who peeks unlocks the wager and Whisper controls
(civilians who peek just see "Civilian"). Hard mode is then re-specified as *chosen at reveal,
only by a Charlatan who has peeked* — "before the round" in the source is read as "before the
clue phase". This preserves both mechanics at the cost of making hard mode/Whisper opt-in
knowledge.
**Alternative:** drop the "may not know" property for rounds where wagers are enabled.

### OQ-18 · **High** — "No timer" vs "a progress ring on the discussion timer"
The rules section states flatly *"There shouldn't be a timer"* and gates voting on clue count.
The design section then offers *"a progress ring on the discussion timer"* as a motion
example.

**Proposed resolution:** there is no timer anywhere in the app; the design section's example
is replaced by "a subtle scale on the revealed word" and animated phase transitions, which the
same sentence also suggests. (Adopted in 01-requirements §6.4.)

### OQ-17 · **Low** — The stated phase machine is missing phases the features require
The implementation section says the app is *"one phase state machine (setup → assign → reveal
→ discuss → vote → result)"*, but the feature list adds a scoreboard **between every round**,
a Charlatan guess step, a tie-loop back into clues, a multi-Charlatan loop, and a dossier
view. The six-phase chain cannot express its own feature list.

**Proposed resolution:** the canonical phase set is
`setup · assign · reveal · clues · vote · verdict · guess · result · scoreboard` (dossiers as
an overlay on scoreboard), as diagrammed in 02-flows.

---

## Rule gaps (flows that can occur but have no defined outcome)

### OQ-13 · **High** — What happens when the group votes out a Civilian?
The source only says: *"if tie: continue clues, if majority voted one user: end screen is
shown with result or if there are more imposters: back to clues."* It never says what happens
when the ejected player is a **Civilian** — the most common failure case in play. Two readings:
(a) literal: any majority ejection of a non-Charlatan ends the round → Charlatans win
immediately; (b) classic social-deduction: the Civilian is eliminated and play continues with
fewer players until a Charlatan is caught or Charlatans reach parity.

**Proposed resolution:** reading (a) — the round ends, Charlatans win. It is simpler, keeps
rounds short (party pacing), and matches "end screen is shown with result". Reading (b) is a
bigger rules change and needs its own elimination/parity rules if chosen.

### OQ-12 · **High** — Multi-Charlatan round: what does the first caught Charlatan get?
With 2 Charlatans (8+ players), catching one sends play *"back to clues"*. Undefined: does the
first caught Charlatan get their steal guess immediately or at round end? Are they revealed as
a Charlatan? Do they keep giving clues? Can their steal end the round for both?

**Proposed resolution:** on ejection, the role is revealed, the caught Charlatan guesses
**immediately** (the tension is highest then); a correct guess steals the round for all
Charlatans; a wrong guess removes them from clues and voting and play returns to clues. They
also stop being a Whisper/wager actor.

### OQ-15 · **High** — The scoring system doesn't exist
A scoreboard is shown between every round and hard mode pays *"double points"* — but the
source never defines base points for anyone: surviving Charlatans, catching civilians,
correct individual votes, or steals. "Double" of an undefined number.

**Proposed resolution:** adopt the table in 01-requirements §3.9 (Civilians +2 on a win, +1
personal correct-vote bonus, Charlatan survival +4, hard-mode survival +8, steal +3) as a
starting balance and tune in playtesting.

### OQ-11 · **Medium** — The tie loop can run forever
Tie → one more clue cycle → revote, with no timer and no cap. A stubborn group can loop
indefinitely; also unclear whether **every** revote requires a full extra clue cycle.

**Proposed resolution:** each tie inserts exactly one extra clue cycle before the revote. No
hard cap (groups self-resolve in practice), but revisit after playtesting; a possible cap is
"3rd consecutive tie → Charlatans win".

### OQ-19 · **Medium** — No session end condition
Scores accumulate "between each round", but nothing defines when a session ends: target
score? round count? The scoreboard needs an answer for what "winning the evening" means.

**Proposed resolution:** sessions are open-ended; the scoreboard always shows a ranked
leaderboard and the group stops when they want. No target score in v1.

### OQ-20 · **Medium** — Vote timing is coupled to a configurable value by accident
*"Voting after 2 rounds"* and *"this 2 clues per user can be modified"* appear independently.
We read them as the same knob (vote after N clue cycles, N configurable, default 2) — but the
source never says the vote trigger follows the modified value.

**Proposed resolution:** one knob. N clue cycles → vote, N set at setup (default 2).

---

## Ambiguities & under-specification

### OQ-9 · **Medium** — The Whisper is underdefined on five axes
*"Once per game"* — per round or per session? *"The next player"* — next in reveal pass order
(then a last-revealing Charlatan can never use it) or next speaker? How is the wrong word X
chosen? What if the next player is the other Charlatan? Is the Whisper's use disclosed at the
result?
**Proposed resolution:** once per **session** per Charlatan seat; targets the next player in
**reveal pass order** (unusable if the Charlatan reveals last — accepted cost of a high-risk
tool); X comes from the word pair's curated distractor list (see the generation prompt,
Appendix A); if it hits the other Charlatan it is silently wasted; usage is disclosed on the
result screen.

### OQ-2 · **Medium** — Host override bounds for Charlatan count
Override is required but unbounded: could a host pick 3 Charlatans among 5 players?
**Proposed resolution:** clamp to 1…⌊players/3⌋.

### OQ-3 · **Medium** — Range of "clues per player"
"Can be modified" with no range. **Proposed resolution:** 1–4, default 2.

### OQ-1 · **Low** — Minimum and maximum player count
Scaling starts at 4; nothing about 3 players (mathematically playable, socially weak) or an
upper limit. **Proposed resolution:** 4–12 in v1.

### OQ-5 · **Low** — Is "blank mode" a selectable game mode?
The source argues word mode "beats" blank mode, then reintroduces blank words as the
hard-mode wager. Unclear if a global blank mode should still exist as an option.
**Proposed resolution:** no global blank mode; blank exists only as the hard-mode wager.

### OQ-6 · **Low** — Word pair mechanics left unstated
Which side of a pair is the real word; whether pairs repeat within a session; whether both
Charlatans (8+) get the same decoy word.
**Proposed resolution:** random orientation per round; no repeats within a session; all
Charlatans share the same decoy word.

### OQ-7 · **Low** — Charlatan-only UI leaks the role to onlookers
Any control visible only on the Charlatan's reveal screen (wager, Whisper), or extra time
spent using it, can be read by people watching the player's face and thumb time.
**Proposed resolution:** identical layout and interaction affordances for all roles (see the
peek mechanic in OQ-4); wager/Whisper live behind the peek so every player's screen supports
the same gestures for the same durations.

### OQ-8 · **Low** — "Randomize who speaks first each round"
Per game round or per clue cycle? **Proposed resolution:** per game round; order is stable
within a round (stable order is itself information players use).

### OQ-10 · **Low** — Ballot rules
Self-votes? Abstentions? Can ejected players vote in multi-Charlatan continuations?
**Proposed resolution:** no self-votes, no abstentions; ejected players neither clue nor vote.

### OQ-14 · **Low** — How is the steal guess adjudicated?
Spoken aloud (humans judge) or typed (app judges)? Exact match?
**Proposed resolution:** typed into the app; case-insensitive, trimmed, basic
singular/plural tolerance; the group can see the guess on the result screen, so obvious
near-misses can be house-ruled.

### OQ-16 · **Low** — Dossier identity, collisions, and reset
Dossiers key on typed names across sessions: "Sam" tonight may not be last week's "Sam";
duplicate names in one game collide; no stated way to clear stats.
**Proposed resolution:** names are unique within a session (validated at setup); dossier
matching is exact-name, case-insensitive; a reset control (per player and global) lives on
the Dossiers screen. Accepted risk: name reuse across groups pollutes stats on a shared
device.

---

## Things the source is silent on (flagged, no proposal needed yet)

- **Interruptions:** phone locks, browser refresh, or an accidental back-swipe mid-round —
  should in-progress round state survive a reload? (PWA makes resume cheap via persisted
  state; recommended, but unspecified.)
- **Late joiners / early leavers:** players joining or leaving between rounds of a session.
- **Accessibility:** hold-to-reveal excludes some motor-impaired players; no alternative is
  specified.
- **Localization:** word pairs are language-bound; the 200-pair list is single-language in v1.
- **Clue validation:** "one-word" is enforced how? (single token proposed) Duplicate clues,
  saying the secret word itself, or clueing with a proper noun are all unregulated — party
  convention says the group polices this, but the app could warn.
