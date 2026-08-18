export type Locale = 'nl' | 'en'

export type Phase =
  | 'setup'
  | 'reveal'
  | 'clues'
  | 'vote'
  | 'verdict'
  | 'guess'
  | 'result'
  | 'scoreboard'

export type Role = 'civilian' | 'charlatan'

export interface WordPair {
  a: string
  b: string
  domain: string
  /** Same-domain fake words for the Whisper; every pair carries at least 5. */
  distractors: string[]
}

export interface Settings {
  /** null = auto scaling (1 for 3-7 players, 2 for 8+) */
  charlatanOverride: number | null
  cluesPerPlayer: number
  whisperCardsPerPlayer: number
}

export interface SessionPlayer {
  name: string
  score: number
  whisperCards: number
  /** Grayed leaver; restored (score + cards) on same-name rejoin. */
  left: boolean
}

export interface RoundPlayer {
  name: string
  role: Role
  eliminated: boolean
  peeked: boolean
}

export interface Clue {
  author: string
  word: string
  cycle: number
}

export interface BallotRecord {
  /** voter -> target; never rendered per-voter, used for the correct-vote bonus. */
  votes: Record<string, string>
  outcome: 'tie' | 'ejection'
  ejected?: string
}

export type RoundOutcome =
  | { kind: 'civilians' }
  | { kind: 'charlatans-parity' }
  | { kind: 'charlatans-ties' }
  | { kind: 'steal'; by: string }

export interface ScoreDelta {
  win: number
  blind: number
  vote: number
  survive: number
  steal: number
  total: number
}

export interface RoundSummary {
  number: number
  outcome: RoundOutcome
  pair: { real: string; decoy: string }
  charlatans: string[]
  peeked: string[]
  whisper: { by: string; target: string; fakeWord: string } | null
  guess: { by: string; text: string; correct: boolean } | null
  ledger: Clue[]
  ballots: BallotRecord[]
  deltas: Record<string, ScoreDelta>
}

export type VerdictInfo =
  | { kind: 'tie'; count: number; tally: Record<string, number> }
  | { kind: 'tie-limit'; tally: Record<string, number> }
  | { kind: 'ejection'; ejected: string; role: Role; tally: Record<string, number> }

export interface RoundState {
  number: number
  pair: { real: string; decoy: string; distractors: string[] }
  players: RoundPlayer[]
  /** Fresh uniform-random permutation of all seats, drawn at round start; stable within the round. */
  speakerOrder: number[]
  /** Reveal/vote progress: position within the phase's seat order. */
  cursor: number
  /** Handoff interstitial active (privacy gate). */
  handoff: boolean
  cycle: number
  requiredCycles: number
  /** Position within the speaking order for the current cycle. */
  turn: number
  /** Cycle complete and requiredCycles reached: "Go to vote" is offered. */
  awaitingVote: boolean
  ledger: Clue[]
  votes: Record<string, string>
  ballots: BallotRecord[]
  consecutiveTies: number
  verdict: VerdictInfo | null
  whisper: { by: string; target: string; fakeWord: string; swapped: boolean } | null
  pendingGuesser: string | null
  guess: { by: string; text: string; correct: boolean } | null
  outcome: RoundOutcome | null
  /** Result staging: acts 1-3 plus the words+replay drill-in. */
  resultAct: 1 | 2 | 3
  drillIn: boolean
}

export interface GameState {
  phase: Phase
  locale: Locale
  settings: Settings
  setupNames: string[]
  session: {
    players: SessionPlayer[]
    roundsPlayed: number
    usedPairIndexes: number[]
    history: RoundSummary[]
  } | null
  round: RoundState | null
}

export const MIN_PLAYERS = 3
export const MAX_PLAYERS = 12
export const TIE_LIMIT = 3

export function autoCharlatans(playerCount: number): number {
  return playerCount >= 8 ? 2 : 1
}

export function maxCharlatans(playerCount: number): number {
  return Math.max(1, Math.floor(playerCount / 3))
}

export function charlatanCount(playerCount: number, override: number | null): number {
  if (override === null) return autoCharlatans(playerCount)
  return Math.min(Math.max(1, override), maxCharlatans(playerCount))
}

export const initialState: GameState = {
  phase: 'setup',
  locale: 'nl',
  settings: { charlatanOverride: null, cluesPerPlayer: 2, whisperCardsPerPlayer: 1 },
  setupNames: [],
  session: null,
  round: null,
}
