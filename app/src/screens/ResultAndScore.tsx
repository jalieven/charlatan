import { useState } from 'react'
import type { Dispatch } from 'react'
import type { Action } from '../game/reducer'
import { tally } from '../game/reducer'
import { scoreRound } from '../game/scoring'
import { startRoundAction } from '../game/actions'
import type { GameState, RoundSummary, ScoreDelta } from '../game/types'
import { MAX_PLAYERS, MIN_PLAYERS } from '../game/types'
import { useT } from '../i18n'

function Dots({ act }: { act: 1 | 2 | 3 }) {
  return (
    <div className="flex justify-center gap-1.5">
      {[1, 2, 3].map((i) => (
        <i
          key={i}
          className="size-1.5 rounded-full"
          style={{ background: i === act ? 'var(--color-ink)' : 'var(--color-g3)' }}
        />
      ))}
    </div>
  )
}

/** ◆ markers exist ONLY here, in the replay — never in the live Ledger (§3.5). */
function suspicionMarks(summary: RoundSummary, base: number, author: string, cycle: number): string {
  const ballotIndex = cycle <= base ? 0 : cycle - base
  const ballot = summary.ballots[ballotIndex]
  if (!ballot) return ''
  const votes = tally(ballot.votes)[author] ?? 0
  return '◆'.repeat(Math.min(2, votes))
}

function outcomeTitle(summary: RoundSummary, t: (k: string, p?: Record<string, string | number>) => string) {
  switch (summary.outcome.kind) {
    case 'civilians':
      return t('result.civiliansWin')
    case 'steal':
      return t('result.steal')
    default:
      return t('result.charlatansWin')
  }
}

