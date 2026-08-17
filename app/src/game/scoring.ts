import type { RoundState, RoundSummary, ScoreDelta } from './types'

const zero = (): ScoreDelta => ({ win: 0, blind: 0, vote: 0, survive: 0, steal: 0, total: 0 })

// Requirements §3.9:
// - civilians win: +2 each (eliminated included); +1 correct-vote bonus per
//   ejecting ballot whose target was a Charlatan; +1 no-peek reward ONLY on wins
// - charlatan survives (parity / tie limit): +4 peeked, +8 blind
// - steal: +3 to guesser and peeked hidden Charlatans; a blind hidden
//   Charlatan keeps +8; the guesser never doubles (they were caught)
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
      if (!p.peeked) deltas[p.name].blind = 1
    }
  } else if (outcome.kind === 'charlatans-parity' || outcome.kind === 'charlatans-ties') {
    for (const p of charlatans) {
      if (!p.eliminated) deltas[p.name].survive = p.peeked ? 4 : 8
    }
  } else if (outcome.kind === 'steal') {
    for (const p of charlatans) {
      if (p.name === outcome.by) {
        deltas[p.name].steal = 3
      } else if (!p.eliminated) {
        // Hidden partner: +3 if peeked; the blind double survives a teammate's steal.
        if (p.peeked) deltas[p.name].steal = 3
        else deltas[p.name].survive = 8
      }
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
    whisper: round.whisper
      ? { by: round.whisper.by, target: round.whisper.target, fakeWord: round.whisper.fakeWord }
      : null,
    guess: round.guess,
    ledger: round.ledger,
    ballots: round.ballots,
    deltas,
  }
}
