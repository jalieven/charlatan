import type {
  BallotRecord,
  GameState,
  RoundOutcome,
  RoundPlayer,
  RoundState,
  VerdictInfo,
} from './types'
import { initialState, MAX_PLAYERS, MIN_PLAYERS, PIN_RE, TIE_LIMIT } from './types'
import { scoreRound } from './scoring'

// Every source of randomness lives in the ACTION PAYLOAD (produced by the
// creators in actions.ts), so this reducer is fully deterministic and the
// whole game is unit-testable and resumable.
export type Action =
  | { type: 'SET_LOCALE'; locale: 'nl' | 'en' }
  | { type: 'ADD_NAME'; name: string }
  | { type: 'SET_PIN'; name: string; pin: string }
  | { type: 'REMOVE_NAME'; name: string }
  | { type: 'MOVE_NAME'; name: string; dir: -1 | 1 }
  | { type: 'SET_CHARLATAN_OVERRIDE'; value: number | null }
  | { type: 'SET_CLUES_PER_PLAYER'; value: number }
  | { type: 'SET_WHISPER_CARDS'; value: number }
  | { type: 'START_SESSION' }
  | {
      type: 'START_ROUND'
      pairIndex: number
      /** true = pair.a is the real word, false = pair.b */
      orientation: boolean
      charlatanSeats: number[]
      speakerOrder: number[]
      pair: {
        a: string
        b: string
        defA: string
        defB: string
        distractors: string[]
        distractorDefs: string[]
      }
    }
  | { type: 'HANDOFF_CONTINUE' }
  | { type: 'PEEK' }
  | {
      type: 'BURN_WHISPER'
      targetSeat: number
      fakeWord: string
      fakeWordDef: string
      swapped: boolean
    }
  | { type: 'REVEAL_NEXT' }
  | { type: 'SUBMIT_CLUE'; word: string }
  | { type: 'OPEN_RECHECK'; seat: number }
  | { type: 'CLOSE_RECHECK' }
  | { type: 'GO_TO_VOTE' }
  | { type: 'SKIP_ROUND' }
  | { type: 'CAST_VOTE'; target: string }
  | { type: 'VERDICT_CONTINUE' }
  | { type: 'SUBMIT_GUESS'; text: string }
  | { type: 'RESULT_ADVANCE' }
  | { type: 'RESULT_BACK' }
  | { type: 'FINISH_ROUND' }
  | { type: 'ROSTER_ADD'; name: string }
  | { type: 'ROSTER_REMOVE'; name: string }
  | { type: 'OPEN_SUMMARY' }
  | { type: 'BACK_TO_SCOREBOARD' }
  | { type: 'END_SESSION' }
  | { type: 'RESUME'; state: GameState }

/** Seat indexes of players still in the round, in seating (pass) order. */
export function activeSeats(round: RoundState): number[] {
  return round.players.map((_, i) => i).filter((i) => !round.players[i].eliminated)
}

/** Speaking order for the current cycle: the round's shuffled seats, minus eliminated. */
export function speakingOrder(round: RoundState): number[] {
  return round.speakerOrder.filter((seat) => !round.players[seat].eliminated)
}

export function currentSpeaker(round: RoundState): RoundPlayer | null {
  const order = speakingOrder(round)
  return round.turn < order.length ? round.players[order[round.turn]] : null
}

/** Seat currently holding the phone in the reveal phase (cursor indexes into speakerOrder). */
export function revealSeat(round: RoundState): number {
  return round.speakerOrder[round.cursor]
}

/** Seat currently voting (cursor indexes into the shuffled order minus eliminated). */
export function votingSeat(round: RoundState): number {
  return speakingOrder(round)[round.cursor]
}

export function tally(votes: Record<string, string>): Record<string, number> {
  const t: Record<string, number> = {}
  for (const target of Object.values(votes)) t[target] = (t[target] ?? 0) + 1
  return t
}

/** The word this player must see while holding the cover open. */
export function wordFor(round: RoundState, seat: number): string {
  return round.players[seat].role === 'charlatan' ? round.pair.decoy : round.pair.real
}

