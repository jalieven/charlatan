import { describe, expect, it } from 'vitest'
import type { Action } from './reducer'
import { activeSeats, canWhisper, guessMatches, reducer, speakingOrder } from './reducer'
import { scoreRound } from './scoring'
import type { GameState } from './types'
import { charlatanCount, initialState, maxCharlatans } from './types'

const run = (state: GameState, actions: Action[]) => actions.reduce(reducer, state)

const NAMES6 = ['Jan', 'Sanne', 'Tom', 'Lotte', 'Eva', 'Bram']

function freshSession(names: string[] = NAMES6, whisperCards = 1): GameState {
  return run(initialState, [
    { type: 'SET_WHISPER_CARDS', value: whisperCards },
    ...names.map((name) => ({ type: 'ADD_NAME', name }) as Action),
    { type: 'START_SESSION' },
  ])
}

/** Deterministic round: Tom (seat 2) is the Charlatan, Jan (seat 0) speaks first. */
function startRound(state: GameState, charlatanSeats = [2], firstSpeaker = 0): GameState {
  return reducer(state, {
    type: 'START_ROUND',
    pairIndex: 0,
    orientation: true, // real = 'koffie', decoy = 'thee'
    charlatanSeats,
    firstSpeaker,
    pair: { a: 'koffie', b: 'thee', distractors: ['espresso', 'cacao'] },
  })
}

/** Walk every player through handoff + reveal. */
function revealAll(state: GameState): GameState {
  let s = state
  while (s.phase === 'reveal') {
    s = reducer(s, { type: 'HANDOFF_CONTINUE' })
    s = reducer(s, { type: 'REVEAL_NEXT' })
  }
  return s
}

/** Complete the required clue cycles with generated clues, then go to vote. */
function clueThrough(state: GameState): GameState {
  let s = state
  let i = 0
  while (s.phase === 'clues' && !s.round!.awaitingVote) {
    s = reducer(s, { type: 'SUBMIT_CLUE', word: `clue${i++}` })
  }
  return reducer(s, { type: 'GO_TO_VOTE' })
}

/** Cast every ballot; targets[name] picks the vote, default = first other active. */
function voteAll(state: GameState, targets: Record<string, string>): GameState {
  let s = state
  while (s.phase === 'vote') {
    s = reducer(s, { type: 'HANDOFF_CONTINUE' })
    const seats = activeSeats(s.round!)
    const voter = s.round!.players[seats[s.round!.cursor]].name
    const fallback = s.round!.players[seats.find((x) => s.round!.players[x].name !== voter)!].name
    s = reducer(s, { type: 'CAST_VOTE', target: targets[voter] ?? fallback })
  }
  return s
}

describe('charlatan scaling and clamp (§2.1)', () => {
  it('scales 1 for 3-7 and 2 for 8+', () => {
    expect(charlatanCount(3, null)).toBe(1)
    expect(charlatanCount(7, null)).toBe(1)
    expect(charlatanCount(8, null)).toBe(2)
    expect(charlatanCount(12, null)).toBe(2)
  })
  it('clamps the override to 1..floor(n/3)', () => {
    expect(maxCharlatans(3)).toBe(1)
    expect(maxCharlatans(4)).toBe(1)
    expect(charlatanCount(5, 3)).toBe(1)
    expect(charlatanCount(9, 3)).toBe(3)
    expect(charlatanCount(12, 9)).toBe(4)
    expect(charlatanCount(12, 0)).toBe(1)
  })
})

describe('setup', () => {
  it('rejects duplicate names case-insensitively', () => {
    const s = run(initialState, [
      { type: 'ADD_NAME', name: 'Jan' },
      { type: 'ADD_NAME', name: 'jan' },
    ])
    expect(s.setupNames).toEqual(['Jan'])
  })
  it('refuses to start under 3 players', () => {
    const s = run(initialState, [
      { type: 'ADD_NAME', name: 'A' },
      { type: 'ADD_NAME', name: 'B' },
      { type: 'START_SESSION' },
    ])
    expect(s.phase).toBe('setup')
  })

  it('starts a session with exactly 3 players', () => {
    const s = run(initialState, [
      { type: 'ADD_NAME', name: 'A' },
      { type: 'ADD_NAME', name: 'B' },
      { type: 'ADD_NAME', name: 'C' },
      { type: 'START_SESSION' },
    ])
    expect(s.phase).toBe('scoreboard')
    expect(s.session!.players).toHaveLength(3)
  })
})

