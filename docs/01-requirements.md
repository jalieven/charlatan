# Charlatan — Full Requirements

> Derived from the original product notes and **four completed rounds of product-owner
> decisions** (OQ-1 … OQ-41; all folded into this document, all register files removed). The
> de-ambiguation process is closed: this specification is **implementation-ready**. The role
> formerly called *Imposter* is named **Charlatan** everywhere. Remaining soft spots are
> playtest questions, not spec questions — see Appendix C.

---

## 1. Product summary

Charlatan is a **pass-and-play** social deduction game played on a **single phone** that is
handed around a group sitting together. Every player secretly receives a word. Civilians all
receive the same word; each Charlatan receives a *related but different* word (e.g. civilians
get *coffee*, the Charlatan gets *tea*). **Every player always receives a word — there is no
blank mode.** Players take turns giving one-word clues about their word. Because the
Charlatan's word is plausibly close, they can blend in **without even realizing they are the
Charlatan** — and nobody is ever told their role unless they choose to look. After enough
clues, the group votes someone out; an ejected civilian is eliminated and play continues among
the survivors until the Charlatans are caught or reach the winning threshold. A caught
Charlatan gets one final chance to guess the civilians' word and steal the win.

There is **no backend, no accounts, no networking, and no reconnection logic**. The entire game
is client-side React state, deployed as a static site, installable as an offline-capable PWA.

### 1.1 Glossary

| Term | Meaning |
|---|---|
| **Session** | One continuous play period on the device: a series of rounds with a cumulative scoreboard. Starts at Setup, ends when the group stops playing. The roster may change between rounds. |
| **Round** | One word pair, one Charlatan assignment, played until the round resolves (all Charlatans caught, threshold reached, tie limit reached, or a steal) plus its result screen. |
| **Clue cycle** | One full pass in speaking order where every active player submits exactly one clue. |
| **Civilian** | A player who received the majority (real) word. |
| **Charlatan** | A player who received the decoy word. |
| **Peek** | The optional, private act of viewing one's own role on one's own reveal turn. Skipping it is rewarded (§2.3). |
| **Blind** | A player who never peeked this round. A blind surviving Charlatan earns double points ("hard mode"). |
| **Word pair** | A curated pair of confusable words: the *real* word (civilians) and the *decoy* word (Charlatans). |
| **Ledger** | The append-only, always-visible list of every clue typed this round, in order. |
| **Whisper** | A Charlatan sabotage ability funded by each player's personal Whisper cards (§3.6). |
| **Eliminated** | A player voted out this round: role announced, no further clues or votes, still present socially. |
| **Threshold** | The Charlatan win condition: remaining civilians **equal** remaining Charlatans (§3.7). |

---

## 2. Players, roles, and configuration

### 2.1 Player count and Charlatan scaling

- Supported player count: **4–12** players.
- Default number of Charlatans scales with player count:
  - **4–7 players → 1 Charlatan**
  - **8+ players → 2 Charlatans**
- The **host may override** the Charlatan count at setup, clamped to 1 … ⌊players/3⌋.
- **Players may join or leave between rounds** (§4, step 9). After any roster change the
  player count is re-validated (4–12) and the Charlatan default is re-derived; a manual
  override is kept if still within 1 … ⌊players/3⌋, otherwise it resets to auto.
- A leaver's score row **stays on the scoreboard, grayed out**, and is restored if they
  rejoin by the same name — their **remaining Whisper cards are restored too** (never a fresh
  allotment). **Names cannot be renamed mid-session** — a rename is a leave plus a join,
  since the name is the only identity.

### 2.2 Setup options (Setup screen, §5 S1)

| Option | Default | Notes |
|---|---|---|
| Player names | — | Ordered list, add/remove/reorder; order = seating & pass order. Unique, non-empty names. |
| Charlatan count | Auto by player count | Host override allowed, clamped to 1 … ⌊players/3⌋. |
| Clues per player before voting | **2** | Configurable at game start (range 1–4). Voting opens only after this many full clue cycles. |
| Whisper cards **per player** | **1** | Personal, session-long allotment (§3.6). Setup-only — the allotment cannot be changed between rounds; mid-session joiners receive it on joining. |
| Language | **Dutch** | Dutch (default) or English UI (§6.4). Locale is fixed for the session. |

