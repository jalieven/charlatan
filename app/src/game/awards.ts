import type { RoundSummary, SessionPlayer } from './types'

/**
 * Session awards (S10, requirements §3.11): six superlatives mined from the
 * round history. Everything is computed from what RoundSummary already records;
 * skipped rounds are excluded from every ratio and count. An award only exists
 * when its winning value is real (> 0); ties share the line.
 */
export type AwardKey =
  | 'blindganger'
  | 'speurneus'
  | 'zondebok'
  | 'meesterCharlatan'
  | 'dief'
  | 'fluisteraar'

export interface Award {
  key: AwardKey
  /** Every player on the winning value, in session roster order. */
  winners: string[]
  /** Numbers for the evidence line's i18n template. */
  evidence: Record<string, number>
}

/** All players on the maximum of `value`, roster order; null when the max isn't positive. */
function top(
  names: string[],
  value: (name: string) => number,
): { winners: string[]; max: number } | null {
  let max = 0
  for (const n of names) max = Math.max(max, value(n))
  if (max <= 0) return null
  return { winners: names.filter((n) => value(n) === max), max }
}

export function sessionAwards(players: SessionPlayer[], history: RoundSummary[]): Award[] {
  const rounds = history.filter((r) => r.outcome.kind !== 'skipped')
  const names = players.map((p) => p.name)
  const awards: Award[] = []

  // Per-player tallies over the played (non-skipped) rounds.
  const played: Record<string, number> = {}
  const blind: Record<string, number> = {}
  const votesCast: Record<string, number> = {}
  const votesOnTarget: Record<string, number> = {}
  const votesAgainst: Record<string, number> = {}
  const survivePoints: Record<string, number> = {}
  const steals: Record<string, number> = {}
  const whispers: Record<string, number> = {}
  for (const n of names) {
    played[n] = blind[n] = votesCast[n] = votesOnTarget[n] = votesAgainst[n] = 0
    survivePoints[n] = steals[n] = whispers[n] = 0
  }
  const know = (n: string) => n in played

  for (const r of rounds) {
    const charlatans = new Set(r.charlatans)
    const peeked = new Set(r.peeked)
    for (const n of Object.keys(r.deltas)) {
      if (!know(n)) continue
      played[n] += 1
      if (!peeked.has(n)) blind[n] += 1
      survivePoints[n] += r.deltas[n].survive
    }
    for (const ballot of r.ballots) {
      for (const [voter, target] of Object.entries(ballot.votes)) {
        if (know(voter)) {
          votesCast[voter] += 1
          if (charlatans.has(target)) votesOnTarget[voter] += 1
        }
        if (know(target)) votesAgainst[target] += 1
      }
    }
    if (r.outcome.kind === 'steal' && know(r.outcome.by)) steals[r.outcome.by] += 1
    if (r.whisper && know(r.whisper.by)) whispers[r.whisper.by] += 1
  }

  // De Blindganger: highest share of played rounds without a peek.
  const blindTop = top(names, (n) => (played[n] > 0 ? blind[n] / played[n] : 0))
  if (blindTop) {
    awards.push({
      key: 'blindganger',
      winners: blindTop.winners,
      evidence: { pct: Math.round(blindTop.max * 100) },
    })
  }

  // De Speurneus: highest hit rate on cast votes (a vote that named a Charlatan).
  const aimTop = top(names, (n) => (votesCast[n] > 0 ? votesOnTarget[n] / votesCast[n] : 0))
  if (aimTop) {
    const first = aimTop.winners[0]
    awards.push({
      key: 'speurneus',
      winners: aimTop.winners,
      evidence: { hits: votesOnTarget[first], total: votesCast[first] },
    })
  }

  const simple: [AwardKey, Record<string, number>][] = [
    ['zondebok', votesAgainst],
    ['meesterCharlatan', survivePoints],
    ['dief', steals],
    ['fluisteraar', whispers],
  ]
  for (const [key, tally] of simple) {
    const t = top(names, (n) => tally[n])
    if (t) awards.push({ key, winners: t.winners, evidence: { n: t.max } })
  }

  return awards
}

/** Outcome counts for the session pills; ties counts every tied ballot. */
export function sessionCounts(history: RoundSummary[]) {
  const counts = { civilians: 0, charlatans: 0, steal: 0, skipped: 0, ties: 0 }
  for (const r of history) {
    if (r.outcome.kind === 'civilians') counts.civilians += 1
    else if (r.outcome.kind === 'steal') counts.steal += 1
    else if (r.outcome.kind === 'skipped') counts.skipped += 1
    else counts.charlatans += 1
    if (r.outcome.kind !== 'skipped')
      counts.ties += r.ballots.filter((b) => b.outcome === 'tie').length
  }
  return counts
}