describe('reveal flow (§3.3)', () => {
  it('walks every seat through handoff and locks peeks per seat', () => {
    let s = startRound(freshSession())
    expect(s.phase).toBe('reveal')
    expect(s.round!.handoff).toBe(true)
    s = reducer(s, { type: 'HANDOFF_CONTINUE' })
    s = reducer(s, { type: 'PEEK' })
    expect(s.round!.players[0].peeked).toBe(true)
    s = reducer(s, { type: 'REVEAL_NEXT' })
    expect(s.round!.cursor).toBe(1)
    expect(s.round!.handoff).toBe(true)
    s = revealAll(s)
    expect(s.phase).toBe('clues')
    expect(s.round!.players.filter((p) => p.peeked)).toHaveLength(1)
  })
})

describe('whisper (§3.6)', () => {
  function toTomReveal(state: GameState): GameState {
    let s = state
    for (let i = 0; i < 2; i++) {
      s = reducer(s, { type: 'HANDOFF_CONTINUE' })
      s = reducer(s, { type: 'REVEAL_NEXT' })
    }
    return reducer(s, { type: 'HANDOFF_CONTINUE' }) // Tom (seat 2) revealing
  }

  it('requires a peek, a personal card, and an unburned round whisper', () => {
    let s = toTomReveal(startRound(freshSession()))
    expect(canWhisper(s)).toBe(false) // not peeked yet
    s = reducer(s, { type: 'PEEK' })
    expect(canWhisper(s)).toBe(true)
    s = reducer(s, { type: 'BURN_WHISPER', targetSeat: 4, fakeWord: 'espresso', swapped: false })
    expect(s.round!.whisper).toEqual({ by: 'Tom', target: 'Eva', fakeWord: 'espresso', swapped: false })
    expect(s.session!.players.find((p) => p.name === 'Tom')!.whisperCards).toBe(0)
    expect(canWhisper(s)).toBe(false) // one per round, and Tom is out of cards
  })

  it('is unusable for the last revealer and never targets earlier seats', () => {
    let s = startRound(freshSession(), [5]) // Bram (last seat) is the Charlatan
    for (let i = 0; i < 5; i++) {
      s = reducer(s, { type: 'HANDOFF_CONTINUE' })
      s = reducer(s, { type: 'REVEAL_NEXT' })
    }
    s = reducer(s, { type: 'HANDOFF_CONTINUE' })
    s = reducer(s, { type: 'PEEK' })
    expect(canWhisper(s)).toBe(false)
    // Earlier-seat targeting is rejected outright.
    let s2 = toTomReveal(startRound(freshSession()))
    s2 = reducer(s2, { type: 'PEEK' })
    const before = s2
    s2 = reducer(s2, { type: 'BURN_WHISPER', targetSeat: 1, fakeWord: 'espresso', swapped: false })
    expect(s2).toBe(before)
  })

  it('civilians can never whisper', () => {
    let s = startRound(freshSession())
    s = reducer(s, { type: 'HANDOFF_CONTINUE' })
    s = reducer(s, { type: 'PEEK' }) // Jan, civilian
    expect(canWhisper(s)).toBe(false)
  })
})

describe('clues (§3.4, §3.5)', () => {
  it('runs stable speaking order from the random first speaker', () => {
    let s = revealAll(startRound(freshSession(), [2], 3)) // Lotte speaks first
    const order = speakingOrder(s.round!).map((i) => s.round!.players[i].name)
    expect(order).toEqual(['Lotte', 'Eva', 'Bram', 'Jan', 'Sanne', 'Tom'])
    s = reducer(s, { type: 'SUBMIT_CLUE', word: 'warm' })
    expect(s.round!.ledger[0]).toEqual({ author: 'Lotte', word: 'warm', cycle: 1 })
  })

  it('offers the vote only after the required cycles', () => {
    let s = revealAll(startRound(freshSession()))
    for (let i = 0; i < 11; i++) s = reducer(s, { type: 'SUBMIT_CLUE', word: `c${i}` })
    expect(s.round!.awaitingVote).toBe(false)
    s = reducer(s, { type: 'SUBMIT_CLUE', word: 'c11' })
    expect(s.round!.awaitingVote).toBe(true)
    expect(s.round!.ledger).toHaveLength(12)
  })
})

