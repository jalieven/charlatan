import { useState } from 'react'
import type { Dispatch } from 'react'
import type { Action } from '../game/reducer'
import type { GameState } from '../game/types'
import { autoCharlatans, charlatanCount, maxCharlatans, MAX_PLAYERS, MIN_PLAYERS } from '../game/types'
import { useT } from '../i18n'
import { PinSheet } from '../ui/PinSheet'

function Stepper({
  value,
  onDown,
  onUp,
  testId,
}: {
  value: string
  onDown: () => void
  onUp: () => void
  testId: string
}) {
  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        data-testid={`${testId}.minus`}
        onClick={onDown}
        className="flex size-10 items-center justify-center rounded-lg border"
        style={{ borderColor: 'var(--color-g3)', color: 'var(--color-g5)' }}
      >
        −
      </button>
      <span className="min-w-14 text-center text-sm font-bold">{value}</span>
      <button
        type="button"
        data-testid={`${testId}.plus`}
        onClick={onUp}
        className="flex size-10 items-center justify-center rounded-lg border"
        style={{ borderColor: 'var(--color-g3)', color: 'var(--color-g5)' }}
      >
        +
      </button>
    </span>
  )
}

export function SetupScreen({ state, dispatch }: { state: GameState; dispatch: Dispatch<Action> }) {
  const t = useT()
  const [draft, setDraft] = useState('')
  const [pinFor, setPinFor] = useState<string | null>(null)
  const n = state.setupNames.length
  const effective = charlatanCount(Math.max(n, MIN_PLAYERS), state.settings.charlatanOverride)

  const add = () => {
    if (!draft.trim()) return
    dispatch({ type: 'ADD_NAME', name: draft })
    setDraft('')
  }

  return (
    <div className="relative flex h-full flex-col gap-3 overflow-y-auto">
      <div className="text-3xl font-bold tracking-tight">CHARLATAN</div>
      <div className="hairline" />
      <div className="eb">{t('setup.players', { count: n, max: MAX_PLAYERS })}</div>
      <div className="flex flex-col gap-2">
        {state.setupNames.map((name, i) => (
          <div className="row" key={name}>
            <span className="font-bold">{name}</span>
            <span className="flex items-center gap-1">
              {/* Every row carries the pin pill: set one on the keypad sheet, or —
                  filled — change it (current code first, verified in the sheet). */}
              <button
                type="button"
                className="eb rounded-full border px-2.5 py-1.5"
                data-testid={`setup.player.${name}.pin`}
                style={
                  state.setupPins[name]
                    ? { borderColor: 'var(--color-ink)', color: 'var(--color-ink)', fontWeight: 700 }
                    : { borderColor: 'var(--color-g3)', color: 'var(--color-g4)' }
                }
                onClick={() => setPinFor(name)}
              >
                {state.setupPins[name] ? t('setup.pinBadgeSet') : t('setup.pinBadge')}
              </button>
              <button
                type="button"
                data-testid={`setup.player.${name}.up`}
                className="flex size-10 items-center justify-center"
                style={{ color: 'var(--color-g4)', visibility: i === 0 ? 'hidden' : 'visible' }}
                onClick={() => dispatch({ type: 'MOVE_NAME', name, dir: -1 })}
              >
                ↑
              </button>
              <button
                type="button"
                data-testid={`setup.player.${name}.remove`}
                className="flex size-10 items-center justify-center"
                style={{ color: 'var(--color-g4)' }}
                onClick={() => dispatch({ type: 'REMOVE_NAME', name })}
              >
                ✕
              </button>
            </span>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            className="field quietfield"
            data-testid="setup.name-input"
            placeholder={t('setup.addPlayer')}
            value={draft}
            maxLength={16}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <button
            type="button"
            data-testid="setup.name-add"
            className="cta cta-quiet"
            style={{ width: 72 }}
            onClick={add}
          >
            +
          </button>
        </div>
      </div>
      <div className="hairline" />
      <div className="flex flex-col gap-2">
        <div className="row">
          <span className="eb2">{t('setup.charlatans')}</span>
          <Stepper
            testId="setup.charlatans"
            value={
              state.settings.charlatanOverride === null
                ? t('setup.auto', { n: n >= MIN_PLAYERS ? autoCharlatans(n) : 1 })
                : String(effective)
            }
            onDown={() =>
              dispatch({ type: 'SET_CHARLATAN_OVERRIDE', value: Math.max(1, effective - 1) })
            }
            onUp={() =>
              dispatch({
                type: 'SET_CHARLATAN_OVERRIDE',
                value: Math.min(maxCharlatans(Math.max(n, MIN_PLAYERS)), effective + 1),
              })
            }
          />
        </div>
        <div className="row">
          <span className="eb2">{t('setup.cluesPerPlayer')}</span>
          <Stepper
            testId="setup.clues"
            value={String(state.settings.cluesPerPlayer)}
            onDown={() =>
              dispatch({ type: 'SET_CLUES_PER_PLAYER', value: state.settings.cluesPerPlayer - 1 })
            }
            onUp={() =>
              dispatch({ type: 'SET_CLUES_PER_PLAYER', value: state.settings.cluesPerPlayer + 1 })
            }
          />
        </div>
        <div className="row">
          <span className="eb2">{t('setup.whisperCards')}</span>
          <Stepper
            testId="setup.whispers"
            value={String(state.settings.whisperCardsPerPlayer)}
            onDown={() =>
              dispatch({ type: 'SET_WHISPER_CARDS', value: state.settings.whisperCardsPerPlayer - 1 })
            }
            onUp={() =>
              dispatch({ type: 'SET_WHISPER_CARDS', value: state.settings.whisperCardsPerPlayer + 1 })
            }
          />
        </div>
        <div className="row">
          <span className="eb2">{t('setup.language')}</span>
          <span
            className="flex overflow-hidden rounded-lg border text-xs tracking-widest"
            style={{ borderColor: 'var(--color-g3)' }}
          >
            {(['nl', 'en'] as const).map((loc) => (
              <button
                key={loc}
                type="button"
                data-testid={`setup.locale.${loc}`}
                className="px-4 py-2.5 font-bold uppercase"
                style={
                  state.locale === loc
                    ? { background: 'var(--color-ink)', color: 'var(--color-paper)' }
                    : { color: 'var(--color-g4)' }
                }
                onClick={() => dispatch({ type: 'SET_LOCALE', locale: loc })}
              >
                {loc}
              </button>
            ))}
          </span>
        </div>
      </div>
      <div className="min-h-4 flex-1" />
      <button
        type="button"
        className="cta"
        data-testid="setup.start"
        disabled={n < MIN_PLAYERS}
        onClick={() => dispatch({ type: 'START_SESSION' })}
      >
        {t('setup.start')}
      </button>

      {pinFor && (
        <PinSheet
          name={pinFor}
          currentPin={state.setupPins[pinFor] ?? null}
          onSave={(pin) => {
            dispatch({ type: 'SET_PIN', name: pinFor, pin })
            setPinFor(null)
          }}
          onClose={() => setPinFor(null)}
        />
      )}
    </div>
  )
}

export function LaunchScreen({
  saved,
  onResume,
  onNewGame,
}: {
  saved: GameState
  onResume: () => void
  onNewGame: () => void
}) {
  const t = useT()
  const roundNumber = saved.round?.number ?? saved.session?.roundsPlayed ?? 1
  const playerCount = saved.session?.players.filter((p) => !p.left).length ?? 0
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="text-3xl font-bold tracking-tight">CHARLATAN</div>
      <div className="hairline" />
      <div className="flex flex-1 flex-col justify-center gap-4">
        <div className="eb2">{t('launch.unfinished')}</div>
        <div className="text-3xl leading-tight font-bold">{t('launch.round', { n: roundNumber })}</div>
        <div className="text-sm leading-relaxed" style={{ color: 'var(--color-g4)' }}>
          {t('launch.safe', { n: playerCount })}
        </div>
      </div>
      <button type="button" className="cta" data-testid="launch.resume" onClick={onResume}>
        {t('launch.resume')}
      </button>
      <button type="button" className="cta cta-quiet" data-testid="launch.new" onClick={onNewGame}>
        {t('launch.newGame')}
      </button>
    </div>
  )
}