There is deliberately **no timer of any kind, anywhere in the app**. The game gates on clue
count and vote outcomes, never on time.

### 2.3 Words, the peek, and hard mode

- **Everyone always sees a word.** Civilians see the real word; Charlatans see the decoy
  word. The reveal screen is visually identical for both — no role label, ever, by default.
- **The peek.** On their own reveal turn, every player has an identical, optional control to
  privately view their role ("Civilian" or "You are the Charlatan"). Nobody is ever told
  their role unless they ask. Peeking is only possible during the player's own reveal turn —
  once the phone moves on, the choice is locked for the round.
- **Peek economics** (what makes the choice interesting):
  - A **civilian who does not peek** earns a **+1 reward point — but only on rounds the
    civilian team wins**, stacking on top of the +2 team win (and the +1 correct-vote bonus,
    §3.9).
  - A **Charlatan who never peeks and survives** the round earns **double points** — this is
    "hard mode", redefined: self-inflicted blindness rather than a blank word. Surviving a
    round without ever knowing you were the Charlatan is the game's signature payoff
    ("you survived and you never even checked?!").
  - A **Charlatan who peeks** gains knowledge (they can hedge their clues and may use the
    Whisper) but forfeits the blind double.
- Whether each player peeked is **disclosed on the round result screen** — required for score
  transparency, and the table meta it creates ("Jan *never* peeks") is a wanted feature. Live
  observability of the peek gesture — the room seeing *that* someone peeked, never what they
  saw — is likewise accepted as part of the social game: no mandatory dwell is added to mask
  it, and peek-bluffing is fair play.
- **Charlatans are never told who their partner is** — not even after peeking. This is
  intentional: partner anonymity is what makes Whisper friendly fire (§3.6) meaningful and
  keeps multi-Charlatan rounds honest.

---

## 3. Game rules

### 3.1 Word pairs are the product

Word pairs must be **close enough to be confusable but far enough apart that clues diverge**
(coffee/tea, beach/desert, guitar/violin). Each shipping list is **hand-curated, ~200 pairs**,
seeded from an LLM generation prompt and then manually filtered. Auto-generated lists that skip
curation produce pairs that are either identical or absurdly obvious — real time is budgeted
here. The generation prompt is a deliverable of this document: see **Appendix A**.

