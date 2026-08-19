import { useEffect, useReducer, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { reducer } from './game/reducer'
import { initialState } from './game/types'
import type { GameState } from './game/types'
import { clearState, hasResumableGame, loadState, saveState } from './game/persistence'
import { LocaleContext } from './i18n'
import { LaunchScreen, SetupScreen } from './screens/SetupAndLaunch'
import {
  BallotScreen,
  CluesScreen,
  GuessScreen,
  HandoffScreen,
  RecheckScreen,
  RevealScreen,
  VerdictScreen,
} from './screens/RoundScreens'
import { ResultScreen, ScoreboardScreen } from './screens/ResultAndScore'
import { Recorder, recorderEnabled } from './recorder/Recorder'

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [saved] = useState<GameState | null>(() => loadState())
  const [booted, setBooted] = useState(() => !hasResumableGame(loadState()))
  const bootedRef = useRef(booted)
  bootedRef.current = booted

  // Persist the full state on every transition (§4 resume) — but never before
  // the resume-or-new choice, so an unclicked launch can't clobber the save.
  useEffect(() => {
    if (bootedRef.current) saveState(state)
  }, [state])

  // Animate only on real screen changes: phase, handoff flips, and whose turn
  // the phone-passing phases are on — never per clue keystroke or result act.
  const passing = state.phase === 'reveal' || state.phase === 'vote'
  const phaseKey =
    state.phase +
    (state.round?.handoff ? '.h' : '') +
    (passing && state.round ? `.${state.round.cursor}` : '') +
    (state.phase === 'clues' && state.round?.recheck != null ? `.r${state.round.recheck}` : '')

  let screen
  if (!booted && saved) {
    screen = (
      <LaunchScreen
        saved={saved}
        onResume={() => {
          dispatch({ type: 'RESUME', state: saved })
          setBooted(true)
        }}
        onNewGame={() => {
          clearState()
          setBooted(true)
        }}
      />
    )
  } else {
    switch (state.phase) {
      case 'setup':
        screen = <SetupScreen state={state} dispatch={dispatch} />
        break
      case 'reveal':
        screen = state.round!.handoff ? (
          <HandoffScreen state={state} dispatch={dispatch} />
        ) : (
          <RevealScreen state={state} dispatch={dispatch} />
        )
        break
      case 'clues':
        screen = state.round!.recheck != null ? (
          <RecheckScreen state={state} dispatch={dispatch} />
        ) : (
          <CluesScreen state={state} dispatch={dispatch} />
        )
        break
      case 'vote':
        screen = state.round!.handoff ? (
          <HandoffScreen state={state} dispatch={dispatch} />
        ) : (
          <BallotScreen state={state} dispatch={dispatch} />
        )
        break
      case 'verdict':
        screen = <VerdictScreen state={state} dispatch={dispatch} />
        break
      case 'guess':
        screen = <GuessScreen state={state} dispatch={dispatch} />
        break
      case 'result':
        screen = <ResultScreen state={state} dispatch={dispatch} />
        break
      case 'scoreboard':
        screen = <ScoreboardScreen state={state} dispatch={dispatch} />
        break
    }
  }

  return (
    <LocaleContext.Provider value={state.locale}>
      <div
        className="mx-auto h-full max-w-md px-5 pt-6 pb-5"
        style={{
          paddingTop: 'max(24px, env(safe-area-inset-top))',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={phaseKey}
            className="h-full"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {screen}
          </motion.div>
        </AnimatePresence>
      </div>
      {recorderEnabled() && <Recorder phase={state.phase} />}
    </LocaleContext.Provider>
  )
}
