# Charlatan — Requirements Documentation

Charlatan is a pass-and-play social deduction party game for one shared phone. One or more
players (the **Charlatans**) receive a different secret word than everyone else and must blend
in during clue-giving without knowing — at least at first — that they are the odd one out.

This folder is the requirements package derived from the original product notes
(`charlatan.txt`). It is meant to be validated by the product owner **before implementation
starts**.

| Document | Purpose |
|---|---|
| [01-requirements.md](./01-requirements.md) | Full lingual + technical description of the game, every flow, every screen, and the technology decisions. |
| [02-flows.md](./02-flows.md) | Flow diagrams (session level, round level, reveal micro-flow, vote resolution) and the screen-by-screen component inventory. |
| [03-open-questions.md](./03-open-questions.md) | Every inconsistency, contradiction, ambiguity, and under-specified area found in the source notes, each with a proposed resolution to accept or reject. |

## How to read this package

1. Read **01-requirements.md** top to bottom — anything marked `⚠️ OQ-n` is an assumption the
   authors had to make, cross-referenced to the open-questions register.
2. Validate the game logic visually against the diagrams in **02-flows.md**.
3. Go through **03-open-questions.md** and decide each item. The proposed resolutions there are
   defaults, not decisions — implementation should not start on the affected features until the
   items marked **High** are settled.

## Naming

The source notes use the working title *Imposter*. The product name is **Charlatan**; the
hidden role is called **the Charlatan** (plural: Charlatans) throughout this package and in all
future UI copy.
