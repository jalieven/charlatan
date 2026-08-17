# Charlatan — Full Requirements

> Derived from the original product notes. The role formerly called *Imposter* is named
> **Charlatan** everywhere. Statements marked `⚠️ OQ-n` are interpretations or additions made to
> close a gap in the source notes; each links to the corresponding entry in
> [03-open-questions.md](./03-open-questions.md).

---

## 1. Product summary

Charlatan is a **pass-and-play** social deduction game played on a **single phone** that is
handed around a group sitting together. Every player secretly receives a word. Civilians all
receive the same word; each Charlatan receives a *related but different* word (e.g. civilians
get *coffee*, the Charlatan gets *tea*). Players take turns giving one-word clues about their
word. Because the Charlatan's word is plausibly close, they can often blend in **without even
realizing they are the Charlatan**. After enough clues, the group votes someone out. A caught
Charlatan gets one final chance to guess the civilians' word and steal the win.

There is **no backend, no accounts, no networking, and no reconnection logic**. The entire game
is client-side React state, deployed as a static site, installable as an offline-capable PWA.

### 1.1 Glossary

| Term | Meaning |
|---|---|
| **Session** | One continuous play period on the device: a series of rounds with a cumulative scoreboard. Starts at Setup, ends when the group stops playing. |
| **Round** | One word pair, one Charlatan assignment, played until a verdict (someone is voted out) and its result screen. |
| **Clue cycle** | One full pass in speaking order where every player submits exactly one clue. |
| **Civilian** | A player who received the majority (real) word. |
| **Charlatan** | A player who received the decoy word (word mode) or no word (hard mode). |
| **Word pair** | A curated pair of confusable words: the *real* word (civilians) and the *decoy* word (Charlatans). |
| **Ledger** | The append-only, always-visible list of every clue typed this round, in order. |
| **Whisper** | The Charlatan's once-per-session sabotage ability (see §3.6). |
| **Dossier** | Cross-session, locally stored per-player statistics. |

---

## 2. Players, roles, and configuration

### 2.1 Player count and Charlatan scaling

- Supported player count: **4–12** players. `⚠️ OQ-1` (source only implies a minimum via the
  scaling rule; 3-player support is explicitly out of scope until decided)
- Default number of Charlatans scales with player count:
  - **4–7 players → 1 Charlatan**
  - **8+ players → 2 Charlatans**
- The **host may override** the Charlatan count at setup (range 1 to ⌊players/3⌋). `⚠️ OQ-2`
  (upper bound for the override is not in the source)

### 2.2 Setup options (Setup screen, §5 S1)

| Option | Default | Notes |
|---|---|---|
| Player names | — | Ordered list, add/remove/reorder. Names are the identity key for Dossiers (§3.9). |
| Charlatan count | Auto by player count | Host override allowed. |
| Clues per player before voting | **2** | Configurable at game start (range 1–4 `⚠️ OQ-3`). Voting opens only after this many full clue cycles. |
| Accent color on/off | On | Single accent color used exclusively for the Charlatan reveal moment (§6.5). |
| Language | Dutch | Dutch or English UI (§6.4). `⚠️ OQ-21` (default locale is assumed Dutch) |

There is deliberately **no timer of any kind**: after each player has given the configured
number of clues, it is in practice clear who the Charlatan might be, so the game gates on clue
count, not time.

### 2.3 Word assignment modes

- **Word mode (standard, always on):** Charlatans receive the decoy word of the pair. This is
  the core design bet of the product — a Charlatan holding a plausible word *may not know they
  are the Charlatan*, which is far more interesting than a player who knows they are bluffing
  from turn one.
- **Hard mode (per-Charlatan wager, opt-in at reveal):** the Charlatan receives **no word at
  all**, but earns **double points** if they survive the round. This is a *self-selected* risk
  level chosen secretly by the Charlatan on their own reveal screen and disclosed to the group
  only at the round result ("you did THAT on no information?!"). `⚠️ OQ-4` (choosing hard mode
  necessarily tells that player they are the Charlatan — this partially contradicts the
  "Charlatan may not know" principle; resolution proposed in OQ-4)
- A permanent "blank mode" for all rounds is **not** offered; blank words exist only as the
  hard-mode wager. `⚠️ OQ-5`

---

## 3. Game rules

### 3.1 Word pairs are the product

Word pairs must be **close enough to be confusable but far enough apart that clues diverge**
(coffee/tea, beach/desert, guitar/violin). The shipping list is **hand-curated, ~200 pairs**,
seeded from an LLM generation prompt and then manually filtered. Auto-generated lists that skip
curation produce pairs that are either identical or absurdly obvious — real time is budgeted
here. The generation prompt is a deliverable of this document: see **Appendix A**.

