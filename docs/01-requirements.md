# Charlatan — Full Requirements

> Derived from the original product notes and one round of product-owner decisions (the former
> `03-open-questions.md` register, OQ-1 … OQ-21, is fully resolved and folded into this
> document). The role formerly called *Imposter* is named **Charlatan** everywhere. Statements
> marked `⚠️ OQ-n` (n ≥ 22) are interpretations made while incorporating the decisions; each
> links to the second-pass register in [04-open-questions.md](./04-open-questions.md).

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
| **Whisper** | A Charlatan sabotage ability drawn from a configurable pool of Whisper cards (§3.6). |
| **Eliminated** | A player voted out this round: role announced, no further clues or votes, still present socially. |
| **Threshold** | The Charlatan win condition: civilians outnumber Charlatans by exactly one (§3.7). |

---

## 2. Players, roles, and configuration

### 2.1 Player count and Charlatan scaling

- Supported player count: **4–12** players.
- Default number of Charlatans scales with player count:
  - **4–7 players → 1 Charlatan**
  - **8+ players → 2 Charlatans**
- The **host may override** the Charlatan count at setup, clamped to 1 … ⌊players/3⌋.
- **Players may join or leave between rounds** (§4, step 9). After any roster change the
  player count is re-validated (4–12) and the Charlatan default is re-derived (a manual
  override is kept if still within its clamp). `⚠️ OQ-29`

### 2.2 Setup options (Setup screen, §5 S1)

| Option | Default | Notes |
|---|---|---|
| Player names | — | Ordered list, add/remove/reorder; order = seating & pass order. Unique, non-empty names. |
| Charlatan count | Auto by player count | Host override allowed, clamped to 1 … ⌊players/3⌋. |
| Clues per player before voting | **2** | Configurable at game start (range 1–4). Voting opens only after this many full clue cycles. |
| Whisper cards | **1** | Size of the session-wide Whisper pool (§3.6). `⚠️ OQ-24` |
| Accent color on/off | On | Single accent color used exclusively for the Charlatan reveal moment (§6.5). |
| Language | Dutch | Dutch or English UI (§6.4). `⚠️ OQ-30` (default locale is assumed Dutch) |

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
  - A **civilian who does not peek** earns a **+1 reward point** for the round, regardless of
    the round's outcome. `⚠️ OQ-28`
  - A **Charlatan who never peeks and survives** the round earns **double points** — this is
    "hard mode", redefined: self-inflicted blindness rather than a blank word. Surviving a
    round without ever knowing you were the Charlatan is the game's signature payoff
    ("you survived and you never even checked?!").
  - A **Charlatan who peeks** gains knowledge (they can hedge their clues and may use the
    Whisper) but forfeits the blind double.
- Whether each player peeked is disclosed on the round result screen (required for score
  transparency). `⚠️ OQ-27`

---

## 3. Game rules

### 3.1 Word pairs are the product

Word pairs must be **close enough to be confusable but far enough apart that clues diverge**
(coffee/tea, beach/desert, guitar/violin). The shipping list is **hand-curated, ~200 pairs**,
seeded from an LLM generation prompt and then manually filtered. Auto-generated lists that skip
curation produce pairs that are either identical or absurdly obvious — real time is budgeted
here. The generation prompt is a deliverable of this document: see **Appendix A**.

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

### 3.3 The reveal (the one part that needs real care)

The reveal screen is the single most important interaction in the app — it is most of the
difference between a version people keep playing and one they abandon.

- **Swipe-up-to-uncover:** the word sits behind a full-screen cover panel. The player drags
  the cover upward to expose the word; the word is visible **only while the cover is actively
  held open** and the panel **snaps shut the instant the finger lifts**. Never tap-to-toggle,
  and never a persistent uncover. `⚠️ OQ-22`
- **Slide-to-pass:** between players there is a **sliding "next" interstitial** (a deliberate,
  non-accidental gesture) so nobody can pick up the phone with the previous player's word
  still showing.
- **The peek control** (§2.3) appears identically on every player's reveal screen. Peeking
  opens a role card of identical shape and interaction length for both roles (`⚠️ OQ-27`):
  - Civilian: "You are a Civilian" — and a note that peeking forfeited this round's +1.
  - Charlatan: "You are the Charlatan" — plus the Whisper control when a card is available
    and the player is not the last to reveal (§3.6).
- **Whisper banner:** if a Whisper targets this player, their reveal screen additionally
  shows *"psst, the word is X"* (§3.6) alongside their word.

