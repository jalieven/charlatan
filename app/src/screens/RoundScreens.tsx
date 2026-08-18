import { useState } from 'react'
import type { Dispatch } from 'react'
import type { Action } from '../game/reducer'
import { canWhisper, definitionFor, speakingOrder, tally, wordFor } from '../game/reducer'
import { burnWhisperAction } from '../game/actions'
import type { GameState, RoundState } from '../game/types'
import { useT } from '../i18n'
import { HoldCover, RoleHold, SlideToContinue } from '../ui/gestures'

function TieStakes({ round }: { round: RoundState }) {
  const t = useT()
  if (round.consecutiveTies < 2) return null
  return <div className="invert">{t('clues.tieStakes')}</div>
}

function TallyList({ counts }: { counts: Record<string, number> }) {
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1])
  return (
    <div className="flex flex-col text-sm">
      {rows.map(([name, n]) => (
        <div
          key={name}
          className="flex justify-between border-b py-2"
          style={{ borderColor: 'var(--color-g1)' }}
        >
          <span className="font-bold">{name}</span>
          <span style={{ color: 'var(--color-g4)' }}>{n}×</span>
        </div>
      ))}
    </div>
  )
}

export function Ledger({ round, compact }: { round: RoundState; compact?: boolean }) {
  const t = useT()
  const cycles = [...new Set(round.ledger.map((c) => c.cycle))]
  return (
    <div className={compact ? 'max-h-40 overflow-y-auto' : 'flex-1 overflow-y-auto'}>
      {cycles.map((cycle) => (
        <div key={cycle}>
          <div className="eb2 mt-3 mb-1">
            {t('clues.ledger')} · {t('result.replayCycle', { i: cycle })}
          </div>
          {round.ledger
            .filter((c) => c.cycle === cycle)
            .map((c, i) => (
              <div
                key={i}
                className="flex justify-between border-b py-2 text-sm"
                style={{ borderColor: 'var(--color-g1)' }}
              >
                <span className="font-bold">{c.author}</span>
                <span>"{c.word}"</span>
              </div>
            ))}
        </div>
      ))}
    </div>
  )
}

// ---------- S2 · Handoff ----------
export function HandoffScreen({ state, dispatch }: { state: GameState; dispatch: Dispatch<Action> }) {
  const t = useT()
  const round = state.round!
  const voting = state.phase === 'vote'
  // Both phases walk the round's shuffled order; voting skips eliminated players.
  const seats = voting ? speakingOrder(round) : round.speakerOrder
  const name = round.players[seats[round.cursor]].name
  const progress = t('handoff.progress', { i: round.cursor + 1, n: seats.length })
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="eb">{voting ? `${t('handoff.vote')} · ${progress}` : progress}</div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <div className="eb2">{t('handoff.passTo')}</div>
        <div className="text-5xl font-bold tracking-tight break-all">{name.toUpperCase()}</div>
      </div>
      <SlideToContinue
        label={t('handoff.slide')}
        testId="handoff.slide"
        onConfirm={() => dispatch({ type: 'HANDOFF_CONTINUE' })}
      />
    </div>
  )
}

