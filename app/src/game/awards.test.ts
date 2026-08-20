import { describe, expect, it } from 'vitest'
import { sessionAwards, sessionCounts } from './awards'
import type { RoundOutcome, RoundSummary, SessionPlayer } from './types'

const player = (name: string): SessionPlayer => ({
  name,
  score: 0,
  whisperCards: 1,
  left: false,
  pin: null,
})

/** Minimal summary: only the fields the awards actually read carry meaning. */
function round(over: {
  outcome: RoundOutcome
  participants: string[]
  charlatans?: string[]
  peeked?: string[]
  votes?: Record<string, string>
  survive?: Record<string, number>
  whisperBy?: string
}): RoundSummary {
  const deltas = Object.fromEntries(
    over.participants.map((n) => [
      n,
      { win: 0, blind: 0, vote: 0, survive: over.survive?.[n] ?? 0, steal: 0, total: 0 },
    ]),
  )
  return {
    number: 1,
    outcome: over.outcome,
    pair: { real: 'koffie', decoy: 'thee' },
    charlatans: over.charlatans ?? [],
    peeked: over.peeked ?? [],
    whisper: over.whisperBy
      ? { by: over.whisperBy, target: 'x', fakeWord: 'espresso' }
      : null,
    guess: null,
    ledger: [],
    ballots: over.votes ? [{ votes: over.votes, outcome: 'ejection', ejected: 'Tom' }] : [],
    deltas,
  }
}

const PLAYERS = ['Jan', 'Eva', 'Tom'].map(player)

describe('session awards (S10, §3.11)', () => {
  it('mines every superlative from the history', () => {
    const history = [
      round({
        outcome: { kind: 'civilians' },
        participants: ['Jan', 'Eva', 'Tom'],
        charlatans: ['Tom'],
        peeked: ['Eva', 'Tom'], // Jan blind
        votes: { Jan: 'Tom', Eva: 'Jan', Tom: 'Jan' },
      }),
      round({
        outcome: { kind: 'charlatans-parity' },
        participants: ['Jan', 'Eva', 'Tom'],
        charlatans: ['Eva'],
        peeked: ['Tom'],
        votes: { Jan: 'Eva', Eva: 'Tom', Tom: 'Jan' },
        survive: { Eva: 8 },
        whisperBy: 'Eva',
      }),
      round({
        outcome: { kind: 'steal', by: 'Tom' },
        participants: ['Jan', 'Eva', 'Tom'],
        charlatans: ['Tom'],
        peeked: ['Eva', 'Tom'],
        votes: { Jan: 'Tom', Eva: 'Tom', Tom: 'Jan' },
      }),
    ]
    const byKey = Object.fromEntries(sessionAwards(PLAYERS, history).map((a) => [a.key, a]))
    // Jan stayed blind 3/3 rounds.
    expect(byKey.blindganger).toMatchObject({ winners: ['Jan'], evidence: { pct: 100 } })
    // Jan named a Charlatan with all 3 votes; Eva 1/3, Tom 0/3.
    expect(byKey.speurneus).toMatchObject({ winners: ['Jan'], evidence: { hits: 3, total: 3 } })
    // Jan drew 4 votes against, Tom 4 as well — a shared line.
    expect(byKey.zondebok.winners.sort()).toEqual(['Jan', 'Tom'])
    expect(byKey.zondebok.evidence).toEqual({ n: 4 })
    expect(byKey.meesterCharlatan).toMatchObject({ winners: ['Eva'], evidence: { n: 8 } })
    expect(byKey.dief).toMatchObject({ winners: ['Tom'], evidence: { n: 1 } })
    expect(byKey.fluisteraar).toMatchObject({ winners: ['Eva'], evidence: { n: 1 } })
  })

  it('hides an award whose winning value would be zero', () => {
    const history = [
      round({
        outcome: { kind: 'civilians' },
        participants: ['Jan', 'Eva', 'Tom'],
        charlatans: ['Tom'],
        peeked: ['Jan', 'Eva', 'Tom'], // nobody blind
        votes: { Jan: 'Tom', Eva: 'Tom', Tom: 'Jan' },
      }),
    ]
    const keys = sessionAwards(PLAYERS, history).map((a) => a.key)
    expect(keys).not.toContain('blindganger')
    expect(keys).not.toContain('meesterCharlatan')
    expect(keys).not.toContain('dief')
    expect(keys).not.toContain('fluisteraar')
    expect(keys).toContain('speurneus')
    expect(keys).toContain('zondebok')
  })

  it('excludes skipped rounds from every count and ratio', () => {
    const history = [
      round({
        outcome: { kind: 'civilians' },
        participants: ['Jan', 'Eva', 'Tom'],
        charlatans: ['Tom'],
        peeked: ['Jan'], // Jan peeked in the only PLAYED round
        votes: { Jan: 'Tom', Eva: 'Tom', Tom: 'Jan' },
      }),
      round({
        outcome: { kind: 'skipped' },
        participants: ['Jan', 'Eva', 'Tom'],
        charlatans: ['Eva'],
        peeked: ['Eva', 'Tom'], // must not count: the round is void
        votes: { Jan: 'Eva', Eva: 'Jan', Tom: 'Jan' },
        whisperBy: 'Eva',
      }),
    ]
    const byKey = Object.fromEntries(sessionAwards(PLAYERS, history).map((a) => [a.key, a]))
    // Eva and Tom are 100% blind over played rounds; the skipped peeks don't hurt them.
    expect(byKey.blindganger.winners.sort()).toEqual(['Eva', 'Tom'])
    // The skipped round's ballot and whisper never count.
    expect(byKey.zondebok).toMatchObject({ winners: ['Tom'], evidence: { n: 2 } })
    expect(byKey.fluisteraar).toBeUndefined()
  })

  it('counts the session pills, ties included, skipped ballots excluded', () => {
    const tieBallot = { votes: { Jan: 'Eva', Eva: 'Jan' }, outcome: 'tie' as const }
    const base = round({
      outcome: { kind: 'civilians' },
      participants: ['Jan', 'Eva', 'Tom'],
      votes: { Jan: 'Tom', Eva: 'Tom' },
    })
    const history: RoundSummary[] = [
      { ...base, ballots: [tieBallot, ...base.ballots] },
      round({ outcome: { kind: 'charlatans-ties' }, participants: ['Jan', 'Eva', 'Tom'] }),
      round({ outcome: { kind: 'steal', by: 'Tom' }, participants: ['Jan', 'Eva', 'Tom'] }),
      { ...round({ outcome: { kind: 'skipped' }, participants: ['Jan', 'Eva', 'Tom'] }), ballots: [tieBallot] },
    ]
    expect(sessionCounts(history)).toEqual({
      civilians: 1,
      charlatans: 1,
      steal: 1,
      skipped: 1,
      ties: 1,
    })
  })
})