export function ResultScreen({ state, dispatch }: { state: GameState; dispatch: Dispatch<Action> }) {
  const t = useT()
  const round = state.round!
  const summary = scoreRound(round)
  const base = state.settings.cluesPerPlayer

  if (round.drillIn) {
    const lastBallot = summary.ballots[summary.ballots.length - 1]
    return (
      <div className="flex h-full flex-col gap-3">
        <button
          type="button"
          className="eb2 min-h-11 text-left"
          data-testid="result.drill-back"
          onClick={() => dispatch({ type: 'CLOSE_DRILL_IN' })}
        >
          {t('result.back')}
        </button>
        <div className="flex gap-2">
          <div
            className="flex-1 rounded-xl border px-2 py-4 text-center"
            style={{ borderColor: 'var(--color-g2)' }}
          >
            <div className="eb2">{t('result.real')}</div>
            <div className="mt-1 text-2xl font-bold break-all">{summary.pair.real.toUpperCase()}</div>
          </div>
          <div
            className="flex-1 rounded-xl border px-2 py-4 text-center"
            style={{ borderColor: 'var(--color-g2)' }}
          >
            <div className="eb2">{t('result.decoy')}</div>
            <div className="mt-1 text-2xl font-bold break-all">{summary.pair.decoy.toUpperCase()}</div>
          </div>
        </div>
        <div className="hairline" />
        <div className="flex-1 overflow-y-auto">
          {[...new Set(summary.ledger.map((c) => c.cycle))].map((cycle) => (
            <div key={cycle}>
              <div className="eb2 mt-3 mb-1">{t('result.replayCycle', { i: cycle })}</div>
              {summary.ledger
                .filter((c) => c.cycle === cycle)
                .map((c, i) => (
                  <div
                    key={i}
                    className="flex justify-between border-b py-2 text-sm"
                    style={{ borderColor: 'var(--color-g1)' }}
                  >
                    <span className="font-bold">{c.author}</span>
                    <span>
                      "{c.word}"{' '}
                      <span style={{ color: 'var(--color-g5)' }}>
                        {suspicionMarks(summary, base, c.author, c.cycle)}
                      </span>
                    </span>
                  </div>
                ))}
            </div>
          ))}
          {lastBallot && (
            <div className="eb mt-4">
              {t('result.finalBallot')} —{' '}
              {Object.entries(tally(lastBallot.votes))
                .sort((a, b) => b[1] - a[1])
                .map(([name, n]) => `${n}× ${name}`)
                .join(' · ')}
            </div>
          )}
        </div>
      </div>
    )
  }

  const charlatanNames = summary.charlatans.join(', ')

  return (
    <div
      className="flex h-full flex-col gap-3"
      data-testid="result.screen"
      onClick={() => dispatch({ type: 'RESULT_ADVANCE' })}
    >
      <div className="flex items-center justify-between">
        <div className="eb">{t('result.title', { n: summary.number })}</div>
        {round.resultAct > 1 && (
          <button
            type="button"
            className="eb2 min-h-11 px-2"
            data-testid="result.back"
            onClick={(e) => {
              e.stopPropagation()
              dispatch({ type: 'RESULT_BACK' })
            }}
          >
            ←
          </button>
        )}
      </div>

      {round.resultAct === 1 && (
        <div className="flex flex-1 flex-col justify-center gap-5">
          <div className="text-4xl leading-tight font-bold tracking-tight">
            {outcomeTitle(summary, t)}
          </div>
          {/* The app's single accent-color moment (§6.5). */}
          <div className="text-base" style={{ color: 'var(--color-g5)' }}>
            {(summary.charlatans.length > 1
              ? t('result.wereCharlatans')
              : t('result.wasCharlatan')
            )
              .split('{names}')
              .flatMap((part, i) =>
                i === 0
                  ? [<span key={`p${i}`}>{part}</span>]
                  : [
                      <span
                        key={`n${i}`}
                        className="font-bold"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        {charlatanNames.toUpperCase()}
                      </span>,
                      <span key={`p${i}`}>{part}</span>,
                    ],
              )}
          </div>
          <button
            type="button"
            className="cta cta-quiet"
            data-testid="result.drill-in"
            onClick={(e) => {
              e.stopPropagation()
              dispatch({ type: 'OPEN_DRILL_IN' })
            }}
          >
            {t('result.drillIn')}
          </button>
        </div>
      )}

      {round.resultAct === 2 && (
        <div className="flex flex-1 flex-col justify-center gap-5">
          <div className="eb2">{t('result.secrets')}</div>
          <div>
            <div className="eb2">{t('result.guessLabel')}</div>
            <div className="mt-1 text-xl font-bold">
              {summary.guess
                ? summary.guess.correct
                  ? t('result.guessHit', { text: summary.guess.text })
                  : t('result.guessMiss', { text: summary.guess.text })
                : t('result.noGuess')}
            </div>
          </div>
          <div className="hairline" />
          <div>
            <div className="eb2">{t('result.peekedLabel')}</div>
            <div className="mt-1 text-sm" style={{ color: 'var(--color-g5)' }}>
              {summary.peeked.length === 0
                ? t('result.nobodyPeeked')
                : summary.peeked.length === 1
                  ? t('result.peekedOne', { name: summary.peeked[0] })
                  : t('result.peekedList', { names: summary.peeked.join(', ') })}
            </div>
          </div>
          <div className="hairline" />
          <div>
            <div className="eb2">{t('result.whisperLabel')}</div>
            <div className="mt-1 text-sm" style={{ color: 'var(--color-g5)' }}>
              {summary.whisper
                ? t('result.whisperText', {
                    by: summary.whisper.by,
                    target: summary.whisper.target,
                    word: summary.whisper.fakeWord,
                  })
                : t('result.noWhisper')}
            </div>
          </div>
        </div>
      )}

      {round.resultAct === 3 && <DamageTable summary={summary} />}

      <div className="eb text-center">{t('result.tap')}</div>
      {round.resultAct === 3 && (
        <button
          type="button"
          className="cta"
          data-testid="result.finish"
          onClick={(e) => {
            e.stopPropagation()
            dispatch({ type: 'FINISH_ROUND' })
          }}
        >
          {t('result.toScoreboard')}
        </button>
      )}
      <Dots act={round.resultAct} />
    </div>
  )
}