// ---------- S3 · Reveal ----------
export function RevealScreen({ state, dispatch }: { state: GameState; dispatch: Dispatch<Action> }) {
  const t = useT()
  const round = state.round!
  const seat = round.speakerOrder[round.cursor]
  const player = round.players[seat]
  const word = wordFor(round, seat)
  const whispered = round.whisper && round.whisper.target === player.name
  const whisperAvailable = canWhisper(state)
  const cards =
    state.session?.players.find((p) => p.name === player.name)?.whisperCards ?? 0

  // Word + its one-line definition, styled identically for real and fake words
  // so neither the decoy nor a whispered distractor stands out.
  const wordBlock = (w: string, def?: string) => (
    <div className="flex flex-col items-center gap-1.5">
      <div className="text-[40px] leading-none font-bold tracking-tight break-all">
        {w.toUpperCase()}
      </div>
      {def && (
        <div
          className={`max-w-[30ch] leading-relaxed ${whispered ? 'text-xs' : 'text-[13px]'}`}
          style={{ color: 'var(--color-g5)' }}
        >
          {def}
        </div>
      )}
    </div>
  )

  return (
    <div className="flex h-full flex-col gap-3">
      <div>
        <div className="eb">{t('handoff.progress', { i: round.cursor + 1, n: round.players.length })}</div>
        <div className="text-xl font-bold">{player.name.toUpperCase()}</div>
      </div>

      <HoldCover
        testId="reveal.cover"
        coverLabel={t('reveal.holdWord')}
        coverSub={t('reveal.holdWordSub')}
      >
        {/* Thumb economics (§3.3): the words sit LOW, right above the role button,
            away from the finger holding the cover open near the top. */}
        <div className="flex flex-1 flex-col items-center justify-end gap-4 pb-5 text-center">
          {whispered ? (
            <>
              {round.whisper!.swapped ? (
                <>
                  {wordBlock(round.whisper!.fakeWord, round.whisper!.fakeWordDef)}
                  {wordBlock(word, definitionFor(round, seat))}
                </>
              ) : (
                <>
                  {wordBlock(word, definitionFor(round, seat))}
                  {wordBlock(round.whisper!.fakeWord, round.whisper!.fakeWordDef)}
                </>
              )}
              <div
                className="rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--color-g3)' }}
              >
                <b>{t('reveal.psst')}</b> {t('reveal.psstText')}
              </div>
            </>
          ) : (
            wordBlock(word, definitionFor(round, seat))
          )}
        </div>
      </HoldCover>

      <RoleHold
        testId="reveal.role-button"
        label={t('reveal.roleButton')}
        heldLabel={t('reveal.roleHeld')}
        targetEnabled={whisperAvailable}
        onOpen={() => dispatch({ type: 'PEEK' })}
        onCommit={() => {
          const action = burnWhisperAction(state)
          if (action) dispatch(action)
        }}
        renderCard={(targetRef, hovering) => (
          <div
            className="flex flex-col gap-2 rounded-2xl border p-4"
            style={{ borderColor: 'var(--color-g3)', background: '#111111' }}
          >
            <div className="eb2">{t('reveal.yourRole')}</div>
            <div className="text-3xl font-bold tracking-tight">
              {player.role === 'charlatan' ? t('reveal.roleCharlatan') : t('reveal.roleCivilian')}
            </div>
            <div className="text-xs leading-relaxed" style={{ color: 'var(--color-g4)' }}>
              {player.role === 'charlatan'
                ? t('reveal.peekCostCharlatan')
                : t('reveal.peekCostCivilian')}
              {' · '}
              {t('reveal.closeHint')}
            </div>
            {/* Same-position release target for BOTH roles (§3.3 choreography parity):
                for an eligible Charlatan it commits the Whisper; otherwise it just closes. */}
            <div
              ref={targetRef}
              data-testid="reveal.whisper-target"
              className="eb2 rounded-xl border border-dashed px-3 py-4 text-center"
              style={{
                borderColor: hovering && whisperAvailable ? 'var(--color-ink)' : 'var(--color-g3)',
                color: hovering && whisperAvailable ? 'var(--color-ink)' : 'var(--color-g5)',
              }}
            >
              {whisperAvailable ? (
                <>
                  {t('reveal.whisperZone')}
                  <br />
                  <b>{t('reveal.whisperName')}</b> · {t('reveal.whisperCards', { n: cards })}
                </>
              ) : (
                t('reveal.closeHint')
              )}
            </div>
          </div>
        )}
      />

      <SlideToContinue
        label={t('reveal.slideNext')}
        testId="reveal.slide-next"
        onConfirm={() => dispatch({ type: 'REVEAL_NEXT' })}
      />
    </div>
  )
}

