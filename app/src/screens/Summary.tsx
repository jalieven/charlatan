import type { Dispatch } from 'react'
import type { Action } from '../game/reducer'
import { sessionAwards, sessionCounts } from '../game/awards'
import type { GameState } from '../game/types'
import { useT } from '../i18n'

/**
 * S10 · Session summary (§3.11): the session's parting shot. "Einde sessie"
 * lands here first — final standings and the session awards, on one scrolling
 * screen. Only SLUIT AF actually resets to setup (names and PINs prefilled);
 * the quiet escape returns to the scoreboard, so ending is not a one-way door.
 */
export function SummaryScreen({ state, dispatch }: { state: GameState; dispatch: Dispatch<Action> }) {
  const t = useT()
  const session = state.session!
  // Leavers sink to the bottom, grayed — same order rule as the scoreboard.
  const sorted = [...session.players].sort(
    (a, b) => Number(a.left) - Number(b.left) || b.score - a.score,
  )
  const topScore = sorted[0].score
  const winners = sorted.filter((p) => !p.left && p.score === topScore)
  const rest = sorted.filter((p) => !winners.includes(p))
  const counts = sessionCounts(session.history)
  const awards = sessionAwards(session.players, session.history)

  const pills: [string, number][] = [
    [t('summary.pillCivilians', { n: counts.civilians }), counts.civilians],
    [t('summary.pillCharlatans', { n: counts.charlatans }), counts.charlatans],
    [t('summary.pillSteals', { n: counts.steal }), counts.steal],
    [t('summary.pillSkipped', { n: counts.skipped }), counts.skipped],
    [t('summary.pillTies', { n: counts.ties }), counts.ties],
  ]

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="eb">
        {t('summary.title')} ·{' '}
        {session.roundsPlayed === 1
          ? t('summary.roundsOne')
          : t('summary.rounds', { n: session.roundsPlayed })}
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto" data-testid="summary.screen">
        {/* The winner gets the inverted block — the loudest monochrome statement. */}
        <div className="loud" style={{ padding: '18px 12px' }}>
          <div className="text-[9px] tracking-[0.16em] uppercase opacity-55">
            {t('summary.winner')}
          </div>
          <div className="mt-0.5 text-[26px] leading-tight font-bold tracking-tight normal-case">
            {winners.map((p) => p.name.toUpperCase()).join(' & ')}
          </div>
          <div className="mt-0.5 text-[11px]">{t('summary.points', { n: topScore })}</div>
        </div>

        <div className="flex flex-col">
          {rest.map((p) => (
            <div
              key={p.name}
              className="flex items-center justify-between border-b py-2.5 text-sm"
              style={{
                borderColor: 'var(--color-g1)',
                color: p.left ? 'var(--color-g3)' : 'var(--color-ink)',
              }}
            >
              <span className="font-bold">
                <span
                  className="mr-2 font-normal"
                  style={{ color: p.left ? 'var(--color-g3)' : 'var(--color-g4)' }}
                >
                  {sorted.indexOf(p) + 1}
                </span>
                {p.name}
              </span>
              <span className="font-bold">{p.score}</span>
            </div>
          ))}
        </div>

        <div className="eb2">{t('summary.session')}</div>
        <div className="flex flex-wrap gap-1.5">
          {pills
            .filter(([, n]) => n > 0)
            .map(([label]) => (
              <span
                key={label}
                className="rounded-full border px-3 py-1.5 text-xs"
                style={{ borderColor: 'var(--color-g2)', color: 'var(--color-g4)' }}
              >
                {label}
              </span>
            ))}
        </div>

        {awards.length > 0 && (
          <>
            <div className="eb2">{t('summary.awards')}</div>
            <div className="flex flex-col" data-testid="summary.awards">
              {awards.map((a) => (
                <div
                  key={a.key}
                  className="flex items-center justify-between gap-2.5 border-b py-2.5"
                  style={{ borderColor: 'var(--color-g1)' }}
                >
                  <span>
                    <div className="eb2">{t(`awards.${a.key}.title`)}</div>
                    <div className="text-sm font-bold">{a.winners.join(' & ')}</div>
                  </span>
                  <span className="text-right text-xs" style={{ color: 'var(--color-g4)' }}>
                    {t(`awards.${a.key}.evidence`, a.evidence)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* SLUIT AF is the destructive step: reset to setup, names and PINs prefilled. */}
      <button
        type="button"
        className="cta"
        data-testid="summary.close"
        onClick={() => dispatch({ type: 'END_SESSION' })}
      >
        {t('summary.close')}
      </button>
      <button
        type="button"
        className="cta cta-quiet"
        data-testid="summary.back"
        onClick={() => dispatch({ type: 'BACK_TO_SCOREBOARD' })}
      >
        {t('summary.back')}
      </button>
    </div>
  )
}