Per round, the app draws one unused pair at random (no repeats within a session), and randomly
decides which of the two words is *real* vs *decoy*. `⚠️ OQ-6` (real/decoy orientation and
repeat policy are not in the source)

### 3.2 Round structure

1. **Assign:** roles and words are assigned silently by the app.
2. **Reveal:** the phone is passed player-to-player in seating order; each player privately
   views their word (§3.3).
3. **Clue cycles:** in speaking order, each player **types a one-word clue into the phone,
   then says it aloud**. The typed clue is appended to the Ledger, which is **always visible**
   to everyone for the rest of the round (§3.5).
4. **Vote:** after the configured number of clue cycles (default 2), the group votes,
   individually and privately, by passing the phone (§3.7).
5. **Verdict:** tie → another clue cycle, then revote; majority → the accused is ejected and
   the round moves to its ending (§3.7, §3.8).
6. **Result & replay:** roles are revealed, the round is replayed clue-by-clue, points are
   awarded (§3.8, §5 S9).
7. **Scoreboard:** cumulative session scores are shown **between every round** (§5 S10).

### 3.3 The reveal (the one part that needs real care)

The reveal screen is the single most important interaction in the app — it is most of the
difference between a version people keep playing and one they abandon.

- **Hold-to-reveal:** the word is visible **only while a finger is held down** on the reveal
  surface. Never tap-to-toggle.
- **Slide-to-pass:** between players there is a **sliding "next" interstitial** (a deliberate,
  non-accidental gesture) so nobody can pick up the phone with the previous player's word
  still showing.
- What each player sees while holding:
  - **Civilian:** the real word, huge.
  - **Charlatan (word mode):** the decoy word, huge — visually **identical** to the civilian
    screen. No role label is shown, preserving the "may not know" property. `⚠️ OQ-4`
  - **Charlatan (after opting into hard mode):** a "you are the Charlatan — no word" screen.
- **Charlatan-only controls on the reveal screen** (present but disguised so screen time does
  not leak the role `⚠️ OQ-7`): the hard-mode wager toggle (§2.3) and the Whisper trigger
  (§3.6).

### 3.4 Speaking order

**Who speaks first is randomized every round**, because going first is a genuine disadvantage
and must not always fall on the same person. Subsequent speakers follow the player list order
from the random starting point. `⚠️ OQ-8` (source says "each round"; we interpret this as each
*game round*, not each clue cycle — order is stable within a round)

### 3.5 Clue ledger

- Every clue is typed before being spoken; typing is done openly (clues are public
  information anyway).
- The Ledger shows **every typed clue of every player, in order, at all times** during the
  discussion and voting phases of the round.
- At the round result, the app **replays the round**: every clue in sequence, annotated with
  who said it and where the votes landed — "here's where the room's suspicion turned." This
  post-game replay is the shareable moment of the app.

### 3.6 The Whisper

Once per **session** `⚠️ OQ-9`, a Charlatan may burn their single ability: the **next
player's** reveal screen additionally shows a fake message — *"psst, the word is X"* — where X
is a **wrong word**. That player now cannot be sure whether their originally revealed word or
the whispered word is real. It is a high-risk sabotage tool.

Constraints and mechanics (all interpreted, see `⚠️ OQ-9`):
- Triggerable only from the Charlatan's own reveal screen; it affects the next player in the
  physical pass order. A Charlatan who reveals last cannot use it that round.
- X is a plausible word that is neither the real nor the decoy word, drawn from a related
  distractor list attached to the word pair.
- If the next player is the second Charlatan, the Whisper is silently wasted.
- Using the Whisper requires knowing you are the Charlatan — like hard mode, this is only
  available to a Charlatan who has self-identified via the wager UI (see OQ-4 resolution).

### 3.7 Voting

- Voting begins after the configured number of clue cycles (default **2**) are complete.
- Voting is **individual and private**: the phone is passed around once more; each player sees
  a handoff interstitial, then a ballot with every *other* player's name, and casts exactly one
  vote. No abstaining, no self-votes. `⚠️ OQ-10`
- Resolution after all ballots are in:
  - **Tie for most votes → no ejection.** One additional clue cycle is played, then the group
    revotes. This can repeat indefinitely (there is no timer). `⚠️ OQ-11`
  - **Strict plurality on one player → that player is ejected** and the round resolves:
    - Ejected player is a **Charlatan** and **other Charlatans remain hidden** → their role is
      revealed to the group, they are removed from further clue cycles and votes, and play
      returns to the clue phase. `⚠️ OQ-12` (whether the ejected Charlatan gets an immediate
      steal guess is OQ-12; proposal: the guess happens immediately, and a correct guess ends
      the round for all Charlatans)
    - Ejected player is the **last (or only) hidden Charlatan** → the round ends; the caught
      Charlatan gets the steal guess (§3.8).
    - Ejected player is a **Civilian** → the round **ends immediately with a Charlatan
      victory**. `⚠️ OQ-13` (the biggest interpretation in this package — see OQ-13 for the
      alternative "eliminate and continue" reading)