The app ships **one curated list per locale** — Dutch and English. The Dutch list is a
**separate curation effort, not a translation**: confusability differs per language
(koffie/thee works; many English pairs won't). A session draws from the active locale's list;
each locale keeps its own no-repeat draw pool (playing Dutch tonight doesn't burn English
pairs).

Per round, the app draws one unused pair at random (no repeats within a session), randomly
decides which of the two words is *real* vs *decoy*, and gives all Charlatans the same decoy
word.

### 3.2 Round structure

1. **Assign:** roles and words are assigned silently by the app.
2. **Reveal:** the phone is passed player-to-player in seating order; each player privately
   views their word and optionally peeks at their role (§3.3).
3. **Clue cycles:** in speaking order, each active player **types a one-word clue into the
   phone, then says it aloud**. The typed clue is appended to the Ledger, which is **always
   visible** to everyone for the rest of the round (§3.5).
4. **Vote:** after the configured number of clue cycles (default 2), the group votes,
   individually and privately, by passing the phone (§3.7).
5. **Verdict:** ties and ejections resolve per §3.7 — eliminations shrink the circle, the tie
   counter can end the round, ejected Charlatans get their steal guess immediately (§3.8),
   and play otherwise returns to one more clue cycle followed by a revote.
6. **Result & replay:** roles, peeks, wagers, and Whisper usage are revealed, the round is
   replayed clue-by-clue, points are awarded (§3.8, §3.9, §5 S8).
7. **Scoreboard:** cumulative session scores are shown **between every round**; the roster
   can be edited there (§5 S9).

### 3.3 The reveal (one thumb, everything snaps back)

The reveal screen is the single most important interaction in the app. Its grammar: **one
resting state, two hold-states entered one at a time, no simultaneous gestures, everything
secret is only-visible-while-touching, and every commitment is a release-on-target.**

- **Resting state — covered:** a full-screen cover panel; nothing secret is visible.
- **Word (hold-state 1):** swipe up **and hold** on the cover → the word is visible only
  while the cover is actively held open → release → the cover **snaps shut instantly**.
  Never tap-to-toggle, never a persistent uncover. If a Whisper targets this player, this
  state shows **two words in identical styling and random order** — see §3.6; position must
  never betray which word was Whispered.
- **Peek (hold-state 2):** a separate **"hold to check your role"** button sits on the
  *covered* state — not behind the cover, so the two hold-states are never needed at once.
  It is a **long-press with a visible fill (~800 ms)** before the role card appears, so
  nobody peeks by accident — important because peeking costs civilians their potential +1
  and Charlatans their blind double. The role card is visible **only while held** and snaps
  away on release: the same privacy physics as the word. (The fill is an interaction
  affordance, not a timer — the no-timer rule is intact.)
- **Whisper commit (release-on-target):** while the role card is held open, a Charlatan
  **slides the already-touching thumb onto the "burn a Whisper" target and releases there**
  to arm it — one continuous hold → drag → release-to-commit. Releasing anywhere else just
  closes the card; nothing happens. No second hand, ever.
- **Thumb economics:** all secret UI lives in the holding thumb's home zone at the bottom of
  the screen. The revealed word renders **in the lower half of the screen, directly above the
  role button**; the role card grows upward from that same button, with the **Whisper release
  target directly above the thumb** — so hold, drag, and release-to-commit is one minimal,
  one-handed movement.
- **Choreography parity:** the civilian role card shows release targets of identical size
  and position (all of which simply close the card), so an onlooker reading thumb movement
  and dwell time cannot distinguish the two roles.
- **Slide-to-pass:** between players there is a **sliding "next" interstitial** (a
  deliberate, non-accidental gesture) so nobody can pick up the phone with the previous
  player's word still showing.

Full sequence: *covered → (swipe-up-hold: word) → covered → (long-press: role card) →
optional slide-to-Whisper-target → covered → slide-to-pass.*

### 3.4 Speaking order

**Who speaks first is re-randomized every round** — going first is a genuine disadvantage and
must not always fall on the same person; consecutive rounds must not reuse the previous
round's order deliberately. Within a round the order is **stable**: subsequent speakers follow
the player list order from the round's random starting point, skipping eliminated players.

### 3.5 Clue ledger

- Every clue is typed before being spoken; typing is done openly (clues are public
  information anyway).
- The Ledger shows **every typed clue of every player, in order, at all times** during the
  discussion and voting phases of the round. The live Ledger is a **neutral record**: words,
  authors, and cycle grouping only — it never carries suspicion markers, highlights, or any
  other app editorializing mid-round.
- The app never blocks a clue, but it **warns** (non-blocking, visible only to the typer) on
  obvious fouls: more than one word, a clue identical to the player's own secret word, or a
  duplicate of any earlier clue this round. The group polices everything else by party
  convention.
- Ties and ejections extend rounds by one clue cycle each loop, so a round can reach five or
  more cycles: the Ledger's cycle grouping and the cycle counter must scale gracefully to
  arbitrary cycle counts.
- At the round result, the app **replays the round**: every clue in sequence, annotated with
  who said it and where the votes landed — "here's where the room's suspicion turned."
  Suspicion markers (◆) flag clues whose author drew votes in the ballot that followed,
  derived **solely from vote tallies**, and they exist **only in the post-round replay** —
  never in the live Ledger. This post-game replay is the shareable moment of the app.

### 3.6 The Whisper

The Whisper is a high-risk sabotage tool funded by **personal Whisper cards**: each player
gets the configured allotment (default **1**) for the whole session, spendable only in rounds
where they are a Charlatan. The allotment is fixed at setup and never changes mid-session;
joiners receive it on joining, and a same-name rejoiner gets their remaining cards back
(§2.1).

- **Who:** any current-round Charlatan **who has peeked** (using the Whisper requires knowing
  your role — and peeking forfeits the blind double, which is the ability's price), while
  they still hold an unspent personal card.
- **When & how:** from the Charlatan's own reveal screen, via the role card's
  release-on-target gesture (§3.3). **Unusable if the Charlatan reveals last** (there is no
  later player to target).
- **At most one Whisper fires per round**, first-come, first-served in reveal order: once any
  Charlatan burns a card, the Whisper target no longer appears on later role cards that
  round. (Accepted micro-leak: a later-revealing, peeked Charlatan who holds an unspent card,
  is not last, and still sees no Whisper target can deduce their unknown partner already
  whispered. Deliberately kept — it is part of what makes the Whisper strong.)
- **Effect:** a **uniformly random player among those who reveal after the Charlatan** is
  targeted. The target's word state shows **two words** — their assigned word and a wrong
  word X drawn from the word pair's curated distractor list (Appendix A) — under a *"psst —
  one of these was whispered to you"* note. **Random positioning is a hard requirement: the
  two words render in identical styling and in random order, so neither position nor
  treatment ever reveals which word was the player's own and which was Whispered.** The
  target now cannot be sure which word is real.
- **Friendly fire is allowed:** if the random target is the other Charlatan, the Whisper is
  **not** wasted — Charlatans can sabotage each other (they don't know who their partner is).
- **Disclosure:** who burned a Whisper, on whom, and the fake word are revealed on the round
  result screen.

### 3.7 Voting, eliminations, and the tie limit

- Voting begins after the configured number of clue cycles (default **2**) are complete.
- Voting is **individual and private**: the phone is passed around once more; each active
  player sees a handoff interstitial, then a ballot with every *other* active player's name,
  and casts exactly one vote. **No abstaining, no self-votes; eliminated players neither
  clue nor vote.**
- Resolution after all ballots are in:
  - **Strict plurality on one player → that player is ejected.** Their role is **openly
    announced** to the group. The consecutive-tie counter resets.
    - **Ejected Charlatan:** they immediately get the steal guess (§3.8). A correct guess
      steals the round for all Charlatans and ends it. On a wrong guess: if hidden Charlatans
      remain, the ejected Charlatan is eliminated and play continues (one clue cycle among
      survivors, then revote); if they were the last Charlatan, the civilians win.
    - **Ejected Civilian:** they are eliminated. If the **threshold** now holds — remaining
      civilians **equal** remaining Charlatans — the round ends and the **Charlatans win**.
      Otherwise play continues: one clue cycle among survivors, then revote.
      (The parity threshold is final. It deliberately gives minimum-size tables a mistake of slack: at 4
      players — 3 civilians + 1 Charlatan — the first wrong ejection leaves 2 v 1 and play
      continues; only a second wrong ejection, reaching 1 v 1, ends the round.)
  - **Tie for most votes → no ejection.** One additional clue cycle is played, then the group
    revotes. Consecutive ties are counted:
    - **1st consecutive tie:** banner "No majority — one more clue each."
    - **2nd consecutive tie:** the verdict screen must **prominently visualize the stakes:
      one more tie and the Charlatans win.** This warning is a hard UI requirement, shown
      the moment the second consecutive tie happens and kept visible through the following
      clue cycle and ballot.
    - **3rd consecutive tie:** the round ends immediately — **Charlatans win** (scored as
      survival, §3.9).

### 3.8 The Charlatan's guess (the steal)

When a Charlatan is voted out, they get **one immediate chance to name the real word and
steal the win**. It keeps them engaged and adds a good beat to the ending.

- The guess is **typed into the phone** by the caught Charlatan; matching is case-insensitive
  with trimming and basic singular/plural tolerance. The guess is shown on the result screen,
  so the group can house-rule an obvious near-miss.
- A correct guess flips the round to a **Charlatan win for all Charlatans** and ends it, even
  if other Charlatans were still hidden. The guesser and any *peeked* hidden Charlatan score
  the steal points; a still-hidden Charlatan who **never peeked keeps their blind survival
  double** — a teammate's steal never costs a blind partner their +8 (§3.9).
- The result screen then reveals everything: roles, the word pair, who peeked, blind doubles
  earned, Whisper usage, followed by the clue-by-clue replay.

### 3.9 Scoring

**The score of all previous rounds is displayed between each round** on the session
scoreboard. Scoring rules:

| Outcome | Points |
|---|---|
| Civilian team wins (all Charlatans ejected, no steal) | +2 per Civilian — **eliminated civilians score the same as survivors** (team win; being voted out is not punished twice) |
| Civilian personally voted for a Charlatan on an ejecting vote | +1 bonus |
| Civilian never peeked this round **and the civilian team wins** | +1 reward, on top of the team win (eliminated civilians included) — a non-peeking, sharp-voting civilian can reach +4 in one round |
| Charlatan survives the round (threshold or tie limit), having peeked | +4 |
| Charlatan survives the round **blind** (never peeked — "hard mode") | +8 (double) |
| Steal (ejected Charlatan guesses the real word) | +3 to the guesser and to any **peeked** hidden Charlatan; a still-hidden Charlatan who **never peeked** scores **+8** instead — the blind double survives a teammate's steal. The guesser never gets the double (they were caught). |

"Survives" means the round ends by threshold or by the third consecutive tie with the
Charlatan not ejected; steal-ended rounds are scored by the steal row instead. Point values
are a starting balance, to be tuned in playtesting.

---

## 4. Flows (lingual description)

The app is **one phase state machine**; the full phase set is:

`setup → assign → reveal → clues → vote → verdict → guess → result → scoreboard → (next round | roster edit | end)`

1. **Setup flow.** The host enters player names in seating order, adjusts Charlatan count,
   clues-per-player, Whisper cards per player, and language, and taps **Start**. Validation:
   4–12 unique, non-empty names.
2. **Assign flow (invisible).** The app draws an unused word pair from the locale's list,
   picks real/decoy orientation, assigns Charlatan roles uniformly at random, and picks a
   random first speaker.
3. **Reveal flow.** For each player in pass order: a **handoff interstitial** ("Pass the phone
   to *name*", slide to continue) → the **reveal screen** (one-thumb grammar per §3.3: held
   word, optional long-press peek, optional Whisper release-on-target, Whisper banner if
   targeted) → slide-to-pass to the next handoff. After the last player, the app transitions
   to the clue phase.
4. **Clue flow.** The screen shows the speaking order, whose turn it is, and the Ledger. The
   active player types their one-word clue (private, non-blocking foul warnings per §3.5),
   submits, and says it aloud; the turn advances, skipping eliminated players. After every
   active player has given a clue, the cycle counter increments. When the required cycle
   count is reached, the app offers **Go to vote**.
5. **Vote flow.** For each active player in pass order: handoff interstitial → private ballot
   → confirm. After the last ballot the app computes the verdict.
6. **Verdict flow.** Per §3.7: ties advance the consecutive-tie counter (with the mandatory
   "one more tie and the Charlatans win" visualization on the second tie) and loop through
   one clue cycle back to a revote; a third tie ends the round for the Charlatans. An
   ejection openly announces the role: Charlatan → Guess flow; Civilian → parity check →
   either Charlatans win or one clue cycle + revote.
7. **Guess flow.** The caught Charlatan types one guess at the real word; the app resolves
   steal (round ends) or no steal (continue or civilian win per §3.7).
8. **Result flow.** The payoff, staged as **three acts of progressive disclosure** — one act
   on screen at a time, advanced by tap, so the phone-holder narrates it to the table like a
   game-show host instead of everyone squinting at a wall of data:
   - **Act 1 — The verdict:** who won, huge type, and the Charlatan identities — the app's
     single accent-color moment. The loudest beat first; everything after is explanation.
     One drill-in sits **behind a button on this page**: **the words & the replay**, a single
     screen with a back-to-verdict link pinned at the very top, the word pair (real vs decoy,
     side by side — the "OHHH *that's* why you said 'beans'" beat) fixed beneath it, and the
     replay (every clue in order, grouped by cycle, annotated with vote outcomes — the
     shareable, screenshot-friendly moment) scrolling below. The drill-in shows **no progress
     dots** — it is not an act; closing returns to the verdict.
   - **Act 2 — The secrets:** the steal guess (judge the near-miss), who peeked, blind
     doubles earned, and the Whisper — who burned it, on whom, and the fake word. The "you
     did THAT on no information?!" beats.
   - **Act 3 — The damage:** the round's points as a **score matrix** — players down the
     left, the round's subscore columns across the top (e.g. win / blind / correct vote),
     totals on the right; columns adapt to the round outcome → Continue to scoreboard.

   Mechanics: tap anywhere (or a ≥56 px Continue) advances; a **three-dot progress strip**
   shows position; back-swiping to a previous act is allowed — everything on S8 is public,
   so no privacy machinery is needed; each act fits one screen without scrolling (the replay
   drill-in scrolls internally); one motion accent per act, per the "let one thing move"
   design rule.
9. **Scoreboard flow.** Cumulative session scores; **Next round** (back to Assign);
   **Edit players** — add or remove players between rounds (re-validate 4–12, re-derive
   Charlatan scaling per §2.1; new players join the scoreboard at 0; leavers' rows gray out
   and are restored on same-name rejoin); or **End session**.

**Resume:** the complete in-progress game state (round, phase, cursor, words, votes, tie
counter, scores, Whisper cards) is persisted locally on every transition. An unfinished round
survives **indefinitely**; on launch the app offers a **"resume or new game?"** choice
(choosing "new game" explicitly ends the old round). Secrets stay safe across resume because
every secret is gated behind the hold-open gestures, and rehydration always re-enters via the
handoff interstitial. Holding an abandoned round's secret words in `localStorage` is an
accepted, deliberate trade-off — it matches the app's trust model.

---

## 5. Screens

| # | Screen | Phase | Core purpose |
|---|---|---|---|
| S1 | Setup | setup | Names, options, start; "resume or new game?" on launch |
| S2 | Handoff interstitial | reveal, vote | Privacy gate: "Pass to *name*", slide to continue |
| S3 | Reveal | reveal | One-thumb grammar: held word, long-press peek, Whisper release-on-target |
| S4 | Clue entry & Ledger | clues | Turn indicator, clue input, full Ledger |
| S5 | Vote ballot | vote | Private single-choice ballot |
| S6 | Verdict | verdict | Tie counter & warning, or ejection + open role announcement |
| S7 | Charlatan's guess | guess | The steal attempt |
| S8 | Round result & replay | result | Three-act progressive reveal; words & replay behind buttons on the verdict |
| S9 | Scoreboard | scoreboard | Cumulative scores between rounds; roster editing |

Component-level detail for every screen is in [02-flows.md §5](./02-flows.md).

---

## 6. Technical requirements

### 6.1 Stack

- **Vite + React + Tailwind CSS.** No server, no data fetching, no SEO surface, no routes —
  Next.js would be pure complexity tax. Vite gives instant HMR and a static `dist/` deployable
  to Cloudflare Pages / Netlify / Vercel for free.
- **Motion** (formerly Framer Motion) for the cover-panel physics, the long-press fill, the
  release-on-target drag, and phase transitions; `AnimatePresence` for phase swaps. These
  interactions are the app's entire feel — hand-rolling them in CSS gets miserable fast.
- **No router.** The phase lives in React state; React Router's back button could drop
  someone into a reveal screen mid-round.
- **No component library.** ~9 screens and one dialog; shadcn/ui defaults would fight the
  monochrome aesthetic.
- **State:** `useReducer` over a single game object; adopt Zustand only if prop drilling
  starts to hurt.
- **Persistence:** session scores, locale, personal Whisper cards, and the in-progress game
  state in `localStorage`. Word-pair lists (Dutch and English) ship as static JSON assets.
  There is no cross-session player data (the dossier feature was considered and dropped).
- **PWA:** `vite-plugin-pwa` (~10 lines of config). Party games get played in basements and
  bars with bad signal; "add to home screen, works offline" is a real quality-of-life win —
  and the persisted-state resume (§4) makes an accidental app kill a non-event.

### 6.2 State machine

Single reducer with phases
`setup | assign | reveal | clues | vote | verdict | guess | result | scoreboard`.
All transitions are explicit reducer actions; illegal transitions are unrepresentable. The
reveal and vote phases carry a `cursor` (whose turn in the pass order) plus the handoff
sub-state so a dropped phone never shows private data. Round state additionally tracks the
consecutive-tie counter, eliminations, peek flags, and per-player Whisper cards.

### 6.3 Privacy invariants (must hold at all times)

1. Every secret — the word **and** the role card — is on screen **only while actively held**:
   the cover snaps shut and the role card snaps away the instant the pointer lifts.
2. Every commitment is a **release-on-target** (Whisper arm); releasing anywhere else is a
   no-op. No secret action requires a second hand or a second simultaneous gesture.
3. Every transition between two players' private screens passes through a handoff
   interstitial requiring a deliberate slide gesture.
4. The peek affordance and the role card are identical in layout, target geometry, and
   plausible interaction length for both roles, so onlookers cannot read a **role** from
   screen time or thumb movement. (That someone peeked at all is deliberately observable —
   accepted table theater, §2.3.)
5. Ballot contents are never shown after confirmation; only aggregate results are revealed.
6. Resume (§4) never lands on exposed private data: rehydration always re-enters via the
   handoff interstitial for the current cursor.

### 6.4 Internationalization (i18n)

- **All code is written in English**: identifiers, comments, commit messages, file names, and
  internal state values (phase names, action types, storage keys).
- **No hard-coded user-facing strings.** Every string rendered in the UI — labels, buttons,
  banners, validation messages, result copy — goes through an i18n layer and is referenced by
  key. This includes interpolated/pluralized copy such as "Player 3 of 8" and "One more tie
  and the Charlatans win", which must use parameterized messages (never string concatenation)
  so word order can differ per language.
- **Translation files use the `.properties` format**, one file per locale, shipped as static
  assets. The implementation must include, from day one:
  - `en-i18n.properties` — the source-of-truth English strings, **human-polished**: the
    product owner reviews and signs off both `.properties` files before v1 ships (a string is
    shippable when it matches the app's voice — short, dry, second-person — and fits its
    layout slot at arm's-length type sizes); and
  - `dutch-i18n.properties` — a complete Dutch translation of **every** string key used in
    the frontend. A key present in English but missing in Dutch is a build error, not a
    silent English fallback.
- **The default locale is Dutch**; English is selectable on the Setup screen. The locale is
  fixed for the duration of a session and persisted locally; a resumed session keeps its
  locale regardless of any later preference change.
- **Scope boundary:** the word-pair lists (Appendix A) are game *content*, not UI chrome;
  they are not part of the `.properties` files. Both a Dutch and an English pair list ship in
  v1; the Dutch list is a **separate curation effort, not a translation** (§3.1).
- Implementation note: `.properties` is a Java-style format without a native JS loader; the
  build includes a tiny parser (or a Vite plugin) that converts the files to message maps at
  build time, keeping the runtime dependency-free. A lightweight library (e.g. i18next with a
  properties loader) is acceptable if it stays within the no-backend, static-site constraint.

### 6.5 Design system (making black-and-white actually look slick)

Monochrome with default styling just reads as unstyled. What carries it:

- **Typography does all the work.** One distinctive geometric face (e.g. Space Grotesk, or a
  tight grotesque like Inter Tight) with extreme weight contrast: the secret word at massive
  size and heavy weight; labels tiny, uppercase, wide letter-spacing.
- **Near-black, not `#000`.** Background `#0A0A0A`, text `#FAFAFA`, plus a disciplined 4–5
  step gray ramp used religiously.
- **Borders over shadows.** Thin hairline borders and generous negative space; shadows need
  color to look good.
- **Let one thing move.** With no color to direct attention, motion is the emphasis tool — a
  subtle scale on the revealed word, the cover-panel physics, the long-press fill, animated
  phase transitions. (There is no timer in the app, so no timer visualization exists.)
- **One accent color, used once.** A single hot color reserved exclusively for the Charlatan
  reveal at the round result — it makes the payoff moment land. Always on: part of the
  design, not a setting.
- **Ergonomics:** tap targets ≥ **56 px**; text readable at arm's length — the phone is
  passed around a room, not held six inches from one face. (Beyond these ergonomics,
  dedicated accessibility work is explicitly out of scope for v1.)

---

## Appendix A — Word-pair generation prompt

The source notes require "a perfect prompt" to generate ~200 candidate pairs for hand
curation. Use the following with a strong LLM, then curate manually. **Run it once per
locale**: as-is for the English list, and adapted for the Dutch list (translate the prompt,
demand Dutch words, and re-tune the "universal" constraint to a Dutch-speaking audience) —
the Dutch list is curated in its own right, never translated from the English one.

```text
You are designing word pairs for a social deduction party game. In each round, most players
secretly receive WORD_A and one hidden "Charlatan" secretly receives WORD_B. Players then take
turns saying one-word clues about their own word. The Charlatan wins by blending in; the group
wins by spotting whose clues don't fit.

Generate exactly 200 word pairs that satisfy ALL of these constraints:

1. CONFUSABLE: the two words share a broad category and everyday context, so early generic
   clues (color, place, feeling, activity) plausibly apply to both. A Charlatan holding WORD_B
   should be able to survive a first clue without knowing they have the odd word.
2. DIVERGENT: the words differ in concrete, specific attributes, so by a second or third clue,
   precise clues start to conflict. Good: coffee/tea, beach/desert, guitar/violin. Bad:
   sofa/couch (identical), cat/spaceship (absurdly far).
3. SYMMETRIC: neither word may be a hypernym, synonym, or part of the other (no dog/animal,
   no car/wheel). Either word must be playable as the real word.
4. UNIVERSAL: common knowledge for a mixed group of adults across cultures; no brands, no
   niche jargon, no regional foods, nothing requiring specialist knowledge.
5. CLUE-RICH: each word must support at least 6 distinct one-word clues an average player
   would produce. Avoid words whose only clues are the category name.
6. CLEAN: no offensive, adult, or polarizing topics; suitable for teenagers.
7. VARIED: spread across at least 15 domains (food & drink, animals, places, sports, music,
   household, professions, weather, transport, clothing, body, emotions, entertainment,
   nature, tools, celebrations...). No more than 20 pairs per domain. No word may appear in
   more than one pair.

For each pair also produce two DISTRACTOR words: same category, confusable with both, but not
synonymous with either (these fuel an in-game fake-hint mechanic).

Output as JSON: an array of 200 objects
{ "a": "...", "b": "...", "domain": "...", "distractors": ["...", "..."] }
No commentary, JSON only.

Before finalizing, self-review the list against constraints 1–3 and replace any pair that
fails; a pair fails constraint 1 if a typical first clue for one word would immediately sound
wrong for the other, and fails constraint 2 if the two words could be described identically
for three clues running.
```

Curation pass (human, per locale): play-test at least 30 pairs; delete anything where the
first clue reliably outs the Charlatan or where the Charlatan can never be caught.

---

## Appendix B — Decision history

Four decision passes are complete and closed: OQ-1 … OQ-21 (first pass), OQ-22 … OQ-32
(second pass), OQ-27 / OQ-33 … OQ-39 (third pass), and OQ-40 … OQ-41 (fourth pass). Every
item was decided by the product owner and folded into this document; all register files were
removed and the de-ambiguation process is finished. No `⚠️ OQ-n` markers remain — this
specification is the single source of truth.

---

## Appendix C — Playtest watch-list

Not spec gaps — behaviors to observe once the game is in hands:

- **Whisper cascade under parity:** a Whispered civilian who mistrusts their real word tends
  to get ejected — with eliminations plus the parity threshold, one Whisper can cascade into
  a Charlatan win. Deliberately strong (the micro-leak in §3.6 is likewise accepted as part
  of the Whisper's strength); confirm it feels exciting rather than unfair.
- **Charlatan count clamp vs scaling defaults:** the clamp (1…⌊players/3⌋) allows up to 4
  Charlatans at 12 players while the auto default never exceeds 2; a 4-Charlatan round ends
  at 4v4 parity. Legal but barely tested — consider labeling counts above the auto default
  as "experimental" in the setup UI.
- **Blind-double asymmetry on steals:** a blind hidden partner banks +8 off a teammate's +3
  steal — the highest payout in the game for a player who did nothing knowingly. Explicitly
  wanted; keep an eye on it when tuning point values.