/** Score matrix: players left, the round's subscores as columns, totals right. */
function DamageTable({ summary }: { summary: RoundSummary }) {
  const t = useT()
  const cols: { key: keyof ScoreDelta; label: string }[] = [
    { key: 'win', label: t('result.colWin') },
    { key: 'blind', label: t('result.colBlind') },
    { key: 'vote', label: t('result.colVote') },
    { key: 'survive', label: t('result.colSurvive') },
    { key: 'steal', label: t('result.colSteal') },
  ]
  const active = cols.filter((c) => Object.values(summary.deltas).some((d) => d[c.key] !== 0))
  const names = Object.keys(summary.deltas).sort(
    (a, b) => summary.deltas[b].total - summary.deltas[a].total,
  )
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="eb2 mb-2">{t('result.damage')}</div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="eb pb-2 text-left font-medium normal-case">{t('result.colPlayer')}</th>
            {active.map((c) => (
              <th key={c.key} className="eb pb-2 text-center font-medium">
                {c.label}
              </th>
            ))}
            <th
              className="eb border-l pb-2 text-center font-medium"
              style={{ borderColor: 'var(--color-g2)' }}
            >
              {t('result.colTotal')}
            </th>
          </tr>
        </thead>
        <tbody>
          {names.map((name) => {
            const d = summary.deltas[name]
            return (
              <tr key={name} className="border-t" style={{ borderColor: 'var(--color-g1)' }}>
                <td className="py-2.5 font-bold">{name}</td>
                {active.map((c) => (
                  <td
                    key={c.key}
                    className="py-2.5 text-center"
                    style={{ color: d[c.key] === 0 ? 'var(--color-g3)' : 'var(--color-ink)' }}
                  >
                    {d[c.key] === 0 ? '—' : `+${d[c.key]}`}
                  </td>
                ))}
                <td
                  className="border-l py-2.5 text-center font-bold"
                  style={{
                    borderColor: 'var(--color-g2)',
                    color: d.total === 0 ? 'var(--color-g3)' : 'var(--color-ink)',
                  }}
                >
                  {d.total === 0 ? '0' : `+${d.total}`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ---------- S9 · Scoreboard ----------
export function ScoreboardScreen({
  state,
  dispatch,
}: {
  state: GameState
  dispatch: Dispatch<Action>
}) {
  const t = useT()
  const session = state.session!
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const activeCount = session.players.filter((p) => !p.left).length
  const sorted = [...session.players].sort((a, b) => Number(a.left) - Number(b.left) || b.score - a.score)

  const outcomeLabel = (s: (typeof session.history)[number]) =>
    s.outcome.kind === 'civilians'
      ? t('score.roundCivilians')
      : s.outcome.kind === 'steal'
        ? t('score.roundSteal')
        : t('score.roundCharlatans')

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="eb">
        {t('score.title')}
        {session.roundsPlayed > 0 && ` · ${t('score.afterRound', { n: session.roundsPlayed })}`}
      </div>
      <div className="flex flex-col overflow-y-auto">
        {sorted.map((p) => (
          <div
            key={p.name}
            className="flex items-center justify-between border-b py-3"
            style={{
              borderColor: 'var(--color-g1)',
              color: p.left ? 'var(--color-g3)' : 'var(--color-ink)',
            }}
          >
            <span className="font-bold">{p.name}</span>
            <span className="flex items-center gap-3">
              {p.left && <span className="eb" style={{ color: 'var(--color-g3)' }}>{t('score.left')}</span>}
              {editing && !p.left && (
                <button
                  type="button"
                  data-testid={`score.remove.${p.name}`}
                  className="flex size-10 items-center justify-center"
                  style={{ color: 'var(--color-g4)' }}
                  onClick={() => dispatch({ type: 'ROSTER_REMOVE', name: p.name })}
                >
                  ✕
                </button>
              )}
              {editing && p.left && (
                <button
                  type="button"
                  data-testid={`score.rejoin.${p.name}`}
                  className="flex size-10 items-center justify-center"
                  style={{ color: 'var(--color-g4)' }}
                  onClick={() => dispatch({ type: 'ROSTER_ADD', name: p.name })}
                >
                  ↩
                </button>
              )}
              <span className="text-lg font-bold">{p.score}</span>
            </span>
          </div>
        ))}
      </div>

      {editing && (
        <div className="flex gap-2">
          <input
            className="field quietfield"
            data-testid="score.name-input"
            placeholder={t('setup.addPlayer')}
            value={draft}
            maxLength={16}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button
            type="button"
            data-testid="score.name-add"
            className="cta cta-quiet"
            style={{ width: 72 }}
            onClick={() => {
              if (draft.trim()) dispatch({ type: 'ROSTER_ADD', name: draft })
              setDraft('')
            }}
          >
            +
          </button>
        </div>
      )}

      {session.history.length > 0 && (
        <>
          <div className="eb2">{t('score.rounds')}</div>
          <div className="flex flex-wrap gap-1.5">
            {session.history.map((s) => (
              <span
                key={s.number}
                className="rounded-full border px-3 py-1.5 text-xs"
                style={{ borderColor: 'var(--color-g2)', color: 'var(--color-g4)' }}
              >
                {s.number} · {outcomeLabel(s)}
              </span>
            ))}
          </div>
        </>
      )}

      <div className="min-h-2 flex-1" />
      <button
        type="button"
        className="cta"
        data-testid="score.next-round"
        disabled={activeCount < MIN_PLAYERS || activeCount > MAX_PLAYERS}
        onClick={() => {
          const action = startRoundAction(state)
          if (action) dispatch(action)
        }}
      >
        {t('score.next')}
      </button>
      <div className="flex gap-2">
        <button
          type="button"
          className="cta cta-quiet"
          data-testid="score.edit"
          onClick={() => setEditing(!editing)}
        >
          {editing ? t('score.done') : t('score.editPlayers')}
        </button>
        <button
          type="button"
          className="cta cta-quiet"
          data-testid="score.end-session"
          onClick={() => dispatch({ type: 'END_SESSION' })}
        >
          {t('score.endSession')}
        </button>
      </div>
    </div>
  )
}