### 3.8 The Charlatan's guess (the steal)

When a Charlatan is voted out, they get **one chance to name the real word and steal the
win**. It keeps them engaged and adds a good beat to the ending.

- The guess is **typed into the phone** by the caught Charlatan; matching is
  case-insensitive against the real word (with lightweight normalization). `⚠️ OQ-14`
- A correct guess flips the round result to a **Charlatan win** (steal).
- The result screen then reveals everything: roles, the word pair, hard-mode wagers, whether
  the Whisper was used and on whom, followed by the clue-by-clue replay.

### 3.9 Scoring and Dossiers

**The score of all previous rounds is displayed between each round** on the session
scoreboard. The source notes define only one scoring rule (hard mode doubles the surviving
Charlatan's points), so the following table is a **proposal**: `⚠️ OQ-15`

| Outcome | Points |
|---|---|
| Civilian team ejects all Charlatans (no steal) | +2 per Civilian |
| Civilian personally voted for a Charlatan on an ejecting vote | +1 bonus |
| Charlatan survives the round (a Civilian was ejected) | +4 |
| Charlatan survives on a hard-mode wager | +8 (double) |
| Ejected Charlatan steals via correct guess | +3 (Civilians get 0) |

**Dossiers** are cross-session statistics stored **locally on the device**
(`localStorage`/IndexedDB), keyed by player name: rounds played, Charlatan rounds survived
("Sarah has survived 8 of 9 Charlatan rounds"), wrong-vote streaks ("Tom has voted wrong 6
times in a row"), steals, hard-mode wagers won, Whispers used. Persistent reputations turn a
one-off party game into a running group narrative — and reputations become in-game information
("it's ALWAYS Sarah"). Dossiers are viewable from the scoreboard and can be reset. `⚠️ OQ-16`
(name collisions and reset/privacy behavior are interpreted)

---

## 4. Flows (lingual description)

The app is **one phase state machine**; the full phase set is:

`setup → assign → reveal → clues → vote → verdict → guess → result → scoreboard → (next round | end)`

(The source lists a shorter chain — see OQ-17 for the reconciliation.)

1. **Setup flow.** The host enters player names in seating order, adjusts Charlatan count,
   clues-per-player, and accent option, and taps **Start**. Validation: 4–12 unique,
   non-empty names.
2. **Assign flow (invisible).** The app draws an unused word pair, picks real/decoy
   orientation, assigns Charlatan roles uniformly at random, and picks a random first
   speaker.
3. **Reveal flow.** For each player in pass order: a **handoff interstitial** ("Pass the phone
   to *name*", slide to continue) → the **reveal screen** (hold to see the word; Charlatan
   wager/Whisper affordances per §3.3) → slide-to-pass to the next handoff. After the last
   player, the app transitions to the clue phase.
4. **Clue flow.** The screen shows the speaking order, whose turn it is, and the Ledger. The
   active player types their one-word clue, submits, and says it aloud; the turn advances.
   After every player has given a clue, the cycle counter increments. When the configured
   cycle count is reached, the app offers **Go to vote**.
5. **Vote flow.** For each player in pass order: handoff interstitial → private ballot →
   confirm. After the last ballot the app computes the verdict.
6. **Verdict flow.** Tie → banner "No majority — one more clue each" → back to Clue flow
   (§3.7). Plurality → ejection reveal: Charlatan with others remaining → back to Clue flow
   with the ejected player marked out; last Charlatan → Guess flow; Civilian → Result flow
   (Charlatans win).
7. **Guess flow.** The caught Charlatan types one guess at the real word; the app resolves
   steal or no steal.
8. **Result flow.** Full reveal (accent color moment), hard-mode wagers and Whisper usage
   disclosed, then the **replay**: clues in order with vote outcomes. Shareable moment.
9. **Scoreboard flow.** Cumulative session scores; entry point to Dossiers; **Next round**
   (same players, back to Assign) or **End session**.

---

## 5. Screens

| # | Screen | Phase | Core purpose |
|---|---|---|---|
| S1 | Setup | setup | Names, options, start |
| S2 | Handoff interstitial | reveal, vote | Privacy gate: "Pass to *name*", slide to continue |
| S3 | Reveal | reveal | Hold-to-reveal word; Charlatan wager + Whisper |
| S4 | Clue entry & Ledger | clues | Turn indicator, clue input, full Ledger |
| S5 | Vote ballot | vote | Private single-choice ballot |
| S6 | Verdict | verdict | Tie or ejection announcement |
| S7 | Charlatan's guess | guess | The steal attempt |
| S8 | Round result & replay | result | Full reveal + clue-by-clue replay |
| S9 | Scoreboard | scoreboard | Cumulative scores between rounds |
| S10 | Dossiers | scoreboard | Cross-session player stats |

Component-level detail for every screen is in [02-flows.md §3](./02-flows.md).

---

## 6. Technical requirements

### 6.1 Stack

- **Vite + React + Tailwind CSS.** No server, no data fetching, no SEO surface, no routes —
  Next.js would be pure complexity tax. Vite gives instant HMR and a static `dist/` deployable
  to Cloudflare Pages / Netlify / Vercel for free.
- **Motion** (formerly Framer Motion) for the hold-to-reveal interaction and phase
  transitions; `AnimatePresence` for phase swaps. These interactions are the app's entire
  feel — hand-rolling them in CSS gets miserable fast.
- **No router.** The phase lives in React state; React Router's back button could drop
  someone into a reveal screen mid-round.
- **No component library.** ~10 screens and one dialog; shadcn/ui defaults would fight the
  monochrome aesthetic.
- **State:** `useReducer` over a single game object; adopt Zustand only if prop drilling
  starts to hurt.
- **Persistence:** Dossiers and session scores in `localStorage` (IndexedDB if stat payloads
  grow). Word-pair list ships as a static JSON asset.
- **PWA:** add `vite-plugin-pwa` near the end (~10 lines of config). Party games get played
  in basements and bars with bad signal; "add to home screen, works offline" is a real
  quality-of-life win.

### 6.2 State machine

Single reducer with phases
`setup | assign | reveal | clues | vote | verdict | guess | result | scoreboard`.
All transitions are explicit reducer actions; illegal transitions are unrepresentable. The
reveal and vote phases carry a `cursor` (whose turn in the pass order) plus the handoff
sub-state so a dropped phone never shows private data.

### 6.3 Privacy invariants (must hold at all times)

1. A secret word is on screen **only** while a pointer is held down on the reveal surface.
2. Every transition between two players' private screens passes through a handoff
   interstitial requiring a deliberate slide gesture.
3. Charlatan-only affordances on the reveal screen must not be distinguishable to onlookers
   by screen layout, timing, or required interaction length (`⚠️ OQ-7`).
4. Ballot contents are never shown after confirmation; only aggregate results are revealed.

### 6.4 Internationalization (i18n)

- **All code is written in English**: identifiers, comments, commit messages, file names, and
  internal state values (phase names, action types, storage keys).
- **No hard-coded user-facing strings.** Every string rendered in the UI — labels, buttons,
  banners, validation messages, result copy, dossier sentences — goes through an i18n layer
  and is referenced by key. This includes interpolated/pluralized copy such as
  "Sarah has survived 8 of 9 Charlatan rounds" and "Player 3 of 8", which must use
  parameterized messages (never string concatenation) so word order can differ per language.
- **Translation files use the `.properties` format**, one file per locale, shipped as static
  assets. The implementation must include, from day one:
  - `en-i18n.properties` — the source-of-truth English strings; and
  - `dutch-i18n.properties` — a complete Dutch translation of **every** string key used in
    the frontend. A key present in English but missing in Dutch is a build error, not a
    silent English fallback. `⚠️ OQ-21`
- Locale selection: Dutch or English, switchable on the Setup screen and persisted locally
  alongside the dossier data. `⚠️ OQ-21`
- **Scope boundary:** the word-pair list (Appendix A) is game *content*, not UI chrome; it is
  not part of the `.properties` files. v1 ships with a single-language word-pair list — see
  OQ-21 for whether a Dutch pair list is also required.
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
  subtle scale on the revealed word, animated phase transitions. (The source also mentions "a
  progress ring on the discussion timer", which contradicts the no-timer rule — see OQ-18.)
- **One accent color, used once.** A single hot color reserved exclusively for the Charlatan
  reveal at the round result. Optional, but it makes the payoff moment land.
- **Ergonomics:** tap targets ≥ **56 px**; text readable at arm's length — the phone is
  passed around a room, not held six inches from one face.

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

Every `⚠️ OQ-n` marker above corresponds to an entry in
[03-open-questions.md](./03-open-questions.md). Items OQ-4, OQ-12, OQ-13, and OQ-15 are
**High severity**: they change game rules, scoring, or core UX and must be decided before the
corresponding features are built.