describe('verdict, eliminations, parity and ties (§3.7)', () => {
  it('civilians catch the charlatan → immediate guess, wrong guess ends it (last charlatan)', () => {
    let s = clueThrough(revealAll(startRound(freshSession())))
    s = voteAll(s, { Jan: 'Tom', Sanne: 'Tom', Lotte: 'Tom', Eva: 'Tom', Bram: 'Tom', Tom: 'Jan' })
    expect(s.phase).toBe('verdict')
    expect(s.round!.verdict).toMatchObject({ kind: 'ejection', ejected: 'Tom', role: 'charlatan' })
    s = reducer(s, { type: 'VERDICT_CONTINUE' })
    expect(s.phase).toBe('guess')
    s = reducer(s, { type: 'SUBMIT_GUESS', text: 'melk' })
    expect(s.phase).toBe('result')
    expect(s.round!.outcome).toEqual({ kind: 'civilians' })
  })

  it('ejecting a civilian continues play until parity ends the round', () => {
    // 4 players, 1 charlatan (Tom seat 2): first wrong ejection leaves 2v1 → continue.
    let s = clueThrough(revealAll(startRound(freshSession(['Jan', 'Sanne', 'Tom', 'Lotte']))))
    s = voteAll(s, { Jan: 'Sanne', Tom: 'Sanne', Lotte: 'Sanne', Sanne: 'Jan' })
    expect(s.round!.verdict).toMatchObject({ kind: 'ejection', ejected: 'Sanne', role: 'civilian' })
    s = reducer(s, { type: 'VERDICT_CONTINUE' })
    expect(s.phase).toBe('clues') // 2 civilians + 1 charlatan: no parity yet (the 4-player slack)
    expect(s.round!.requiredCycles).toBe(3)
    s = clueThrough(s)
    s = voteAll(s, { Jan: 'Lotte', Tom: 'Lotte', Lotte: 'Jan' })
    s = reducer(s, { type: 'VERDICT_CONTINUE' })
    expect(s.phase).toBe('result') // 1v1 parity
    expect(s.round!.outcome).toEqual({ kind: 'charlatans-parity' })
  })

  it('at 3 players any civilian ejection is instant parity — charlatans win on the first wrong vote', () => {
    // Jan + Sanne civilians, Tom (seat 2) the Charlatan.
    let s = clueThrough(revealAll(startRound(freshSession(['Jan', 'Sanne', 'Tom']))))
    s = voteAll(s, { Jan: 'Sanne', Tom: 'Sanne', Sanne: 'Tom' })
    expect(s.round!.verdict).toMatchObject({ kind: 'ejection', ejected: 'Sanne', role: 'civilian' })
    s = reducer(s, { type: 'VERDICT_CONTINUE' })
    expect(s.phase).toBe('result') // 1v1: no slack at the minimum table
    expect(s.round!.outcome).toEqual({ kind: 'charlatans-parity' })
  })

  it('three consecutive ties end the round for the charlatans; an ejection resets the ladder', () => {
    let s = clueThrough(revealAll(startRound(freshSession())))
    const tieVotes = { Jan: 'Tom', Sanne: 'Tom', Tom: 'Jan', Lotte: 'Jan', Eva: 'Bram', Bram: 'Eva' }
    s = voteAll(s, tieVotes)
    expect(s.round!.verdict).toMatchObject({ kind: 'tie', count: 1 })
    s = clueThrough(reducer(s, { type: 'VERDICT_CONTINUE' }))
    s = voteAll(s, tieVotes)
    expect(s.round!.verdict).toMatchObject({ kind: 'tie', count: 2 })
    s = clueThrough(reducer(s, { type: 'VERDICT_CONTINUE' }))
    s = voteAll(s, tieVotes)
    expect(s.round!.verdict).toMatchObject({ kind: 'tie-limit' })
    s = reducer(s, { type: 'VERDICT_CONTINUE' })
    expect(s.round!.outcome).toEqual({ kind: 'charlatans-ties' })
  })

  it('rejects self-votes and votes for eliminated players', () => {
    let s = clueThrough(revealAll(startRound(freshSession())))
    s = reducer(s, { type: 'HANDOFF_CONTINUE' })
    const before = s
    s = reducer(s, { type: 'CAST_VOTE', target: 'Jan' }) // Jan voting for himself
    expect(s).toBe(before)
  })
})

