# Charlatan — Open Questions, Third Pass

Two decision passes are complete: OQ-1 … OQ-21 (first register) and OQ-22 … OQ-32 (second
register) were decided by the product owner, folded into
[01-requirements.md](./01-requirements.md) and [02-flows.md](./02-flows.md), and their files
removed. This register is the result of **re-running the ambiguity/contradiction analysis on
the updated specification**. Numbering continues (OQ-33 onward); **OQ-27 is carried over
unchanged in number** because the product owner asked for an explanation before deciding it —
that explanation is below.

Severity: **High** = changes game rules, scoring, or core UX; build is blocked until decided.
**Medium** = affects a feature's design but has a safe default. **Low** = cosmetic or edge case.

| # | Severity | Topic |
|---|---|---|
| OQ-27 (carried) | Medium | Peek disclosure & observability — awaiting decision |
| OQ-33 | Medium | Parity threshold confirmation ("maybe" in the decision text) |
| OQ-34 | Medium | Personal Whisper cards × roster changes |
| OQ-35 | Low | Two Whispers in one round: targets & distractors |
| OQ-36 | Low | Steal pays a flat +3 to every Charlatan — even a blind hidden partner |
| OQ-37 | Low | No-peek +1 for eliminated civilians on a team win |
| OQ-38 | Low | Locale fixed per session; per-locale word lists and draw pools |
| OQ-39 | Low | Acceptance criteria for "human-polished" English strings |

---

## OQ-27 (carried over) · **Medium** — Peek disclosure & observability, explained

With the one-thumb reveal grammar now settled (OQ-22), this question is **not** about the
role card's on-screen content or gestures — those are already role-neutral by spec. It is
about two remaining information channels around the *act* of peeking, which now has score
meaning:

**(a) Post-round disclosure.** Blind doubles and the civilian no-peek reward are score
inputs, so the result screen must show **who peeked** — otherwise the points summary is
unexplainable ("why did Sam get +8?"). Consequence: every player's peek choice becomes public
knowledge after every round, and the table will build a meta around it ("Jan *never* peeks").
That meta is probably fun, but it is a real, permanent side effect of the scoring design —
confirm it's wanted.

**(b) Live observability.** The room can physically watch the player holding the phone. The
long-press peek is a visibly different act than just swiping the word up (different thumb
position, ~800 ms dwell on a button). So even with perfect on-screen parity, observers can
often tell **that** someone peeked — never *what they saw*, but the fact itself. And the fact
alone is informative now: a player seen peeking has, if they turn out to be the Charlatan,
given up the blind double — so "she peeked" slightly shifts how her later confidence reads.
The choices are: accept this as table theater (players may even peek-bluff), or engineer it
away — e.g. force every player through a mandatory dwell on the role button whether or not
they actually peek (making the act invisible but adding friction for everyone, and destroying
the civilian no-peek choice as an *observable* act of confidence).

**Proposed resolution:** accept both. (a) The result screen discloses peeks — the scoring
requires it and the meta is a feature. (b) Live observability is accepted as part of the
social game; no mandatory dwell. The spec is written against this proposal.

---

## New items from this pass

### OQ-33 · **Medium** — Parity threshold: confirming the "maybe"
The decision text hedged: *"Maybe it's better to end the round when amount of civilians
equals Charlatans."* The spec now adopts that: **Charlatans win at parity** (civilians =
Charlatans), replacing the earlier civilians = Charlatans + 1. Knock-on effects, all now in
the spec, worth confirming as a package:
- 4-player tables get one mistake of slack (3v1 → wrong ejection → 2v1 → play continues →
  only a second wrong ejection reaches 1v1 and ends it).
- Rounds can now reach a 2-player endgame (1 civilian + 1 Charlatan) *only* as a terminal
  state, never a voting state.
- The old rationale ("at parity a vote can never resolve") is weaker than it sounds — since
  Charlatans don't know each other, parity votes could actually still resolve — so the
  parity rule is a **pacing choice**, not a logical necessity. It is adopted as such.
**Confirm the parity threshold is final.**

