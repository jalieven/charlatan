# Charlatan — Requirements Documentation

Charlatan is a pass-and-play social deduction party game for one shared phone. One or more
players (the **Charlatans**) receive a different secret word than everyone else and must blend
in during clue-giving without knowing — at least at first — that they are the odd one out.

This folder is the requirements package derived from the original product notes
(`charlatan.txt`) plus **four completed rounds of product-owner decisions**. The
de-ambiguation process is closed: **the specification is implementation-ready.**

| Document | Purpose |
|---|---|
| [01-requirements.md](./01-requirements.md) | Full lingual + technical description of the game, every flow, every screen, and the technology decisions — the single source of truth. Appendix C carries the playtest watch-list. |
| [02-flows.md](./02-flows.md) | Flow diagrams (session level, round level, reveal micro-flow, vote resolution) and the screen-by-screen component inventory. |

## Document history

Each pass catalogued the spec's gaps as a numbered open-questions register; the product owner
decided every item; the decisions were folded into 01/02 and the register file removed.
Numbering ran continuously across passes (OQ-1 … OQ-41) so no reference was ever ambiguous.

- **First pass** (`03-open-questions.md`, OQ-1 … OQ-21): every gap in the original notes —
  including the peek mechanic, classic eliminations, the tie limit, Whisper economy, dossier
  removal, and i18n.
- **Second pass** (`04-open-questions.md`, OQ-22 … OQ-32): the one-thumb reveal grammar, the
  parity threshold, per-player Whisper cards, roster changes, resume.
- **Third pass** (`05-open-questions.md`, OQ-27 / OQ-33 … OQ-39): peek disclosure and
  observability, the one-Whisper-per-round cap, the blind double surviving a teammate's
  steal, per-locale word lists.
- **Fourth pass** (`06-open-questions.md`, OQ-40 … OQ-41): the three-act result screen and
  the accepted Whisper-availability tell. **All decided — process closed.**

## How to read this package

1. Read **01-requirements.md** top to bottom; it contains every decision inline, with no
   pending markers.
2. Validate the game logic visually against the diagrams in **02-flows.md**.
3. During playtests, revisit **Appendix C** of 01 (the watch-list): Whisper cascade pacing,
   above-default Charlatan counts, and the blind-double payout.

## Naming

The source notes use the working title *Imposter*. The product name is **Charlatan**; the
hidden role is called **the Charlatan** (plural: Charlatans) throughout this package and in all
future UI copy.
