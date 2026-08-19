import { describe, expect, it } from 'vitest'
import wordsNl from '../game/words.nl.json'
import wordsEn from '../game/words.en.json'
import type { WordPair } from '../game/types'
import {
  fitBasisPx,
  fitFontSize,
  fittedPx,
  groupWidthEm,
  MIN_READABLE_PX,
  NARROWEST_CONTENT_PX,
  wordWidthEm,
} from './fitText'

// Mirrors the screens: reveal hero (RoundScreens) and drill-in pair (ResultAndScore).
const REVEAL_CAP_PX = 40
const WORD_TRACKING = -0.025
const PAIR_CAP_PX = 26
const PAIR_GAP_PX = 8
const PAIR_CHROME_PX = 18
const PAIR_PREFERRED_PX = 20

const catalogs: [string, WordPair[]][] = [
  ['nl', wordsNl as WordPair[]],
  ['en', wordsEn as WordPair[]],
]

const allWords = (list: WordPair[]) =>
  list.flatMap((entry) => [entry.a, entry.b, ...entry.distractors])

describe('wordWidthEm', () => {
  it('measures wide glyphs as wider than narrow ones', () => {
    expect(wordWidthEm('W')).toBeGreaterThan(wordWidthEm('I'))
    expect(wordWidthEm('koffie')).toBeLessThan(wordWidthEm('boekenwinkel'))
  })

  it('measures lowercase input at its uppercase width — words always render in caps', () => {
    expect(wordWidthEm('koffie')).toBe(wordWidthEm('KOFFIE'))
  })

  it('never under-measures a character it has no metric for', () => {
    expect(wordWidthEm('Ω')).toBeGreaterThanOrEqual(wordWidthEm('W'))
  })

  it('folds letter-spacing into the width, so measurement and render agree', () => {
    expect(wordWidthEm('KOFFIE', WORD_TRACKING)).toBeLessThan(wordWidthEm('KOFFIE'))
  })

  it('groups words under the width of the longest, so a group renders at one size', () => {
    expect(groupWidthEm(['thee', 'boekenwinkel'])).toBe(wordWidthEm('boekenwinkel'))
    expect(fitFontSize(groupWidthEm(['thee', 'boekenwinkel']), 26)).toBe(
      fitFontSize(wordWidthEm('boekenwinkel'), 26),
    )
  })
})

describe('fitFontSize', () => {
  it('caps short words and shrinks long ones, matching its testable twin', () => {
    const short = wordWidthEm('THEE', WORD_TRACKING)
    const long = wordWidthEm('VOORHOOFDSHOLTEONTSTEKING', WORD_TRACKING)
    expect(fittedPx(short, REVEAL_CAP_PX, NARROWEST_CONTENT_PX)).toBe(REVEAL_CAP_PX)
    expect(fittedPx(long, REVEAL_CAP_PX, NARROWEST_CONTENT_PX)).toBeLessThan(REVEAL_CAP_PX)
    expect(fitFontSize(long, REVEAL_CAP_PX)).toBe(
      `min(${REVEAL_CAP_PX}px, calc(100cqi / ${long.toFixed(3)}))`,
    )
  })

  it('scales the fitted word to exactly the container it is given', () => {
    const em = wordWidthEm('BOEKENWINKEL')
    expect(em * fittedPx(em, 999, 300)).toBeCloseTo(300, 6)
  })
})

// The reveal word is the hero of the screen, so the deck is held to a stricter floor
// than the layout's hard minimum: a new word long enough to break this belongs in the
// deck at a shorter spelling, not on screen at reference-text size.
const HERO_FLOOR_PX = 20

describe.each(catalogs)('reveal · every %s word fits one readable line', (_locale, list) => {
  it(`stays at or above ${HERO_FLOOR_PX}px in a ${NARROWEST_CONTENT_PX}px column`, () => {
    for (const word of allWords(list)) {
      const px = fittedPx(
        wordWidthEm(word, WORD_TRACKING),
        REVEAL_CAP_PX,
        NARROWEST_CONTENT_PX,
      )
      expect(px, word).toBeGreaterThanOrEqual(HERO_FLOOR_PX)
    }
  })
})

/** True when both cards still fit one row at the readability floor — else the row wraps. */
function sharesRow(a: string, b: string): boolean {
  const basis = fitBasisPx(groupWidthEm([a, b]), PAIR_PREFERRED_PX, PAIR_CHROME_PX)
  return 2 * basis + PAIR_GAP_PX <= NARROWEST_CONTENT_PX
}

describe('drill-in · the pair row', () => {
  it('seats a short pair side by side and stacks one that cannot share the row', () => {
    expect(sharesRow('koffie', 'thee')).toBe(true)
    expect(sharesRow('bibliotheek', 'boekenwinkel')).toBe(false)
  })
})

describe.each(catalogs)('drill-in · every %s pair fits one readable line', (_locale, list) => {
  it('keeps both words readable, side by side or stacked', () => {
    for (const entry of list) {
      const em = groupWidthEm([entry.a, entry.b])
      const column = sharesRow(entry.a, entry.b)
        ? (NARROWEST_CONTENT_PX - PAIR_GAP_PX) / 2 - PAIR_CHROME_PX
        : NARROWEST_CONTENT_PX - PAIR_CHROME_PX
      const px = fittedPx(em, PAIR_CAP_PX, column)
      expect(px, `${entry.a} / ${entry.b}`).toBeGreaterThanOrEqual(MIN_READABLE_PX)
    }
  })

  it('keeps most pairs side by side — stacking stays the exception', () => {
    const stacked = list.filter((entry) => sharesRow(entry.a, entry.b) === false)
    expect(stacked.length).toBeLessThan(list.length / 2)
  })
})