// ---------- S4 · Clue entry + Ledger ----------
export function CluesScreen({ state, dispatch }: { state: GameState; dispatch: Dispatch<Action> }) {
  const t = useT()
  const round = state.round!
  const [draft, setDraft] = useState('')
  const order = speakingOrder(round)
  const speakerSeat = round.turn < order.length ? order[round.turn] : null
  const speaker = speakerSeat !== null ? round.players[speakerSeat] : null
  const base = state.settings.cluesPerPlayer

  const warnings: string[] = []
  const clean = draft.trim()
  if (clean.includes(' ')) warnings.push(t('clues.warnMultiword'))
  if (
    speaker &&
    clean &&
    clean.toLowerCase() === wordFor(round, speakerSeat!).toLowerCase()
  )
    warnings.push(t('clues.warnOwnWord'))
  if (clean && round.ledger.some((c) => c.word.toLowerCase() === clean.toLowerCase()))
    warnings.push(t('clues.warnDuplicate'))

  // The round's full shuffled order, eliminated players struck through (§3.4).
  const seatOrder = round.speakerOrder

  return (
    <div className="flex h-full flex-col gap-3">
      <TieStakes round={round} />
      <div className="eb">
        {round.cycle <= base
          ? t('clues.cycle', { i: round.cycle, n: round.requiredCycles })
          : t('clues.cycleExtra', { i: round.cycle })}
      </div>
      {!round.awaitingVote && speaker && (
        <div className="text-2xl font-bold">
          {t('clues.yourClue', { name: speaker.name.toUpperCase() })}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {seatOrder.map((seatIdx) => {
          const p = round.players[seatIdx]
          const orderIdx = order.indexOf(seatIdx)
          const status = p.eliminated
            ? 'out'
            : orderIdx < round.turn
              ? 'done'
              : orderIdx === round.turn && !round.awaitingVote
                ? 'now'
                : 'up'
          return (
            <span
              key={p.name}
              className="rounded-full border px-3 py-1.5 text-xs"
              style={{
                borderColor: status === 'now' ? 'var(--color-ink)' : 'var(--color-g2)',
                background: status === 'now' ? 'var(--color-ink)' : 'transparent',
                color:
                  status === 'now'
                    ? 'var(--color-paper)'
                    : status === 'out'
                      ? 'var(--color-g3)'
                      : status === 'done'
                        ? 'var(--color-g4)'
                        : 'var(--color-g5)',
                textDecoration: status === 'out' ? 'line-through' : 'none',
                fontWeight: status === 'now' ? 700 : 400,
              }}
            >
              {p.name}
              {status === 'done' ? ' ✓' : ''}
            </span>
          )
        })}
      </div>

      {round.awaitingVote ? (
        <button
          type="button"
          className="cta"
          data-testid="clues.go-vote"
          onClick={() => dispatch({ type: 'GO_TO_VOTE' })}
        >
          {t('clues.goVote')}
        </button>
      ) : (
        <>
          <input
            className="field"
            data-testid="clues.input"
            placeholder={t('clues.placeholder')}
            value={draft}
            maxLength={24}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && clean) {
                dispatch({ type: 'SUBMIT_CLUE', word: clean })
                setDraft('')
              }
            }}
          />
          {warnings.length > 0 && (
            <div className="text-xs" style={{ color: 'var(--color-g4)' }}>
              {warnings.join(' · ')}
            </div>
          )}
          <button
            type="button"
            className="cta"
            data-testid="clues.confirm"
            disabled={!clean}
            onClick={() => {
              dispatch({ type: 'SUBMIT_CLUE', word: clean })
              setDraft('')
            }}
          >
            {t('clues.confirm')}
          </button>
        </>
      )}
      <div className="hairline" />
      <Ledger round={round} />
    </div>
  )
}

// ---------- S5 · Vote ballot ----------
export function BallotScreen({ state, dispatch }: { state: GameState; dispatch: Dispatch<Action> }) {
  const t = useT()
  const round = state.round!
  const seats = speakingOrder(round)
  const voter = round.players[seats[round.cursor]]
  const [choice, setChoice] = useState<string | null>(null)
  const candidates = seats
    .map((s) => round.players[s])
    .filter((p) => p.name !== voter.name)

  return (
    <div className="flex h-full flex-col gap-3">
      <TieStakes round={round} />
      <div className="eb">
        {t('handoff.vote')} · {t('handoff.progress', { i: round.cursor + 1, n: seats.length })}
      </div>
      <div className="text-2xl leading-tight font-bold">
        {t('vote.question', { name: voter.name.toUpperCase() })}
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto">
        {candidates.map((p) => (
          <button
            key={p.name}
            type="button"
            data-testid={`vote.candidate.${p.name}`}
            className="row w-full text-left"
            style={{ borderColor: choice === p.name ? 'var(--color-ink)' : 'var(--color-g2)' }}
            onClick={() => setChoice(p.name)}
          >
            <span className="font-bold">{p.name}</span>
            <span
              className="size-4 rounded-full border"
              style={
                choice === p.name
                  ? {
                      borderColor: 'var(--color-ink)',
                      background: 'var(--color-ink)',
                      boxShadow: 'inset 0 0 0 3px var(--color-paper)',
                    }
                  : { borderColor: 'var(--color-g3)' }
              }
            />
          </button>
        ))}
      </div>
      <details>
        <summary className="eb" style={{ listStyle: 'none' }}>
          {t('clues.ledger')} ↓
        </summary>
        <Ledger round={round} compact />
      </details>
      <div className="min-h-2 flex-1" />
      <button
        type="button"
        className="cta"
        data-testid="vote.confirm"
        disabled={!choice}
        onClick={() => {
          if (choice) dispatch({ type: 'CAST_VOTE', target: choice })
          setChoice(null)
        }}
      >
        {t('vote.confirm')}
      </button>
    </div>
  )
}

