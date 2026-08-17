# Charlatan — Requirements Documentation

Charlatan is a pass-and-play social deduction party game for one shared phone. One or more
players (the **Charlatans**) receive a different secret word than everyone else and must blend
in during clue-giving without knowing — at least at first — that they are the odd one out.

This folder is the requirements package derived from the original product notes
(`charlatan.txt`) plus two completed rounds of product-owner decisions. It is meant to be
validated **before implementation starts**.

| Document | Purpose |
|---|---|
| [01-requirements.md](./01-requirements.md) | Full lingual + technical description of the game, every flow, every screen, and the technology decisions. Includes all decisions from both passes. |
| [02-flows.md](./02-flows.md) | Flow diagrams (session level, round level, reveal micro-flow, vote resolution) and the screen-by-screen component inventory. |
| [05-open-questions.md](./05-open-questions.md) | The **third-pass** register: remaining and newly found ambiguities after incorporating both decision passes, each with a proposed resolution. |

## Document history

- **First pass:** an initial register (`03-open-questions.md`, OQ-1 … OQ-21) catalogued every
  gap in the original notes. All 21 items were decided and folded in; the file was removed.
- **Second pass:** re-running the analysis produced `04-open-questions.md` (OQ-22 … OQ-32).
  All items were decided — including the one-thumb reveal grammar (OQ-22), the parity
  threshold change from the watch-list, and per-player Whisper cards — and folded in; the
  file was removed.
- **Third pass:** the analysis was re-run again, producing
  [05-open-questions.md](./05-open-questions.md) (OQ-33 … OQ-39, plus OQ-27 carried over with
  the requested explanation). Numbering continues across passes so no reference is ever
  ambiguous.

## How to read this package

1. Read **01-requirements.md** top to bottom — anything marked `⚠️ OQ-n` is an interpretation
   made while incorporating the decisions, cross-referenced to the third-pass register.
2. Validate the game logic visually against the diagrams in **02-flows.md**.
3. Go through **05-open-questions.md** and decide each item — start with OQ-27 (peek
   disclosure, explained there) and OQ-33 (confirming the parity threshold).

## Naming

The source notes use the working title *Imposter*. The product name is **Charlatan**; the
hidden role is called **the Charlatan** (plural: Charlatans) throughout this package and in all
future UI copy.