### 3.4 Speaking order

**Who speaks first is re-randomized every round** — going first is a genuine disadvantage and
must not always fall on the same person; consecutive rounds must not reuse the previous
round's order deliberately. Within a round the order is **stable**: subsequent speakers follow
the player list order from the round's random starting point, skipping eliminated players.

### 3.5 Clue ledger

- Every clue is typed before being spoken; typing is done openly (clues are public
  information anyway).
- The Ledger shows **every typed clue of every player, in order, at all times** during the
  discussion and voting phases of the round.
- The app never blocks a clue, but it **may warn** (non-blocking) on obvious fouls — more
  than one word, or a clue identical to the player's own secret word. The group polices
  everything else by party convention. `⚠️ OQ-31`
- At the round result, the app **replays the round**: every clue in sequence, annotated with
  who said it and where the votes landed — "here's where the room's suspicion turned." This
  post-game replay is the shareable moment of the app.

### 3.6 The Whisper

The Whisper is a high-risk sabotage tool funded by a **session-wide pool of Whisper cards**,
sized at setup (default **1**). `⚠️ OQ-24`

- **Who:** any current-round Charlatan **who has peeked** (using the Whisper requires knowing
  your role — and peeking forfeits the blind double, which is the ability's price).
- **When:** from the Charlatan's own reveal screen, while a card remains in the pool.
  **Unusable if the Charlatan reveals last** (there is no later player to target).
- **Effect:** a **random player among those who reveal after the Charlatan** `⚠️ OQ-25` gets
  an extra fake message on their reveal screen — *"psst, the word is X"* — where X is a wrong
  word drawn from the word pair's curated distractor list (Appendix A). That player now
  cannot be sure whether their originally revealed word or the whispered word is real.
- **Friendly fire is allowed:** if the random target is the other Charlatan, the Whisper is
  **not** wasted — Charlatans can sabotage each other.
- **Disclosure:** who burned a Whisper, and on whom, is revealed on the round result screen.

### 3.7 Voting, eliminations, and the tie limit

- Voting begins after the configured number of clue cycles (default **2**) are complete.
- Voting is **individual and private**: the phone is passed around once more; each active
  player sees a handoff interstitial, then a ballot with every *other* active player's name,
  and casts exactly one vote. **No abstaining, no self-votes; eliminated players neither
  clue nor vote.**
- Resolution after all ballots are in:
  - **Strict plurality on one player → that player is ejected.** Their role is announced to
    the group. `⚠️ OQ-23` The consecutive-tie counter resets.
    - **Ejected Charlatan:** they immediately get the steal guess (§3.8). A correct guess
      steals the round for all Charlatans and ends it. On a wrong guess: if hidden Charlatans
      remain, the ejected Charlatan is eliminated and play continues (one clue cycle among
      survivors, then revote); if they were the last Charlatan, the civilians win.
    - **Ejected Civilian:** they are eliminated. If the **threshold** now holds — remaining
      civilians = remaining Charlatans + 1 — the round ends and the **Charlatans win** (at
      that point one more wrong vote would produce parity, where a vote can never resolve, so
      the game calls it early). Otherwise play continues: one clue cycle among survivors,
      then revote.
  - **Tie for most votes → no ejection.** One additional clue cycle is played, then the group
    revotes. Consecutive ties are counted:
    - **1st consecutive tie:** banner "No majority — one more clue each."
    - **2nd consecutive tie:** the verdict screen must **prominently visualize the stakes:
      one more tie and the Charlatans win.** This warning is a hard UI requirement, shown
      the moment the second consecutive tie happens and kept visible through the following
      clue cycle and ballot.
    - **3rd consecutive tie:** the round ends immediately — **Charlatans win.** `⚠️ OQ-26`

### 3.8 The Charlatan's guess (the steal)

When a Charlatan is voted out, they get **one immediate chance to name the real word and
steal the win**. It keeps them engaged and adds a good beat to the ending.

- The guess is **typed into the phone** by the caught Charlatan; matching is case-insensitive
  with trimming and basic singular/plural tolerance. The guess is shown on the result screen,
  so the group can house-rule an obvious near-miss.
- A correct guess flips the round to a **Charlatan win for all Charlatans** and ends it, even
  if other Charlatans were still hidden.
- The result screen then reveals everything: roles, the word pair, who peeked, blind doubles
  earned, Whisper usage, followed by the clue-by-clue replay.

### 3.9 Scoring

**The score of all previous rounds is displayed between each round** on the session
scoreboard. Scoring rules:

| Outcome | Points |
|---|---|
| Civilian team wins (all Charlatans ejected, no steal) | +2 per Civilian — **eliminated civilians score the same as survivors** (team win; being voted out is not punished twice) |
| Civilian personally voted for a Charlatan on an ejecting vote | +1 bonus |
| Civilian never peeked this round | +1 reward, regardless of round outcome `⚠️ OQ-28` |
| Charlatan survives the round, having peeked | +4 |
| Charlatan survives the round **blind** (never peeked — "hard mode") | +8 (double) |
| Ejected Charlatan steals via correct guess | +3 to the guesser; still-hidden Charlatans score as survivors (+4/+8) `⚠️ OQ-26` |

"Survives" means the round ends with the Charlatan not ejected: the threshold is reached, the
third consecutive tie fires, or a fellow Charlatan's steal ends the round. Point values are a
starting balance, to be tuned in playtesting.

---

## 4. Flows (lingual description)

The app is **one phase state machine**; the full phase set is:

`setup → assign → reveal → clues → vote → verdict → guess → result → scoreboard → (next round | roster edit | end)`

1. **Setup flow.** The host enters player names in seating order, adjusts Charlatan count,
   clues-per-player, Whisper cards, language, and accent option, and taps **Start**.
   Validation: 4–12 unique, non-empty names.
2. **Assign flow (invisible).** The app draws an unused word pair, picks real/decoy
   orientation, assigns Charlatan roles uniformly at random, and picks a random first
   speaker.
3. **Reveal flow.** For each player in pass order: a **handoff interstitial** ("Pass the phone
   to *name*", slide to continue) → the **reveal screen** (swipe up and hold to see the word;
   optional peek; Charlatan Whisper per §3.6; Whisper banner if targeted) → slide-to-pass to
   the next handoff. After the last player, the app transitions to the clue phase.
4. **Clue flow.** The screen shows the speaking order, whose turn it is, and the Ledger. The
   active player types their one-word clue (non-blocking foul warnings per §3.5), submits,
   and says it aloud; the turn advances, skipping eliminated players. After every active
   player has given a clue, the cycle counter increments. When the required cycle count is
   reached, the app offers **Go to vote**.
5. **Vote flow.** For each active player in pass order: handoff interstitial → private ballot
   → confirm. After the last ballot the app computes the verdict.
6. **Verdict flow.** Per §3.7: ties advance the consecutive-tie counter (with the mandatory
   "one more tie and the Charlatans win" visualization on the second tie) and loop through
   one clue cycle back to a revote; a third tie ends the round for the Charlatans. An
   ejection announces the role: Charlatan → Guess flow; Civilian → threshold check → either
   Charlatans win or one clue cycle + revote.
7. **Guess flow.** The caught Charlatan types one guess at the real word; the app resolves
   steal (round ends) or no steal (continue or civilian win per §3.7).
8. **Result flow.** Full reveal (accent color moment): roles, peek status, blind doubles,
   Whisper usage, steal outcome, then the **replay**: clues in order with vote outcomes.
9. **Scoreboard flow.** Cumulative session scores; **Next round** (back to Assign);
   **Edit players** — add or remove players between rounds (re-validate 4–12, re-derive
   Charlatan scaling; new players join the scoreboard at 0 `⚠️ OQ-29`); or **End session**.

**Resume:** the complete in-progress game state (round, phase, cursor, words, votes, tie
counter, scores) is persisted locally on every transition; killing or reloading the app —
common on a phone passed around a bar — resumes exactly where the group left off. Secrets
stay safe across resume because every secret is gated behind the hold-open gesture. `⚠️ OQ-32`

---

## 5. Screens

| # | Screen | Phase | Core purpose |
|---|---|---|---|
| S1 | Setup | setup | Names, options, start |
| S2 | Handoff interstitial | reveal, vote | Privacy gate: "Pass to *name*", slide to continue |
| S3 | Reveal | reveal | Swipe-up-held word; peek; Whisper |
| S4 | Clue entry & Ledger | clues | Turn indicator, clue input, full Ledger |
| S5 | Vote ballot | vote | Private single-choice ballot |
| S6 | Verdict | verdict | Tie counter & warning, or ejection + role announcement |
| S7 | Charlatan's guess | guess | The steal attempt |
| S8 | Round result & replay | result | Full reveal + clue-by-clue replay |
| S9 | Scoreboard | scoreboard | Cumulative scores between rounds; roster editing |

Component-level detail for every screen is in [02-flows.md §5](./02-flows.md).

---

## 6. Technical requirements

### 6.1 Stack

- **Vite + React + Tailwind CSS.** No server, no data fetching, no SEO surface, no routes —
  Next.js would be pure complexity tax. Vite gives instant HMR and a static `dist/` deployable
  to Cloudflare Pages / Netlify / Vercel for free.
- **Motion** (formerly Framer Motion) for the swipe-up-to-uncover interaction and phase
  transitions; `AnimatePresence` for phase swaps. These interactions are the app's entire
  feel — hand-rolling them in CSS gets miserable fast.
- **No router.** The phase lives in React state; React Router's back button could drop
  someone into a reveal screen mid-round.
- **No component library.** ~9 screens and one dialog; shadcn/ui defaults would fight the
  monochrome aesthetic.
- **State:** `useReducer` over a single game object; adopt Zustand only if prop drilling
  starts to hurt.
- **Persistence:** session scores, locale, and the in-progress game state in `localStorage`.
  Word-pair list ships as a static JSON asset. There is no cross-session player data (the
  dossier feature was considered and dropped).
- **PWA:** `vite-plugin-pwa` (~10 lines of config). Party games get played in basements and
  bars with bad signal; "add to home screen, works offline" is a real quality-of-life win —
  and the persisted-state resume (§4) makes an accidental app kill a non-event.

### 6.2 State machine

Single reducer with phases
`setup | assign | reveal | clues | vote | verdict | guess | result | scoreboard`.
All transitions are explicit reducer actions; illegal transitions are unrepresentable. The
reveal and vote phases carry a `cursor` (whose turn in the pass order) plus the handoff
sub-state so a dropped phone never shows private data. Round state additionally tracks the
consecutive-tie counter, eliminations, peek flags, and Whisper pool.

### 6.3 Privacy invariants (must hold at all times)

1. A secret word is on screen **only** while the cover panel is actively held open; the cover
   snaps shut on pointer release (`⚠️ OQ-22`).
2. Every transition between two players' private screens passes through a handoff
   interstitial requiring a deliberate slide gesture.
3. The peek affordance, and the role card it opens, are identical in layout, shape, and
   plausible interaction length for both roles, so onlookers cannot read a role from screen
   time or thumb movement (`⚠️ OQ-27`).
4. Ballot contents are never shown after confirmation; only aggregate results are revealed.
5. Resume (§4) never lands on exposed private data: rehydration always re-enters via the
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
  - `en-i18n.properties` — the source-of-truth English strings; and
  - `dutch-i18n.properties` — a complete Dutch translation of **every** string key used in
    the frontend. A key present in English but missing in Dutch is a build error, not a
    silent English fallback. `⚠️ OQ-30`
- Locale selection: Dutch or English, switchable on the Setup screen and persisted locally.
  `⚠️ OQ-30`
- **Scope boundary:** the word-pair list (Appendix A) is game *content*, not UI chrome; it is
  not part of the `.properties` files. v1 ships with a single-language word-pair list — see
  OQ-30 for whether a Dutch pair list is also required.
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
  subtle scale on the revealed word, the cover panel physics, animated phase transitions.
  (There is no timer in the app, so no timer visualization exists.)
- **One accent color, used once.** A single hot color reserved exclusively for the Charlatan
  reveal at the round result. Optional, but it makes the payoff moment land.
- **Ergonomics:** tap targets ≥ **56 px**; text readable at arm's length — the phone is
  passed around a room, not held six inches from one face. (Beyond these ergonomics,
  dedicated accessibility work is explicitly out of scope for v1.)

---

## Appendix A — Word-pair generation prompt

The source notes require "a perfect prompt" to generate ~200 candidate pairs for hand
curation. Use the following with a strong LLM, then curate manually:

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

Curation pass (human): play-test at least 30 pairs; delete anything where the first clue
reliably outs the Charlatan or where the Charlatan can never be caught.

---

## Appendix B — Assumption register

The first-pass register (OQ-1 … OQ-21) was fully decided by the product owner and folded into
this document; its file was removed. Every `⚠️ OQ-n` marker above (n ≥ 22) corresponds to an
entry in the second-pass register, [04-open-questions.md](./04-open-questions.md), produced by
re-running the ambiguity/contradiction analysis on this updated specification.