describe('the steal and scoring (§3.8, §3.9)', () => {
  it('guess matching is case/diacritic-insensitive with plural tolerance', () => {
    expect(guessMatches('Koffie', 'koffie')).toBe(true)
    expect(guessMatches('  KOFFIE ', 'koffie')).toBe(true)
    expect(guessMatches('koffies', 'koffie')).toBe(true)
    expect(guessMatches('boek', 'boeken')).toBe(true)
    expect(guessMatches('café', 'cafe')).toBe(true)
    expect(guessMatches('melk', 'koffie')).toBe(false)
    expect(guessMatches('', 'koffie')).toBe(false)
  })

  it('civilian win: +2 team (eliminated included), +1 correct vote, +1 no-peek', () => {
    let s = startRound(freshSession())
    // Sanne peeks; everyone else stays blind.
    s = reducer(s, { type: 'HANDOFF_CONTINUE' })
    s = reducer(s, { type: 'REVEAL_NEXT' })
    s = reducer(s, { type: 'HANDOFF_CONTINUE' })
    s = reducer(s, { type: 'PEEK' }) // Sanne (seat 1)
    s = revealAll(reducer(s, { type: 'REVEAL_NEXT' }))
    s = clueThrough(s)
    // Ballot 1: Bram (civilian) ejected; Jan+Tom+Lotte vote Bram, Eva votes Tom (correct but not ejecting).
    s = voteAll(s, { Jan: 'Bram', Tom: 'Bram', Lotte: 'Bram', Eva: 'Tom', Sanne: 'Bram', Bram: 'Jan' })
    s = clueThrough(reducer(s, { type: 'VERDICT_CONTINUE' }))
    // Ballot 2: Tom (charlatan) ejected; Jan, Lotte, Eva vote Tom; Sanne misses.
    s = voteAll(s, { Jan: 'Tom', Lotte: 'Tom', Eva: 'Tom', Sanne: 'Jan' })
    s = reducer(s, { type: 'VERDICT_CONTINUE' })
    s = reducer(s, { type: 'SUBMIT_GUESS', text: 'melk' })
    const deltas = scoreRound(s.round!).deltas
    expect(deltas['Jan']).toMatchObject({ win: 2, blind: 1, vote: 1, total: 4 })
    expect(deltas['Lotte']).toMatchObject({ win: 2, blind: 1, vote: 1, total: 4 })
    expect(deltas['Eva']).toMatchObject({ win: 2, blind: 1, vote: 1, total: 4 })
    expect(deltas['Sanne']).toMatchObject({ win: 2, blind: 0, vote: 0, total: 2 }) // peeked, missed
    expect(deltas['Bram']).toMatchObject({ win: 2, blind: 1, vote: 0, total: 3 }) // eliminated, no final vote
    expect(deltas['Tom']).toMatchObject({ total: 0 })
    // Applying the round moves the scores to the session.
    s = reducer(s, { type: 'FINISH_ROUND' })
    expect(s.phase).toBe('scoreboard')
    expect(s.session!.players.find((p) => p.name === 'Jan')!.score).toBe(4)
  })

  it('steal: +3 to guesser and peeked partner; a blind hidden partner keeps +8', () => {
    const names8 = [...NAMES6, 'Fien', 'Wout']
    let s = startRound(freshSession(names8), [2, 6]) // Tom + Fien are Charlatans
    // Tom peeks during his reveal; Fien stays blind.
    for (let i = 0; i < 2; i++) {
      s = reducer(s, { type: 'HANDOFF_CONTINUE' })
      s = reducer(s, { type: 'REVEAL_NEXT' })
    }
    s = reducer(s, { type: 'HANDOFF_CONTINUE' })
    s = reducer(s, { type: 'PEEK' }) // Tom
    s = revealAll(reducer(s, { type: 'REVEAL_NEXT' }))
    s = clueThrough(s)
    const everyone: Record<string, string> = {}
    for (const n of names8) everyone[n] = n === 'Tom' ? 'Jan' : 'Tom'
    s = voteAll(s, everyone)
    s = reducer(s, { type: 'VERDICT_CONTINUE' })
    expect(s.phase).toBe('guess')
    s = reducer(s, { type: 'SUBMIT_GUESS', text: 'koffie' })
    expect(s.round!.outcome).toEqual({ kind: 'steal', by: 'Tom' })
    const deltas = scoreRound(s.round!).deltas
    expect(deltas['Tom']).toMatchObject({ steal: 3, survive: 0, total: 3 })
    expect(deltas['Fien']).toMatchObject({ steal: 0, survive: 8, total: 8 }) // blind double survives the steal
    // The correct-vote bonus is unconditional on the outcome (§3.9): Jan did
    // catch a Charlatan on an ejecting ballot, steal or not.
    expect(deltas['Jan']).toMatchObject({ win: 0, vote: 1, total: 1 })
    expect(deltas['Sanne'].total).toBe(1) // also voted Tom; no win/no-peek points on a steal
  })

  it('a wrong guess with a hidden partner returns to clues', () => {
    const names8 = [...NAMES6, 'Fien', 'Wout']
    let s = clueThrough(revealAll(startRound(freshSession(names8), [2, 6])))
    const everyone: Record<string, string> = {}
    for (const n of names8) everyone[n] = n === 'Tom' ? 'Jan' : 'Tom'
    s = voteAll(s, everyone)
    s = reducer(s, { type: 'VERDICT_CONTINUE' })
    s = reducer(s, { type: 'SUBMIT_GUESS', text: 'melk' })
    expect(s.phase).toBe('clues')
    expect(activeSeats(s.round!)).toHaveLength(7)
    // Tie-limit now scores survival for the hidden partner only.
  })

  it('charlatans-ties outcome scores survival: +4 peeked, +8 blind', () => {
    let s = startRound(freshSession())
    s = reducer(s, { type: 'HANDOFF_CONTINUE' })
    s = reducer(s, { type: 'REVEAL_NEXT' })
    s = reducer(s, { type: 'HANDOFF_CONTINUE' })
    s = reducer(s, { type: 'REVEAL_NEXT' })
    s = reducer(s, { type: 'HANDOFF_CONTINUE' })
    s = reducer(s, { type: 'PEEK' }) // Tom peeks
    s = revealAll(reducer(s, { type: 'REVEAL_NEXT' }))
    s = clueThrough(s)
    const tieVotes = { Jan: 'Tom', Sanne: 'Tom', Tom: 'Jan', Lotte: 'Jan', Eva: 'Bram', Bram: 'Eva' }
    for (let i = 0; i < 3; i++) {
      s = voteAll(s, tieVotes)
      s = reducer(s, { type: 'VERDICT_CONTINUE' })
      if (s.phase === 'clues') s = clueThrough(s)
    }
    expect(s.round!.outcome).toEqual({ kind: 'charlatans-ties' })
    const deltas = scoreRound(s.round!).deltas
    expect(deltas['Tom']).toMatchObject({ survive: 4, total: 4 }) // peeked
    expect(deltas['Jan'].total).toBe(0) // no-peek reward only on civilian WINS
  })
})