// ---------- S6 · Verdict ----------
export function VerdictScreen({ state, dispatch }: { state: GameState; dispatch: Dispatch<Action> }) {
  const t = useT()
  const round = state.round!
  const verdict = round.verdict!

  let body
  if (verdict.kind === 'tie') {
    body = (
      <>
        <div className="text-3xl font-bold">{t('verdict.tie', { n: verdict.count })}</div>
        {verdict.count >= 2 && <div className="invert">{t('clues.tieStakes')}</div>}
        <div className="text-sm" style={{ color: 'var(--color-g4)' }}>
          {t('verdict.tieNote')}
        </div>
      </>
    )
  } else if (verdict.kind === 'tie-limit') {
    body = <div className="invert text-base">{t('verdict.tieLimit')}</div>
  } else {
    const civs = round.players.filter(
      (p) => p.role === 'civilian' && !p.eliminated && p.name !== verdict.ejected,
    ).length
    const chars = round.players.filter(
      (p) => p.role === 'charlatan' && !p.eliminated && p.name !== verdict.ejected,
    ).length
    body = (
      <>
        <div className="text-3xl leading-tight font-bold">
          {t('verdict.ejected', { name: verdict.ejected.toUpperCase() })}
        </div>
        <div className="text-base" style={{ color: 'var(--color-g5)' }}>
          {verdict.role === 'charlatan'
            ? t('verdict.wasCharlatan', { name: verdict.ejected })
            : t('verdict.wasCivilian', { name: verdict.ejected })}
        </div>
        {verdict.role === 'civilian' && civs > chars && (
          <div className="text-sm" style={{ color: 'var(--color-g4)' }}>
            {t('verdict.parityNote', { c: civs, k: chars })}
          </div>
        )}
      </>
    )
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="eb">{t('verdict.title')}</div>
      <TallyList counts={verdict.tally} />
      <div className="flex flex-1 flex-col justify-center gap-4">{body}</div>
      <button
        type="button"
        className="cta"
        data-testid="verdict.continue"
        onClick={() => dispatch({ type: 'VERDICT_CONTINUE' })}
      >
        {t('verdict.continue')}
      </button>
    </div>
  )
}

// ---------- S7 · The steal ----------
export function GuessScreen({ state, dispatch }: { state: GameState; dispatch: Dispatch<Action> }) {
  const t = useT()
  const round = state.round!
  const [draft, setDraft] = useState('')
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="eb">{t('result.guessLabel')}</div>
      <div className="flex flex-1 flex-col justify-center gap-4">
        <div className="text-3xl leading-tight font-bold">
          {t('guess.caught', { name: round.pendingGuesser!.toUpperCase() })}
        </div>
        <div className="text-sm leading-relaxed" style={{ color: 'var(--color-g5)' }}>
          {t('guess.explain')}
        </div>
        <input
          className="field"
          data-testid="guess.input"
          placeholder={t('guess.placeholder')}
          value={draft}
          maxLength={32}
          onChange={(e) => setDraft(e.target.value)}
        />
      </div>
      <button
        type="button"
        className="cta"
        data-testid="guess.submit"
        disabled={!draft.trim()}
        onClick={() => dispatch({ type: 'SUBMIT_GUESS', text: draft })}
      >
        {t('guess.submit')}
      </button>
      <div className="eb text-center">{t('guess.note')}</div>
    </div>
  )
}

export { tally }
