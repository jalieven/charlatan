import type { GameState } from './types'

const KEY = 'charlatan.v1'

export function saveState(state: GameState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Storage full or unavailable: the game continues, resume just won't work.
  }
}

export function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as GameState
  } catch {
    return null
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

/** An unfinished game worth offering to resume (§4): anything past setup. */
export function hasResumableGame(state: GameState | null): state is GameState {
  return state !== null && state.phase !== 'setup' && state.session !== null
}
