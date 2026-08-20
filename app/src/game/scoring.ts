import type { InfoLevel, RoundState, RoundSummary, ScoreDelta } from './types'
import { infoLevel } from './types'

const zero = (): ScoreDelta => ({ win: 0, blind: 0, vote: 0, survive: 0, steal: 0, total: 0 })

// Requirements §3.9 — the self-handicap ladder (informed / blind / deaf / stone):
// - civilians win: +2 each (eliminated included); +1 correct-vote bonus per
//   ejecting ballot whose target was a Charlatan; handicap bonus ONLY on wins
// - charlatan survives via parity: 4/8/8/16; via the tie limit: one step lower
// - steal: guesser AND every hidden Charlatan score the steal ladder at their
//   own level; the guesser never doubles (they were caught)
const CIVILIAN_BONUS: Record<InfoLevel, number> = { informed: 0, blind: 1, deaf: 2, stone: 4 }
const SURVIVE_PARITY: Record<InfoLevel, number> = { informed: 4, blind: 8, deaf: 8, stone: 16 }
const SURVIVE_TIES: Record<InfoLevel, number> = { informed: 2, blind: 4, deaf: 4, stone: 8 }
const STEAL: Record<InfoLevel, number> = { informed: 2, blind: 3, deaf: 3, stone: 4 }

export function scoreRound(round: RoundState): RoundSummary {
  const outcome = round.outcome!
  const deltas: Record<string, ScoreDelta> = {}
  for (const p of round.players) deltas[p.name] = zero()

  const charlatans = round.players.filter((p) => p.role === 'charlatan')
  const civilians = round.players.filter((p) => p.role === 'civilian')

  // Correct-vote bonuses accrue on every ejecting ballot that hit a Charlatan,
  // regardless of the round's final outcome direction — but only civilians earn them.
  for (const ballot of round.ballots) {
    if (ballot.outcome !== 'ejection' || !ballot.ejected) continue
    const ejectedRole = round.players.find((p) => p.name === ballot.ejected)?.role
    if (ejectedRole !== 'charlatan') continue
    for (const [voter, target] of Object.entries(ballot.votes)) {
      if (target !== ballot.ejected) continue
      const voterRole = round.players.find((p) => p.name === voter)?.role
      if (voterRole === 'civilian') deltas[voter].vote += 1
    }
  }

  if (outcome.kind === 'civilians') {
    for (const p of civilians) {
      deltas[p.name].win = 2
      deltas[p.name].blind = CIVILIAN_BONUS[infoLevel(p)]
    }
  } else if (outcome.kind === 'charlatans-parity' || outcome.kind === 'charlatans-ties') {
    const ladder = outcome.kind === 'charlatans-parity' ? SURVIVE_PARITY : SURVIVE_TIES
    for (const p of charlatans) {
      if (!p.eliminated) deltas[p.name].survive = ladder[infoLevel(p)]
    }
  } else if (outcome.kind === 'steal') {
    for (const p of charlatans) {
      // The guesser and every still-hidden partner ride the steal ladder alike;
      // an earlier-ejected non-guesser gets nothing.
      if (p.name === outcome.by || !p.eliminated) deltas[p.name].steal = STEAL[infoLevel(p)]
    }
  }

  for (const d of Object.values(deltas)) {
    d.total = d.win + d.blind + d.vote + d.survive + d.steal
  }

  return {
    number: round.number,
    outcome,
    pair: { real: round.pair.real, decoy: round.pair.decoy },
    charlatans: charlatans.map((p) => p.name),
    peeked: round.players.filter((p) => p.peeked).map((p) => p.name),
    levels: Object.fromEntries(round.players.map((p) => [p.name, infoLevel(p)])),
    whisper: round.whisper
      ? { by: round.whisper.by, target: round.whisper.target, fakeWord: round.whisper.fakeWord }
      : null,
    guess: round.guess,
    ledger: round.ledger,
    ballots: round.ballots,
    deltas,
  }
}