describe('roster and session (§2.1, §4)', () => {
  it('leaver keeps a grayed row; same-name rejoin restores score and cards', () => {
    let s = freshSession()
    s = { ...s, session: { ...s.session!, players: s.session!.players.map((p) => (p.name === 'Bram' ? { ...p, score: 7, whisperCards: 0 } : p)) } }
    s = reducer(s, { type: 'ROSTER_REMOVE', name: 'Bram' })
    expect(s.session!.players.find((p) => p.name === 'Bram')!.left).toBe(true)
    s = reducer(s, { type: 'ROSTER_ADD', name: 'Bram' })
    const bram = s.session!.players.find((p) => p.name === 'Bram')!
    expect(bram.left).toBe(false)
    expect(bram.score).toBe(7)
    expect(bram.whisperCards).toBe(0) // restored, never a fresh allotment
  })

  it('a new joiner starts at 0 with the configured allotment', () => {
    let s = freshSession(NAMES6, 2)
    s = reducer(s, { type: 'ROSTER_ADD', name: 'Fien' })
    const fien = s.session!.players.find((p) => p.name === 'Fien')!
    expect(fien.score).toBe(0)
    expect(fien.whisperCards).toBe(2)
  })

  it('whisper allotment is setup-only: unchangeable once a session exists', () => {
    const s = reducer(freshSession(), { type: 'SET_WHISPER_CARDS', value: 5 })
    expect(s.settings.whisperCardsPerPlayer).toBe(1)
  })

  it('resume re-enters via the handoff interstitial', () => {
    let s = startRound(freshSession())
    s = reducer(s, { type: 'HANDOFF_CONTINUE' })
    expect(s.round!.handoff).toBe(false)
    const resumed = reducer(initialState, { type: 'RESUME', state: s })
    expect(resumed.round!.handoff).toBe(true)
  })

  it('draw pool avoids repeats within a session', () => {
    const s = startRound(freshSession())
    expect(s.session!.usedPairIndexes).toEqual([0])
  })
})
