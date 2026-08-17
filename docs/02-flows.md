# Charlatan — Flow Diagrams & Screen Components

Diagrams are Mermaid and render directly on GitHub. Screen identifiers (S1–S10) match
[01-requirements.md §5](./01-requirements.md#5-screens). `OQ-n` markers reference
[03-open-questions.md](./03-open-questions.md).

---

## 1. Session-level flow

One session = repeated rounds with a cumulative scoreboard. There is no built-in session end
condition (OQ-19) — the group simply stops.

```mermaid
flowchart TD
    Launch(["App launch"]) --> S1["S1 · Setup<br/>names, Charlatan count,<br/>clues per player, accent"]
    S1 -->|Start game| Round["ROUND<br/>(see diagram 2)"]
    Round --> S9["S9 · Scoreboard<br/>cumulative session scores"]
    S9 -->|View dossiers| S10["S10 · Dossiers<br/>cross-session stats"]
    S10 --> S9
    S9 -->|Next round<br/>same players, new word pair| Round
    S9 -->|End session| Launch
```

---

## 2. Round-level flow (the phase state machine)

```mermaid
flowchart TD
    Assign["ASSIGN (invisible)<br/>draw unused word pair · pick real/decoy ·<br/>assign Charlatans · random first speaker"]
    Assign --> H1["S2 · Handoff<br/>'Pass the phone to NAME'"]

    subgraph RevealLoop["REVEAL — once per player, in pass order"]
        H1 --> S3["S3 · Reveal<br/>hold-to-reveal word<br/>+ Charlatan wager / Whisper (OQ-4, OQ-9)"]
        S3 -->|slide to pass,<br/>more players left| H1
    end
    S3 -->|slide to pass,<br/>all players done| Clues

    subgraph ClueLoop["CLUES"]
        Clues["S4 · Clue entry + Ledger<br/>active player types one word,<br/>says it aloud, turn advances"]
        Clues -->|"cycle complete, cycles < N<br/>(N = clues per player, default 2)"| Clues
    end
    Clues -->|N cycles complete| H2["S2 · Handoff<br/>'Pass the phone to NAME'"]

    subgraph VoteLoop["VOTE — once per active player, private"]
        H2 --> S5["S5 · Vote ballot<br/>pick one other player"]
        S5 -->|more voters left| H2
    end
    S5 -->|all ballots in| S6{"S6 · Verdict"}

    S6 -->|"tie for most votes (OQ-11)"| ExtraClue["+1 clue cycle"] --> Clues
    S6 -->|"plurality: ejected player is a CIVILIAN<br/>(OQ-13)"| ResultCharlatans["S8 · Result<br/>CHARLATANS WIN"]
    S6 -->|"plurality: ejected player is a CHARLATAN,<br/>others still hidden (OQ-12)"| Guess1["S7 · Charlatan's guess<br/>(caught Charlatan, OQ-12)"]
    S6 -->|"plurality: ejected player is the<br/>LAST hidden CHARLATAN"| Guess2["S7 · Charlatan's guess"]

    Guess1 -->|guess correct| ResultSteal["S8 · Result<br/>STEAL — Charlatans win"]
    Guess1 -->|guess wrong| MarkOut["Ejected Charlatan removed<br/>from clues & votes"] --> Clues
    Guess2 -->|guess correct| ResultSteal
    Guess2 -->|guess wrong| ResultCivilians["S8 · Result<br/>CIVILIANS WIN"]

    ResultCharlatans --> Replay["S8 · Replay<br/>every clue in order + vote history<br/>+ wagers & Whisper disclosed"]
    ResultSteal --> Replay
    ResultCivilians --> Replay
    Replay --> Score["S9 · Scoreboard (see diagram 1)"]
```

---

## 3. Reveal micro-flow (the interaction that needs real care)

```mermaid
flowchart TD
    H["S2 · Handoff: 'Pass the phone to NAME'"] -->|slide to continue| Idle["S3 · Reveal (idle)<br/>word hidden, 'hold to see your word'"]
    Idle -->|press and hold| Showing["Word visible<br/>(hold-to-reveal)"]
    Showing -->|release finger| Idle

    Showing -.->|"viewer is a Charlatan AND<br/>opts into the wager UI (OQ-4, OQ-7)"| CharlatanPanel["Charlatan panel<br/>· hard-mode wager toggle<br/>· Whisper trigger (once/session)"]
    CharlatanPanel -->|"arm Whisper (OQ-9)"| WhisperArmed["Next player's reveal will show<br/>'psst, the word is X' (X = distractor)"]
    CharlatanPanel --> Idle
    WhisperArmed --> Idle

    Idle -->|"slide 'next' (deliberate gesture —<br/>nobody inherits the last word)"| NextH["Next handoff or Clue phase"]
```

Invariants: the word renders **only** during an active pointer hold; leaving S3 always passes
through the slide gesture; the Charlatan panel must not be detectable by onlookers from
interaction shape or duration (OQ-7).

---

## 4. Vote resolution decision tree

```mermaid
flowchart TD
    A["All ballots in"] --> B{"Single player with<br/>strictly most votes?"}
    B -->|"No — tie (OQ-11)"| C["No ejection ·<br/>one more clue cycle · revote"]
    B -->|Yes| D{"Ejected player's role?"}
    D -->|Civilian| E["Round ends ·<br/>Charlatans win (OQ-13)"]
    D -->|Charlatan| F{"Other Charlatans<br/>still hidden?"}
    F -->|Yes| G["Steal guess (OQ-12) ·<br/>wrong → back to clues without them ·<br/>correct → steal, round ends"]
    F -->|No| H["Steal guess ·<br/>wrong → Civilians win ·<br/>correct → steal, Charlatans win"]
```

---

## 5. Screen component inventory

### S1 · Setup
| Component | Notes |
|---|---|
| Title / logo lockup | Heavy display type, monochrome |
| Player name list | Add / remove / reorder; order = seating & pass order; min 4, max 12 (OQ-1) |
| Name input + add button | 56 px targets; duplicate names rejected (OQ-16) |
| Charlatan count stepper | Auto default (1 for 4–7, 2 for 8+), host override (OQ-2) |
| Clues-per-player stepper | Default 2, range 1–4 (OQ-3) |
| Accent color toggle | On by default |
| Start button | Disabled until valid; primary action |
| Dossier entry link | Existing local stats reachable pre-game |

### S2 · Handoff interstitial (shared by reveal & vote)
| Component | Notes |
|---|---|
| "Pass the phone to" label | Tiny uppercase, wide letter-spacing |
| Player name | Massive heavy type |
| Slide-to-continue control | Deliberate gesture; blocks accidental exposure |
| Progress indicator | "Player 3 of 8" |

### S3 · Reveal
| Component | Notes |
|---|---|
| Hold-to-reveal surface | Full-bleed; word only while pointer held; subtle scale animation on the word |
| Secret word / hard-mode notice | Massive heavy type; identical layout for civilian & Charlatan (OQ-4) |
| Whisper banner (conditional) | "psst, the word is X" when a Whisper targets this player (OQ-9) |
| Charlatan panel (conditional, disguised) | Hard-mode wager toggle + Whisper trigger (OQ-7) |
| Slide-to-pass control | Exits to next handoff / clue phase |

### S4 · Clue entry + Ledger
| Component | Notes |
|---|---|
| Turn banner | "NAME, your clue" — speaking order from random first speaker |
| Speaking-order strip | All players; ejected players struck through |
| One-word clue input | Single token enforced; submit ≥ 56 px |
| Ledger | Every clue this round, in order, always visible; grouped by cycle |
| Cycle counter | "Clue round 1 of 2" |
| Go-to-vote button | Appears only when N cycles complete |

### S5 · Vote ballot
| Component | Notes |
|---|---|
| Voter banner | "NAME, who is the Charlatan?" |
| Candidate list | All active players except the voter (OQ-10); 56 px rows |
| Ledger (read-only, collapsed) | Reference while voting |
| Confirm vote button | Locks ballot; no un-vote after confirm |

### S6 · Verdict
| Component | Notes |
|---|---|
| Vote tally | Aggregate only — individual ballots stay secret |
| Outcome banner | "Tie — one more clue each" / "NAME is voted out" |
| Continue button | To clues, guess, or result per decision tree |

### S7 · Charlatan's guess
| Component | Notes |
|---|---|
| Caught-Charlatan banner | "NAME — you were caught. One guess." |
| Guess input | Typed; case-insensitive match (OQ-14) |
| Submit button | One attempt only |

### S8 · Round result + replay
| Component | Notes |
|---|---|
| Role reveal | The **one accent-color moment** of the app; Charlatan names in the accent |
| Word pair reveal | Real word vs decoy word |
| Wager & Whisper disclosure | Hard-mode bets and Whisper usage revealed here only |
| Steal outcome | If a guess happened |
| Replay timeline | Every clue in order + where suspicion turned; the shareable moment |
| Points summary | Per-player deltas this round (OQ-15) |
| Continue button | To scoreboard |

### S9 · Scoreboard
| Component | Notes |
|---|---|
| Cumulative score table | All rounds this session; shown between every round |
| Round history strip | Compact per-round outcomes |
| Next-round button | Same players, new assignment |
| End-session button | Back to launch/setup |
| Dossiers link | To S10 |

### S10 · Dossiers
| Component | Notes |
|---|---|
| Per-player stat cards | "Survived 8 of 9 Charlatan rounds", wrong-vote streaks, steals, hard-mode record, Whispers |
| Storage notice | Local-only, this device |
| Reset control | Clears local stats, with confirm (OQ-16) |