/** The definition shown under that word — the decoy gets its own, so both roles read the same layout. */
export function definitionFor(round: RoundState, seat: number): string {
  return round.players[seat].role === 'charlatan' ? round.pair.decoyDef : round.pair.realDef
}

/** Whisper eligibility for the seat currently revealing (requirements §3.6). */
export function canWhisper(state: GameState): boolean {
  const round = state.round
  if (!round || state.phase !== 'reveal' || round.handoff) return false
  const player = round.players[revealSeat(round)]
  const session = state.session
  if (!session) return false
  const cards = session.players.find((p) => p.name === player.name)?.whisperCards ?? 0
  return (
    player.role === 'charlatan' &&
    player.peeked &&
    cards > 0 &&
    round.whisper === null &&
    round.cursor < round.players.length - 1
  )
}

/** Clue identity for the no-repeat rule: trimmed, case- and diacritics-insensitive. */
export function normalizeClue(word: string): string {
  return word
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** A clue already spoken this round — by anyone, in any cycle — can never be repeated (§3.5). */
export function isDuplicateClue(round: RoundState, word: string): boolean {
  const w = normalizeClue(word)
  return w !== '' && round.ledger.some((c) => normalizeClue(c.word) === w)
}

// Steal matching: case-insensitive, trimmed, diacritics-insensitive, with
// basic singular/plural tolerance (nl: -en/-s/-'s, en: -s/-es).
export function guessMatches(guess: string, real: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/['’]/g, '')
  const g = norm(guess)
  const r = norm(real)
  if (!g) return false
  if (g === r) return true
  const suffixes = ['s', 'es', 'en']
  for (const suf of suffixes) {
    if (g === r + suf || r === g + suf) return true
  }
  return false
}

function withRound(state: GameState, round: Partial<RoundState>): GameState {
  return { ...state, round: { ...state.round!, ...round } }
}

/** Resolve a completed ballot into verdict info + tie counter. */
function resolveBallot(round: RoundState): { verdict: VerdictInfo; ballot: BallotRecord; ties: number } {
  const t = tally(round.votes)
  const max = Math.max(...Object.values(t))
  const top = Object.keys(t).filter((name) => t[name] === max)
  if (top.length !== 1) {
    const ties = round.consecutiveTies + 1
    const ballot: BallotRecord = { votes: round.votes, outcome: 'tie' }
    if (ties >= TIE_LIMIT) return { verdict: { kind: 'tie-limit', tally: t }, ballot, ties }
    return { verdict: { kind: 'tie', count: ties, tally: t }, ballot, ties }
  }
  const ejected = top[0]
  const role = round.players.find((p) => p.name === ejected)!.role
  return {
    verdict: { kind: 'ejection', ejected, role, tally: t },
    ballot: { votes: round.votes, outcome: 'ejection', ejected },
    ties: 0,
  }
}

/** Enter the result phase: compute and stash the round summary via scoring. */
function toResult(state: GameState, round: RoundState, outcome: RoundOutcome): GameState {
  const finished: RoundState = { ...round, outcome, resultAct: 1 }
  return { ...state, phase: 'result', round: finished }
}

/** One more clue cycle among survivors, then a revote (§3.7). */
function backToClues(round: RoundState): Partial<RoundState> {
  return {
    requiredCycles: round.requiredCycles + 1,
    cycle: round.cycle + 1,
    turn: 0,
    awaitingVote: false,
    votes: {},
    verdict: null,
  }
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    // ---------- setup ----------
    case 'SET_LOCALE':
      if (state.phase !== 'setup') return state
      return { ...state, locale: action.locale }
    case 'ADD_NAME': {
      if (state.phase !== 'setup') return state
      const name = action.name.trim()
      if (!name || state.setupNames.length >= MAX_PLAYERS) return state
      if (state.setupNames.some((n) => n.toLowerCase() === name.toLowerCase())) return state
      return { ...state, setupNames: [...state.setupNames, name] }
    }
    case 'SET_PIN': {
      // Sets or replaces a player's re-check pin (4+ digits). The UI verifies the
      // current pin before allowing a change; the reducer only validates shape.
      const pin = action.pin.trim()
      if (!PIN_RE.test(pin)) return state
      if (state.phase === 'setup') {
        if (!state.setupNames.includes(action.name)) return state
        return { ...state, setupPins: { ...state.setupPins, [action.name]: pin } }
      }
      if (state.phase === 'scoreboard' && state.session) {
        if (!state.session.players.some((p) => p.name === action.name && !p.left)) return state
        return {
          ...state,
          session: {
            ...state.session,
            players: state.session.players.map((p) =>
              p.name === action.name ? { ...p, pin } : p,
            ),
          },
        }
      }
      return state
    }
    case 'REMOVE_NAME': {
      if (state.phase !== 'setup') return state
      const { [action.name]: _dropped, ...setupPins } = state.setupPins
      return { ...state, setupNames: state.setupNames.filter((n) => n !== action.name), setupPins }
    }
    case 'MOVE_NAME': {
      if (state.phase !== 'setup') return state
      const i = state.setupNames.indexOf(action.name)
      const j = i + action.dir
      if (i < 0 || j < 0 || j >= state.setupNames.length) return state
      const names = [...state.setupNames]
      ;[names[i], names[j]] = [names[j], names[i]]
      return { ...state, setupNames: names }
    }
    case 'SET_CHARLATAN_OVERRIDE':
      return { ...state, settings: { ...state.settings, charlatanOverride: action.value } }
    case 'SET_CLUES_PER_PLAYER':
      return {
        ...state,
        settings: { ...state.settings, cluesPerPlayer: Math.min(4, Math.max(1, action.value)) },
      }
    case 'SET_WHISPER_CARDS':
      if (state.session) return state // setup-only: never changed mid-session (§3.6)
      return {
        ...state,
        settings: { ...state.settings, whisperCardsPerPlayer: Math.min(5, Math.max(0, action.value)) },
      }
    case 'START_SESSION': {
      if (state.phase !== 'setup') return state
      const n = state.setupNames.length
      if (n < MIN_PLAYERS || n > MAX_PLAYERS) return state
      return {
        ...state,
        session: {
          players: state.setupNames.map((name) => ({
            name,
            score: 0,
            whisperCards: state.settings.whisperCardsPerPlayer,
            left: false,
            pin: state.setupPins[name] ?? null,
          })),
          roundsPlayed: 0,
          usedPairIndexes: [],
          history: [],
        },
        phase: 'scoreboard', // an empty scoreboard is the round lobby; Start round follows
      }
    }

    // ---------- assign (invisible) ----------
    case 'START_ROUND': {
      const session = state.session
      if (!session) return state
      const names = session.players.filter((p) => !p.left).map((p) => p.name)
      const real = action.orientation ? action.pair.a : action.pair.b
      const realDef = action.orientation ? action.pair.defA : action.pair.defB
      const decoy = action.orientation ? action.pair.b : action.pair.a
      const decoyDef = action.orientation ? action.pair.defB : action.pair.defA
      const players: RoundPlayer[] = names.map((name, seat) => ({
        name,
        role: action.charlatanSeats.includes(seat) ? 'charlatan' : 'civilian',
        eliminated: false,
        peeked: false,
      }))
      const round: RoundState = {
        number: session.roundsPlayed + 1,
        pair: {
          real,
          realDef,
          decoy,
          decoyDef,
          distractors: action.pair.distractors,
          distractorDefs: action.pair.distractorDefs,
        },
        players,
        speakerOrder: action.speakerOrder,
        cursor: 0,
        handoff: true,
        cycle: 1,
        requiredCycles: state.settings.cluesPerPlayer,
        turn: 0,
        awaitingVote: false,
        ledger: [],
        votes: {},
        ballots: [],
        consecutiveTies: 0,
        verdict: null,
        whisper: null,
        pendingGuesser: null,
        guess: null,
        outcome: null,
        resultAct: 1,
        recheck: null,
      }
      return {
        ...state,
        phase: 'reveal',
        round,
        session: { ...session, usedPairIndexes: [...session.usedPairIndexes, action.pairIndex] },
      }
    }

    // ---------- reveal ----------
    case 'HANDOFF_CONTINUE': {
      const round = state.round
      if (!round || !round.handoff) return state
      return withRound(state, { handoff: false })
    }
    case 'PEEK': {
      const round = state.round
      if (!round || state.phase !== 'reveal' || round.handoff) return state
      const seat = revealSeat(round)
      const players = round.players.map((p, i) => (i === seat ? { ...p, peeked: true } : p))
      return withRound(state, { players })
    }
    case 'BURN_WHISPER': {
      if (!canWhisper(state)) return state
      const round = state.round!
      // Targets are validated by reveal position: only players who reveal later.
      const targetPos = round.speakerOrder.indexOf(action.targetSeat)
      if (targetPos <= round.cursor) return state
      // First → second revealer would out the whisperer: the second revealer's
      // only prior revealer is the first, so a whisper there is a guaranteed
      // Charlatan reveal.
      if (round.cursor === 0 && targetPos === 1) return state
      const by = round.players[revealSeat(round)].name
      const target = round.players[action.targetSeat].name
      const session = state.session!
      return {
        ...withRound(state, {
          whisper: {
            by,
            target,
            fakeWord: action.fakeWord,
            fakeWordDef: action.fakeWordDef,
            swapped: action.swapped,
          },
        }),
        session: {
          ...session,
          players: session.players.map((p) =>
            p.name === by ? { ...p, whisperCards: p.whisperCards - 1 } : p,
          ),
        },
      }
    }
    case 'REVEAL_NEXT': {
      const round = state.round
      if (!round || state.phase !== 'reveal' || round.handoff) return state
      if (round.cursor + 1 < round.players.length) {
        return withRound(state, { cursor: round.cursor + 1, handoff: true })
      }
      return { ...withRound(state, { turn: 0 }), phase: 'clues' }
    }

    // ---------- clues ----------
    case 'SUBMIT_CLUE': {
      const round = state.round
      if (!round || state.phase !== 'clues' || round.awaitingVote) return state
      const word = action.word.trim()
      if (!word) return state
      if (isDuplicateClue(round, word)) return state
      const order = speakingOrder(round)
      const author = round.players[order[round.turn]].name
      const ledger = [...round.ledger, { author, word, cycle: round.cycle }]
      if (round.turn + 1 < order.length) {
        return withRound(state, { ledger, turn: round.turn + 1 })
      }
      // Cycle complete.
      if (round.cycle >= round.requiredCycles) {
        return withRound(state, { ledger, awaitingVote: true })
      }
      return withRound(state, { ledger, cycle: round.cycle + 1, turn: 0 })
    }
    /**
     * The round menu's escape hatch (§3.10): a round that went wrong — a misread
     * word, a player who saw the wrong screen — is abandoned from the clue screen,
     * the only screen where the phone is public. It is recorded in the history so
     * the numbering stays honest, but nobody scores.
     */
    case 'SKIP_ROUND': {
      const round = state.round
      const session = state.session
      if (!round || !session || state.phase !== 'clues') return state
      const skipped: RoundState = { ...round, outcome: { kind: 'skipped' } }
      return {
        ...state,
        phase: 'scoreboard',
        round: null,
        session: {
          ...session,
          roundsPlayed: session.roundsPlayed + 1,
          history: [...session.history, scoreRound(skipped)],
        },
      }
    }
    // ---------- word re-check (forgot-your-word, §S4c) ----------
    case 'OPEN_RECHECK': {
      const round = state.round
      if (!round || state.phase !== 'clues') return state
      const p = round.players[action.seat]
      if (!p || p.eliminated) return state
      return withRound(state, { recheck: action.seat })
    }
    case 'CLOSE_RECHECK': {
      const round = state.round
      if (!round || state.phase !== 'clues' || round.recheck === null) return state
      return withRound(state, { recheck: null })
    }

    case 'GO_TO_VOTE': {
      const round = state.round
      if (!round || state.phase !== 'clues' || !round.awaitingVote) return state
      return {
        ...withRound(state, { cursor: 0, handoff: true, votes: {}, recheck: null }),
        phase: 'vote',
      }
    }

    // ---------- vote ----------
    case 'CAST_VOTE': {
      const round = state.round
      if (!round || state.phase !== 'vote' || round.handoff) return state
      const seats = speakingOrder(round)
      const voter = round.players[seats[round.cursor]].name
      const validTarget = seats.some(
        (s) => round.players[s].name === action.target && round.players[s].name !== voter,
      )
      if (!validTarget) return state
      const votes = { ...round.votes, [voter]: action.target }
      if (round.cursor + 1 < seats.length) {
        return withRound(state, { votes, cursor: round.cursor + 1, handoff: true })
      }
      // All ballots in: resolve.
      const resolved = resolveBallot({ ...round, votes })
      return {
        ...withRound(state, {
          votes,
          verdict: resolved.verdict,
          ballots: [...round.ballots, resolved.ballot],
          consecutiveTies: resolved.ties,
        }),
        phase: 'verdict',
      }
    }

    // ---------- verdict ----------
    case 'VERDICT_CONTINUE': {
      const round = state.round
      if (!round || state.phase !== 'verdict' || !round.verdict) return state
      const verdict = round.verdict
      if (verdict.kind === 'tie') {
        return { ...withRound(state, backToClues(round)), phase: 'clues' }
      }
      if (verdict.kind === 'tie-limit') {
        return toResult(state, round, { kind: 'charlatans-ties' })
      }
      // Ejection: apply elimination, role already announced on the verdict screen.
      const players = round.players.map((p) =>
        p.name === verdict.ejected ? { ...p, eliminated: true } : p,
      )
      const updated: RoundState = { ...round, players }
      if (verdict.role === 'charlatan') {
        return {
          ...withRound(state, { players, pendingGuesser: verdict.ejected, verdict: null }),
          phase: 'guess',
        }
      }
      // Civilian ejected: parity check (§3.7 — civilians equal charlatans ends it).
      const active = activeSeats(updated).map((s) => updated.players[s])
      const civs = active.filter((p) => p.role === 'civilian').length
      const chars = active.filter((p) => p.role === 'charlatan').length
      if (civs === chars) {
        return toResult({ ...state, round: updated }, updated, { kind: 'charlatans-parity' })
      }
      return { ...withRound(state, { players, ...backToClues(updated) }), phase: 'clues' }
    }

    // ---------- guess (the steal) ----------
    case 'SUBMIT_GUESS': {
      const round = state.round
      if (!round || state.phase !== 'guess' || !round.pendingGuesser) return state
      const by = round.pendingGuesser
      const correct = guessMatches(action.text, round.pair.real)
      const guess = { by, text: action.text.trim(), correct }
      const updated: RoundState = { ...round, guess, pendingGuesser: null }
      if (correct) {
        return toResult({ ...state, round: updated }, updated, { kind: 'steal', by })
      }
      const hiddenCharlatans = activeSeats(updated)
        .map((s) => updated.players[s])
        .filter((p) => p.role === 'charlatan').length
      if (hiddenCharlatans === 0) {
        return toResult({ ...state, round: updated }, updated, { kind: 'civilians' })
      }
      return { ...withRound({ ...state, round: updated }, backToClues(updated)), phase: 'clues' }
    }

    // ---------- result (three acts) ----------
    case 'RESULT_ADVANCE': {
      const round = state.round
      if (!round || state.phase !== 'result') return state
      if (round.resultAct >= 3) return state
      return withRound(state, { resultAct: (round.resultAct + 1) as 2 | 3 })
    }
    case 'RESULT_BACK': {
      const round = state.round
      if (!round || state.phase !== 'result') return state
      if (round.resultAct <= 1) return state
      return withRound(state, { resultAct: (round.resultAct - 1) as 1 | 2 })
    }
    case 'FINISH_ROUND': {
      const round = state.round
      const session = state.session
      if (!round || !session || state.phase !== 'result' || !round.outcome) return state
      const summary = scoreRound(round)
      const players = session.players.map((p) => {
        const delta = summary.deltas[p.name]
        return delta ? { ...p, score: p.score + delta.total } : p
      })
      return {
        ...state,
        phase: 'scoreboard',
        round: null,
        session: {
          ...session,
          players,
          roundsPlayed: session.roundsPlayed + 1,
          history: [...session.history, summary],
        },
      }
    }

    // ---------- scoreboard / roster ----------
    case 'ROSTER_ADD': {
      const session = state.session
      if (!session || state.phase !== 'scoreboard') return state
      const name = action.name.trim()
      if (!name) return state
      const existing = session.players.find((p) => p.name.toLowerCase() === name.toLowerCase())
      const activeCount = session.players.filter((p) => !p.left).length
      if (activeCount >= MAX_PLAYERS) return state
      if (existing) {
        if (!existing.left) return state // duplicate active name
        // Same-name rejoin restores score and remaining Whisper cards (§2.1).
        return {
          ...state,
          session: {
            ...session,
            players: session.players.map((p) => (p === existing ? { ...p, left: false } : p)),
          },
        }
      }
      return {
        ...state,
        session: {
          ...session,
          players: [
            ...session.players,
            { name, score: 0, whisperCards: state.settings.whisperCardsPerPlayer, left: false, pin: null },
          ],
        },
      }
    }
    case 'ROSTER_REMOVE': {
      const session = state.session
      if (!session || state.phase !== 'scoreboard') return state
      return {
        ...state,
        session: {
          ...session,
          players: session.players.map((p) => (p.name === action.name ? { ...p, left: true } : p)),
        },
      }
    }
    // ---------- session summary (S10) ----------
    // "Einde sessie" lands on the summary first; only SLUIT AF there resets.
    case 'OPEN_SUMMARY': {
      const session = state.session
      if (!session || state.phase !== 'scoreboard') return state
      // Nothing to summarize before the first round: reset straight away.
      if (session.history.length === 0) return reducer(state, { type: 'END_SESSION' })
      return { ...state, phase: 'summary' }
    }
    case 'BACK_TO_SCOREBOARD': {
      if (state.phase !== 'summary') return state
      return { ...state, phase: 'scoreboard' }
    }
    case 'END_SESSION':
      return {
        ...initialState,
        locale: state.locale,
        settings: state.settings,
        setupNames: state.session ? state.session.players.filter((p) => !p.left).map((p) => p.name) : state.setupNames,
        setupPins: state.session
          ? Object.fromEntries(
              state.session.players.filter((p) => !p.left && p.pin).map((p) => [p.name, p.pin!]),
            )
          : state.setupPins,
      }

    case 'RESUME': {
      // Rehydration always re-enters via the handoff interstitial (§6.3 inv. 6).
      let s = action.state
      // Pre-pin saves lack the pin fields; default them so the shape is whole.
      s = { ...s, setupPins: s.setupPins ?? {} }
      if (s.session) {
        s = {
          ...s,
          session: {
            ...s.session,
            players: s.session.players.map((p) => ({ ...p, pin: p.pin ?? null })),
          },
        }
      }
      if (s.round) {
        // An open re-check never survives a reload — same privacy invariant as
        // the handoff gate (and the default for pre-recheck saves).
        s = { ...s, round: { ...s.round, recheck: null } }
      }
      if (s.round && !s.round.speakerOrder) {
        // Pre-shuffle saves carried a firstSpeaker rotation instead of a permutation.
        const first = (s.round as RoundState & { firstSpeaker?: number }).firstSpeaker ?? 0
        const n = s.round.players.length
        const speakerOrder = Array.from({ length: n }, (_, k) => (first + k) % n)
        s = { ...s, round: { ...s.round, speakerOrder } }
      }
      if (s.round && (s.phase === 'reveal' || s.phase === 'vote')) {
        return { ...s, round: { ...s.round, handoff: true } }
      }
      return s
    }

    default:
      return state
  }
}
