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

## Word lists

Starter lists: ~40 hand-curated pairs per locale with two distractors each. The full ~200-pair
lists are a separate curation task per locale — see Appendix A of the requirements for the
generation prompt and the curation pass.