### OQ-34 · **Medium** — Personal Whisper cards × roster changes
Whisper cards are now per-player for the whole session (default 1). Interactions with the
join/leave rules need defaults:
- A **mid-session joiner**: gets the configured allotment on joining (proposed: yes, the
  same default every original player got).
- A **leaver who rejoins by the same name**: score is restored per OQ-29 — are their
  *remaining Whisper cards* restored too, or do they get a fresh allotment (proposed:
  restored, exactly like the score — the name is the identity for all per-player state)?
- Can the host change the per-player allotment between rounds (proposed: no — setup-only,
  like the other options; changing it mid-session would create haves and have-nots)?

### OQ-35 · **Low** — Two Whispers in one round
With 2 Charlatans it is now possible for both to burn a card in the same round. Adopted in
§3.6: at most one Whisper per target per round; the second Whisper draws its target from the
remaining eligible later-revealers; each Whisper uses a distinct distractor word (the pair
data carries exactly two distractors — sufficient, but it means a third Whisper per round is
impossible by data design; with the max of 2 Charlatans per the ⌊12/3⌋=4 clamp... note the
clamp allows up to 4 Charlatans at 12 players, so **a round could have 3–4 Charlatans and
only 2 distractors**). **Proposed resolution:** cap Whispers at 2 per round (first-come,
first-served in reveal order), or extend the pair data to 4 distractors. The former is
simpler; spec currently implies it.

### OQ-36 · **Low** — Steal scoring: flat +3 for everyone, including a blind hidden partner
Adopted per the decision: on a steal, **every** Charlatan scores +3 (guesser and hidden
alike), and the blind double never applies to a steal-ended round. Edge worth one explicit
confirmation: a hidden partner who never peeked was on track for +8 via blind survival — a
teammate's steal now *reduces* them to +3. That creates a (thematically fun, mechanically
odd) incentive for a blind-playing partner to prefer the round ending by threshold rather
than by their teammate's correct guess — they can't act on it (they don't know they're the
Charlatan), so it's harmless, but confirm the interaction is understood and intended.

### OQ-37 · **Low** — No-peek +1 for eliminated civilians
The no-peek reward is now conditional on a civilian team win. Adopted: an **eliminated**
civilian who never peeked still collects the +1 when the team wins (consistent with
"eliminated civilians score the same as survivors"). Confirm.

### OQ-38 · **Low** — Locale is fixed per session; per-locale lists and draw pools
Adopted: the language selector lives on Setup, so the locale is fixed for a session's
lifetime; each locale has its own curated pair list and its own no-repeat draw pool (playing
Dutch tonight doesn't burn English pairs). A "resume" after reload keeps the session's
locale regardless of any later preference change. Confirm — and note the v1 content bill:
**two** hand-curated ~200-pair lists (Dutch and English), each its own curation effort.

### OQ-39 · **Low** — "Human-polished" English: acceptance criteria
The decision requires human-polished strings in both locales, but "polished" has no owner or
gate. **Proposed:** the product owner reviews and signs off both `.properties` files before
v1 ships; a string is shippable when it matches the app's voice (short, dry, second-person)
and fits its layout slot at arm's-length type sizes. Until sign-off, strings are marked
draft in the file via comments.

---

## Watch-list (not blocking, revisit during implementation)

- **Whisper cascade under parity:** a Whispered civilian who mistrusts their real word tends
  to get ejected — with eliminations plus the (now closer) parity threshold, one Whisper can
  cascade into a Charlatan win faster than before. Probably the point of a high-risk tool;
  watch in playtests.
- **Charlatan count clamp vs scaling defaults:** the clamp (1…⌊players/3⌋) allows up to 4
  Charlatans at 12 players while the auto default never exceeds 2. High Charlatan counts
  interact with parity (a 12-player, 4-Charlatan round ends at 4v4) and with the
  2-distractor Whisper limit (OQ-35). Legal but barely tested territory — consider labeling
  counts above the auto default as "experimental" in the setup UI.
- **Result-screen information density:** roles, words, peeks, blind doubles, Whisper
  disclosure, steal outcome, replay, and points now all land on S8. It's the shareable
  moment — it may need progressive disclosure (sections that expand) to stay legible on one
  phone screen.
