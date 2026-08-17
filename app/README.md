# Charlatan — the app

Pass-and-play social deduction for one shared phone. This directory implements
[`../docs/01-requirements.md`](../docs/01-requirements.md) exactly; screen layouts follow
[`../docs/mockups.html`](../docs/mockups.html).

## Stack

Vite + React + TypeScript + Tailwind v4 + Motion. No router, no component library, no state
library — one `useReducer` phase machine (`src/game/reducer.ts`), fully deterministic: all
randomness is rolled in `src/game/actions.ts` and travels inside action payloads.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with HMR |
| `npm run test` | Vitest reducer suite (game rules) |
| `npx playwright test` | Full-round smoke test against the dev server |
| `npm run build` | Standard static build → repo-root `dist/` |
| `npm run build:artifact` | Single-file build + `dist/charlatan-artifact.html`, a body fragment for artifact publishing (recorder enabled by default in this mode) |

## Layout

- `src/game/` — types, reducer, scoring, persistence, word lists (`words.nl.json`, `words.en.json`)
- `src/i18n/` — `en-i18n.properties` (source of truth) + `dutch-i18n.properties`; the Vite
  plugin in `plugins/i18nProperties.ts` fails the build when the Dutch catalog is incomplete
- `src/ui/gestures.tsx` — the four privacy gestures: HoldCover, RoleHold (+release-on-target), SlideToContinue
- `src/screens/` — S1–S9
- `src/recorder/` — the `?recorder=1` interaction recorder (always on in artifact builds)

## Recorded UI e2e workflow (the click-through session)

Every data input and output component carries a unique, human-readable `data-testid` so real
play sessions can be recorded and replayed as e2e tests. The convention is
`screen.element` kebab-case, with a name suffix where rows are per-player:
`setup.name-input`, `reveal.cover`, `reveal.role-button`, `clues.confirm`,
`vote.candidate.<Name>`, `result.drill-in`, `score.next-round`, …

### 1 · Record

The recorder lives in `src/recorder/Recorder.tsx` and mounts in two cases:

- any build opened with **`?recorder=1`** in the URL;
- **artifact builds** (`npm run build:artifact`), where it is on by default because query
  params don't survive the artifact iframe (`__RECORDER_DEFAULT__` in `vite.config.ts`).

While mounted it captures, against the testids:

- `press` — pointerdown→pointerup pairs with `holdMs` and `from`/`to` coordinates, which is
  enough to reconstruct taps, the ~800 ms role long-press, the swipe-up-and-hold word reveal,
  slide-to-continue drags, and the release-on-target Whisper commit;
- `input` — text typed into inputs, coalesced per field;
- `phase` — every game-phase transition, useful as assertions between interactions.

Play a full game, then tap the **● REC** chip (bottom right) → **copy recording**. The export
is JSON:

```json
{
  "recordedAt": "2026-08-17T21:04:00.000Z",
  "userAgent": "…",
  "events": [
    { "t": 1200, "type": "phase", "phase": "reveal" },
    { "t": 3400, "type": "press", "testId": "reveal.cover", "holdMs": 1450,
      "from": { "x": 195, "y": 520 }, "to": { "x": 193, "y": 310 } },
    { "t": 9100, "type": "input", "testId": "clues.input", "value": "warm" }
  ]
}
```

### 2 · Translate

Each event maps mechanically to Playwright:

- `press` with small movement and short `holdMs` → `getByTestId(id).click()`
- `press` with long `holdMs` and little movement → `mouse.down()` → `waitForTimeout(holdMs)`
  → `mouse.up()` (the role peek)
- `press` with real `from`→`to` displacement → `mouse.down()` → `mouse.move(to, {steps})` →
  `mouse.up()` (cover swipe, slides, whisper drag; keep the hold before `up` when `holdMs`
  is long)
- `input` → `getByTestId(id).fill(value)`
- `phase` → an `expect` that the next screen's anchor testid is visible

`e2e/smoke.spec.ts` is the living example of all gesture simulations (see its `slide()`
helper and the cover-hold assertions).

### 3 · Rerun

Recorded specs land in `e2e/` and run with `npx playwright test` against the dev server
(started automatically by `playwright.config.ts`, pre-installed Chromium, 390×780 touch
viewport). Randomness caveat: roles, word pairs, and speaking order are drawn at round start
(`src/game/actions.ts`), so a literal replay can diverge from the recorded session's roles —
translated specs should either assert on invariants that hold for any draw (like the smoke
test) or drive the state deterministically the way `src/game/reducer.test.ts` does.

## Word lists

Starter lists: ~40 hand-curated pairs per locale with two distractors each. The full ~200-pair
lists are a separate curation task per locale — see Appendix A of the requirements for the
generation prompt and the curation pass.
