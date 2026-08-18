import type { Action } from './reducer'
import type { GameState, WordPair } from './types'
import { charlatanCount } from './types'
import wordsNl from './words.nl.json'
import wordsEn from './words.en.json'

export const wordLists: Record<'nl' | 'en', WordPair[]> = {
  nl: wordsNl as WordPair[],
  en: wordsEn as WordPair[],
}

const randInt = (n: number) => Math.floor(Math.random() * n)

/** Uniform-random permutation of seats 0..of-1 (Fisher-Yates). */
function shuffledSeats(of: number): number[] {
  const seats = Array.from({ length: of }, (_, i) => i)
  for (let i = seats.length - 1; i > 0; i--) {
    const j = randInt(i + 1)
    ;[seats[i], seats[j]] = [seats[j], seats[i]]
  }
  return seats
}

function sampleSeats(count: number, of: number): number[] {
  return shuffledSeats(of)
    .slice(0, count)
    .sort((a, b) => a - b)
}

// The impure boundary: all randomness is rolled HERE and travels in the action
// payload, keeping the reducer deterministic (testable, resumable).
export function startRoundAction(state: GameState): Action | null {
  const session = state.session
  if (!session) return null
  const names = session.players.filter((p) => !p.left)
  const n = names.length
  const list = wordLists[state.locale]
  // Per-locale no-repeat draw pool; recycle when exhausted rather than halting the party.
  const unused = list.map((_, i) => i).filter((i) => !session.usedPairIndexes.includes(i))
  const pool = unused.length > 0 ? unused : list.map((_, i) => i)
  const pairIndex = pool[randInt(pool.length)]
  const pair = list[pairIndex]
  return {
    type: 'START_ROUND',
    pairIndex,
    orientation: Math.random() < 0.5,
    charlatanSeats: sampleSeats(charlatanCount(n, state.settings.charlatanOverride), n),
    speakerOrder: shuffledSeats(n),
    pair: { a: pair.a, b: pair.b, distractors: pair.distractors },
  }
}

/** Uniform-random later revealer + distractor + random word order (§3.6). */
export function burnWhisperAction(state: GameState): Action | null {
  const round = state.round
  if (!round) return null
  // Later revealers by position in the round's shuffled order. The second
  // revealer is never a target when the first whispers: with only one revealer
  // before them, the target would know exactly who the Charlatan is.
  const laterSeats = round.speakerOrder.filter(
    (_, pos) => pos > round.cursor && !(round.cursor === 0 && pos === 1),
  )
  if (laterSeats.length === 0) return null
  return {
    type: 'BURN_WHISPER',
    targetSeat: laterSeats[randInt(laterSeats.length)],
    fakeWord: round.pair.distractors[randInt(round.pair.distractors.length)],
    swapped: Math.random() < 0.5,
  }
}
