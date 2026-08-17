import { useEffect, useRef, useState } from 'react'
import type { Phase } from '../game/types'

declare const __RECORDER_DEFAULT__: boolean

// Dev-only interaction recorder. Captures every interaction against the
// data-testid convention plus phase transitions, so a real click-through can
// be exported as JSON and translated into a Playwright replay spec.
export function recorderEnabled(): boolean {
  try {
    if (new URLSearchParams(location.search).get('recorder') === '1') return true
  } catch {
    /* ignore */
  }
  return typeof __RECORDER_DEFAULT__ !== 'undefined' && __RECORDER_DEFAULT__
}

interface RecEvent {
  t: number
  type: 'press' | 'input' | 'phase'
  testId?: string
  holdMs?: number
  from?: { x: number; y: number }
  to?: { x: number; y: number }
  value?: string
  phase?: string
}

export function Recorder({ phase }: { phase: Phase }) {
  const events = useRef<RecEvent[]>([])
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const start = useRef(Date.now())

  useEffect(() => {
    events.current.push({ t: Date.now() - start.current, type: 'phase', phase })
    setCount(events.current.length)
  }, [phase])

  useEffect(() => {
    const downs = new Map<number, { testId: string; t: number; x: number; y: number }>()

    const testIdOf = (target: EventTarget | null): string | null => {
      if (!(target instanceof Element)) return null
      if (target.closest('[data-recorder]')) return null // ignore the recorder's own UI
      return target.closest('[data-testid]')?.getAttribute('data-testid') ?? null
    }

    const onDown = (e: PointerEvent) => {
      const testId = testIdOf(e.target)
      if (!testId) return
      downs.set(e.pointerId, { testId, t: Date.now(), x: e.clientX, y: e.clientY })
    }
    const onUp = (e: PointerEvent) => {
      const down = downs.get(e.pointerId)
      if (!down) return
      downs.delete(e.pointerId)
      events.current.push({
        t: down.t - start.current,
        type: 'press',
        testId: down.testId,
        holdMs: Date.now() - down.t,
        from: { x: Math.round(down.x), y: Math.round(down.y) },
        to: { x: Math.round(e.clientX), y: Math.round(e.clientY) },
      })
      setCount(events.current.length)
    }
    const onInput = (e: Event) => {
      const testId = testIdOf(e.target)
      if (!testId || !(e.target instanceof HTMLInputElement)) return
      const last = events.current[events.current.length - 1]
      if (last && last.type === 'input' && last.testId === testId) {
        last.value = e.target.value
        last.t = Date.now() - start.current
      } else {
        events.current.push({
          t: Date.now() - start.current,
          type: 'input',
          testId,
          value: e.target.value,
        })
      }
      setCount(events.current.length)
    }

    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('pointerup', onUp, true)
    document.addEventListener('input', onInput, true)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('pointerup', onUp, true)
      document.removeEventListener('input', onInput, true)
    }
  }, [])

  const exportJson = async () => {
    const payload = JSON.stringify(
      { recordedAt: new Date().toISOString(), userAgent: navigator.userAgent, events: events.current },
      null,
      2,
    )
    try {
      await navigator.clipboard.writeText(payload)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked: show the JSON for manual copy.
      const w = window.open('', '_blank')
      if (w) {
        w.document.body.textContent = payload
      } else {
        // eslint-disable-next-line no-alert
        prompt('Copy the recording JSON:', payload)
      }
    }
  }

  return (
    <div
      data-recorder="true"
      style={{
        position: 'fixed',
        right: 12,
        bottom: 12,
        zIndex: 9999,
        fontFamily: 'ui-monospace, monospace',
        fontSize: 11,
      }}
    >
      {open && (
        <div
          style={{
            marginBottom: 8,
            background: '#1C1C1C',
            border: '1px solid #3D3D3D',
            borderRadius: 10,
            padding: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            color: '#A3A3A3',
          }}
        >
          <button
            type="button"
            onClick={exportJson}
            style={{
              border: '1px solid #FAFAFA',
              color: '#FAFAFA',
              background: 'none',
              borderRadius: 8,
              padding: '8px 10px',
              fontFamily: 'inherit',
            }}
          >
            {copied ? 'copied ✓' : 'copy recording'}
          </button>
          <button
            type="button"
            onClick={() => {
              events.current = []
              setCount(0)
            }}
            style={{
              border: '1px solid #3D3D3D',
              color: '#A3A3A3',
              background: 'none',
              borderRadius: 8,
              padding: '8px 10px',
              fontFamily: 'inherit',
            }}
          >
            clear
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          border: '1px solid #3D3D3D',
          background: '#1C1C1C',
          color: '#FAFAFA',
          borderRadius: 999,
          padding: '8px 12px',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ color: '#FF3D8A' }}>●</span> REC {count}
      </button>
    </div>
  )
}
