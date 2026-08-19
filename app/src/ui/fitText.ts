/**
 * One-line fitting for the secret words (§6.5 — the word is the typographic hero).
 *
 * A secret word may never wrap and never break mid-word: a broken word reads as a
 * different, shorter word ("BIBLIO / THEEK") and quietly changes what the table is
 * playing. So instead of letting the line break, the type shrinks until the word fits.
 *
 * The measurement is static. GLYPH_EM holds the real advance widths of the bundled
 * Space Grotesk at wght=700 (extracted from `src/assets/space-grotesk.woff2`), so the
 * width of any word is known without touching the DOM — no ref, no ResizeObserver, no
 * measure-then-reflow flash — and the exact same numbers are available to the tests
 * that guard the word decks.
 */

/** Advance width in em, uppercase Space Grotesk 700 — the only case words render in. */
const GLYPH_EM: Record<string, number> = {
  ' ': 0.254, "'": 0.294, '-': 0.432,
  A: 0.634, B: 0.664, C: 0.644, D: 0.666, E: 0.554, F: 0.534, G: 0.662,
  H: 0.656, I: 0.264, J: 0.61, K: 0.626, L: 0.542, M: 0.882, N: 0.67,
  O: 0.676, P: 0.604, Q: 0.676, R: 0.632, S: 0.606, T: 0.588, U: 0.672,
  V: 0.618, W: 0.898, X: 0.644, Y: 0.624, Z: 0.576,
  À: 0.634, Ä: 0.634, È: 0.554, É: 0.554, Ê: 0.554, Ë: 0.554,
  Î: 0.264, Ï: 0.264, Ñ: 0.67, Ö: 0.676, Û: 0.672, Ü: 0.672,
}

/** Widest glyph in the face: an unlisted character is never under-measured. */
const UNKNOWN_EM = 0.898

/**
 * Head-room on every measurement. Covers the fallback face during the webfont swap
 * (wider than Space Grotesk) and any hinting rounding — the word lands a hair smaller
 * than the theoretical maximum rather than a hair too wide.
 */
const SAFETY = 1.04

/** Narrowest content column we support: a 360 px phone minus the shell's 2×20 px. */
export const NARROWEST_CONTENT_PX = 320

/**
 * Hard floor: below this an all-caps word stops being comfortably readable on a phone
 * held by someone else. It is what the layout falls back on — a pair that cannot show
 * both words at this size side by side stacks instead of shrinking further.
 */
export const MIN_READABLE_PX = 18

/** Width of `text` in em when rendered uppercase at weight 700 with `tracking` em of letter-spacing. */
export function wordWidthEm(text: string, tracking = 0): number {
  const chars = [...text.toUpperCase()]
  const raw = chars.reduce((sum, c) => sum + (GLYPH_EM[c] ?? UNKNOWN_EM) + tracking, 0)
  return Math.max(raw, 0) * SAFETY
}

/** Width in em of the widest of `texts` — a group of words rendered at one shared size. */
export function groupWidthEm(texts: string[], tracking = 0): number {
  return Math.max(...texts.map((t) => wordWidthEm(t, tracking)))
}

/**
 * The `font-size` value: the cap, or whatever makes the word span exactly the container.
 * `100cqi` is the container's own inline size, so the browser resolves the fit at paint
 * time and re-resolves it on rotation or resize, with no JS in the loop.
 */
export function fitFontSize(widthEm: number, capPx: number): string {
  return `min(${capPx}px, calc(100cqi / ${widthEm.toFixed(3)}))`
}

/** What `fitFontSize` resolves to in a container of `containerPx` — the testable twin. */
export function fittedPx(widthEm: number, capPx: number, containerPx: number): number {
  return Math.min(capPx, containerPx / widthEm)
}

/**
 * Flex basis for a card holding a fitted word: the width that word needs to stay at
 * `minPx`, plus the card's own horizontal padding. Two such cards in a `flex-wrap` row
 * therefore sit side by side while both fit, and stack full-width the moment they don't
 * — nothing squeezes a long word into an unreadable column.
 */
export function fitBasisPx(widthEm: number, minPx: number, chromePx = 0): number {
  // Rounded up: a card asking for one pixel less than it needs is a card whose word
  // ends up a hair under the floor instead of stacking.
  return Math.ceil(widthEm * minPx + chromePx)
}
