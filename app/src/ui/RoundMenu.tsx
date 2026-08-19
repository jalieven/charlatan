import { useState } from 'react'
import type { GameState } from '../game/types'
import { useT } from '../i18n'

/**
 * The clue screen is the only screen where the phone is public, so it is the only
 * one that can carry a settings affordance (§3.10). The gear opens a two-entry
 * popover: the session standings, and the escape hatch for a round gone wrong.
 */
const ICON = 'size-[15px] shrink-0'

function IconScore() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="6" y1="20" x2="6" y2="13" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="18" y1="20" x2="18" y2="9" />
    </svg>
  )
}

function IconSkip() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="5 4 15 12 5 20 5 4" />
      <line x1="19" y1="5" x2="19" y2="19" />
    </svg>
  )
}

function IconGear() {
  return (
    <svg className="size-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg className="size-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

/** Read-only standings raised over the round — never a way out of it. */
function ScoreSheet({ state, onClose }: { state: GameState; onClose: () => void }) {
  const t = useT()
  const session = state.session!
  const sorted = [...session.players].sort(
    (a, b) => Number(a.left) - Number(b.left) || b.score - a.score,
  )
  const outcomeLabel = (kind: string) =>
    kind === 'civilians'
      ? t('score.roundCivilians')
      : kind === 'steal'
        ? t('score.roundSteal')
        : kind === 'skipped'
          ? t('score.roundSkipped')
          : t('score.roundCharlatans')

  return (
    <>
      <div
        className="absolute inset-0 z-10"
        style={{ background: 'rgba(10,10,10,.66)' }}
        onClick={onClose}
      />
      <div
        className="absolute inset-x-0 bottom-0 z-20 flex max-h-[80%] flex-col gap-2 rounded-t-2xl border-t p-4"
        style={{ background: '#111111', borderColor: '#2e2e2e' }}
        data-testid="round-menu.sheet"
      >
        <div className="mx-auto h-[3px] w-9 rounded-full" style={{ background: 'var(--color-g3)' }} />
        <div className="flex items-start justify-between gap-2">
          <div className="eb">
            {t('score.title')}
            {session.roundsPlayed > 0 && ` · ${t('score.afterRound', { n: session.roundsPlayed })}`}
          </div>
          <button
            type="button"
            className="-mt-1 -mr-1 flex size-11 items-center justify-center"
            data-testid="round-menu.sheet-close"
            aria-label={t('roundMenu.close')}
            onClick={onClose}
          >
            <IconClose />
          </button>
        </div>
        <div className="flex flex-col overflow-y-auto">
          {sorted.map((p) => (
            <div
              key={p.name}
              className="flex items-center justify-between border-b py-2.5 text-sm"
              style={{
                borderColor: 'var(--color-g1)',
                color: p.left ? 'var(--color-g3)' : 'var(--color-ink)',
              }}
            >
              <span className="font-bold">{p.name}</span>
              <span className="font-bold">{p.score}</span>
            </div>
          ))}
        </div>
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
                  {s.number} · {outcomeLabel(s.outcome.kind)}
                </span>
              ))}
            </div>
          </>
        )}
        <button type="button" className="cta cta-quiet mt-1" onClick={onClose}>
          {t('roundMenu.close')}
        </button>
      </div>
    </>
  )
}

export function RoundMenu({ state, onSkip }: { state: GameState; onSkip: () => void }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [armed, setArmed] = useState(false)
  const [sheet, setSheet] = useState(false)

  const close = () => {
    setOpen(false)
    setArmed(false)
  }

  return (
    <>
      <button
        type="button"
        className="-mt-1.5 -mr-1.5 flex size-11 items-center justify-center"
        style={{ color: open ? 'var(--color-ink)' : 'var(--color-g4)' }}
        data-testid="round-menu.open"
        aria-label={t('roundMenu.label')}
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <IconGear />
      </button>

      {/* Nothing here is modal: the screen behind is not dimmed and the clue in
          progress — draft included — is untouched. A tap anywhere else closes. */}
      {open && !sheet && (
        <>
          <div className="absolute inset-0 z-10" onClick={close} data-testid="round-menu.catcher" />
          <div
            className="absolute top-12 right-4 z-20 w-44 overflow-hidden rounded-xl border"
            style={{ background: '#111111', borderColor: '#2e2e2e' }}
            data-testid="round-menu.popover"
          >
            <button
              type="button"
              className="flex min-h-11 w-full items-center gap-2.5 px-3 text-xs"
              data-testid="round-menu.score"
              onClick={() => {
                setArmed(false)
                setSheet(true)
              }}
            >
              <span style={{ color: 'var(--color-g5)' }}>
                <IconScore />
              </span>
              <span>{t('roundMenu.score')}</span>
            </button>
            {/* Skipping is irreversible and sits two taps from a player mid-clue,
                so the first tap only arms it (§3.10). */}
            <button
              type="button"
              className="flex min-h-11 w-full items-center gap-2.5 border-t px-3 text-xs"
              style={{
                borderColor: 'var(--color-g2)',
                background: armed ? 'var(--color-g1)' : 'transparent',
                fontWeight: armed ? 800 : 400,
              }}
              data-testid="round-menu.skip"
              onClick={() => {
                if (!armed) {
                  setArmed(true)
                  return
                }
                close()
                onSkip()
              }}
            >
              <span style={{ color: armed ? 'var(--color-ink)' : 'var(--color-g5)' }}>
                <IconSkip />
              </span>
              <span>{armed ? t('roundMenu.skipArmed') : t('roundMenu.skip')}</span>
            </button>
          </div>
        </>
      )}

      {sheet && (
        <ScoreSheet
          state={state}
          onClose={() => {
            setSheet(false)
            close()
          }}
        />
      )}
    </>
  )
}
