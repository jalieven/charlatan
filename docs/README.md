# Charlatan — Requirements Documentation

Charlatan is a pass-and-play social deduction party game for one shared phone. One or more
players (the **Charlatans**) receive a different secret word than everyone else and must blend
in during clue-giving without knowing — at least at first — that they are the odd one out.

This folder is the requirements package derived from the original product notes
(`charlatan.txt`) plus one completed round of product-owner decisions. It is meant to be
validated **before implementation starts**.

| Document | Purpose |
|---|---|
| [01-requirements.md](./01-requirements.md) | Full lingual + technical description of the game, every flow, every screen, and the technology decisions. Includes all first-pass decisions. |
| [02-flows.md](./02-flows.md) | Flow diagrams (session level, round level, reveal micro-flow, vote resolution) and the screen-by-screen component inventory. |
| [04-open-questions.md](./04-open-questions.md) | The **second-pass** register: new inconsistencies, ambiguities, and tensions found after incorporating the first-pass decisions, each with a proposed resolution. |

## Document history

- **First pass:** an initial register (`03-open-questions.md`, items OQ-1 … OQ-21) catalogued
  every gap in the original notes. The product owner decided all 21 items; the decisions are
  folded into 01/02 and the file was removed.
- **Second pass:** the analysis was re-run on the updated specification, producing
  [04-open-questions.md](./04-open-questions.md) (items OQ-22 … OQ-32 — numbering continues so
  no reference is ever ambiguous).

## How to read this package

1. Read **01-requirements.md** top to bottom — anything marked `⚠️ OQ-n` is an interpretation
   made while incorporating the decisions, cross-referenced to the second-pass register.
2. Validate the game logic visually against the diagrams in **02-flows.md**.
3. Go through **04-open-questions.md** and decide each item. OQ-22 (the swipe-up reveal's
   snap-back behavior) is the one **High**-severity item and gates the reveal screen's build.

## Naming

The source notes use the working title *Imposter*. The product name is **Charlatan**; the
hidden role is called **the Charlatan** (plural: Charlatans) throughout this package and in all
future UI copy.
