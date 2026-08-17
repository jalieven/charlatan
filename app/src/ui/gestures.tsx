import { useEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'

// The four privacy-bearing gestures (requirements §3.3, §6.3):
// everything secret is only-visible-while-touching; every commitment is a
// release-on-target; nothing needs a second hand.

const HOLD_MS = 800

/** Slide-the-knob-to-the-end control used by handoffs and slide-to-pass. */
export function SlideToContinue({
  label,
  onConfirm,
  testId,
  dim,
}: {
  label: string
  onConfirm: () => void
  testId: string
  dim?: boolean
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [x, setX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const confirmed = useRef(false)

  const maxX = () => {
    const el = trackRef.current
    return el ? el.clientWidth - 12 - 44 : 220
  }

  return (
    <div
      ref={trackRef}
      data-testid={testId}
      className="relative flex min-h-[56px] items-center overflow-hidden rounded-full border px-1.5"
      style={{ borderColor: 'var(--color-g2)', opacity: dim ? 0.35 : 1, touchAction: 'none' }}
      onPointerDown={(e) => {
        confirmed.current = false
        startX.current = e.clientX - x
        setDragging(true)
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (!dragging) return
        const next = Math.min(Math.max(0, e.clientX - startX.current), maxX())
        setX(next)
        if (next >= maxX() * 0.92 && !confirmed.current) {
          confirmed.current = true
          setDragging(false)
          setX(0)
          onConfirm()
        }
      }}
      onPointerUp={() => {
        setDragging(false)
        if (!confirmed.current) setX(0)
      }}
      onPointerCancel={() => {
        setDragging(false)
        setX(0)
      }}
    >
      <div
        className="flex size-11 items-center justify-center rounded-full font-bold"
        style={{
          background: 'var(--color-ink)',
          color: 'var(--color-paper)',
          transform: `translateX(${x}px)`,
          transition: dragging ? 'none' : 'transform 200ms ease',
        }}
      >
        →
      </div>
      <span className="eb2 pointer-events-none absolute inset-0 flex items-center justify-center pl-8">
        {label}
      </span>
    </div>
  )
}

/**
 * The cover panel: swipe up AND HOLD to expose the content; the cover snaps
 * shut the instant the pointer lifts. `children` is only mounted while open,
 * so a secret can never linger in the DOM.
 */
export function HoldCover({
  coverLabel,
  coverSub,
  children,
  onOpenChange,
  testId,
}: {
  coverLabel: string
  coverSub: string
  children: ReactNode
  onOpenChange?: (open: boolean) => void
  testId: string
}) {
  const [lift, setLift] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startY = useRef(0)
  const open = lift > 90
  const openRef = useRef(false)

  useEffect(() => {
    if (open !== openRef.current) {
      openRef.current = open
      onOpenChange?.(open)
    }
  }, [open, onOpenChange])

  return (
    <div className="relative flex-1 overflow-hidden rounded-2xl">
      {/* Secret content: mounted only while the cover is actively held open. */}
      <div className="absolute inset-0 flex flex-col">{open ? children : null}</div>
      <div
        data-testid={testId}
        className="striped-cover absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border p-5 text-center"
        style={{
          borderColor: 'var(--color-g2)',
          transform: `translateY(${-lift}px)`,
          transition: dragging ? 'none' : 'transform 160ms ease',
          touchAction: 'none',
          // While open, the cover parks as a slim strip at the top edge.
          height: open ? undefined : undefined,
        }}
        onPointerDown={(e) => {
          startY.current = e.clientY
          setDragging(true)
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (!dragging) return
          const el = e.currentTarget.parentElement
          const max = el ? el.clientHeight - 44 : 400
          setLift(Math.min(Math.max(0, startY.current - e.clientY), max))
        }}
        onPointerUp={() => {
          setDragging(false)
          setLift(0)
        }}
        onPointerCancel={() => {
          setDragging(false)
          setLift(0)
        }}
      >
        <div className="h-1 w-11 rounded-full" style={{ background: 'var(--color-g3)' }} />
        <div className="text-sm font-bold tracking-wider">{coverLabel}</div>
        <div className="max-w-[24ch] text-xs leading-relaxed" style={{ color: 'var(--color-g4)' }}>
          {coverSub}
        </div>
      </div>
    </div>
  )
}

/**
 * The peek: a long-press with a visible ~800ms fill opens the role card,
 * which stays visible only while held. While held, the same thumb can slide
 * onto a release target rendered inside the card; releasing there commits,
 * releasing anywhere else just closes the card.
 */
export function RoleHold({
  label,
  heldLabel,
  renderCard,
  targetEnabled,
  onOpen,
  onCommit,
  testId,
}: {
  label: string
  heldLabel: string
  renderCard: (targetRef: RefObject<HTMLDivElement | null>, hovering: boolean) => ReactNode
  targetEnabled: boolean
  onOpen: () => void
  onCommit: () => void
  testId: string
}) {
  const [filling, setFilling] = useState(false)
  const [held, setHeld] = useState(false)
  const [hovering, setHovering] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const targetRef = useRef<HTMLDivElement>(null)
  const heldRef = useRef(false)
  const hoveringRef = useRef(false)

  const reset = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    heldRef.current = false
    hoveringRef.current = false
    setFilling(false)
    setHeld(false)
    setHovering(false)
  }

  useEffect(() => reset, [])

  return (
    <div className="flex flex-col gap-2">
      {held && <div>{renderCard(targetRef, hovering)}</div>}
      <button
        type="button"
        data-testid={testId}
        className="relative min-h-[56px] w-full overflow-hidden rounded-xl border px-3 py-4 text-center"
        style={{
          borderColor: held ? 'var(--color-ink)' : 'var(--color-g3)',
          color: held ? 'var(--color-ink)' : 'var(--color-g5)',
          touchAction: 'none',
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          setFilling(true)
          timer.current = setTimeout(() => {
            heldRef.current = true
            setHeld(true)
            onOpen()
          }, HOLD_MS)
        }}
        onPointerMove={(e) => {
          if (!heldRef.current || !targetEnabled) return
          const rect = targetRef.current?.getBoundingClientRect()
          const over =
            !!rect &&
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          hoveringRef.current = over
          setHovering(over)
        }}
        onPointerUp={() => {
          if (heldRef.current && hoveringRef.current && targetEnabled) onCommit()
          reset()
        }}
        onPointerCancel={reset}
      >
        {/* The ~800ms fill: an interaction affordance, not a timer (§3.3). */}
        <span
          className="absolute inset-y-0 left-0"
          style={{
            background: 'var(--color-g1)',
            width: held ? '100%' : filling ? '100%' : '0%',
            transition: filling && !held ? `width ${HOLD_MS}ms linear` : 'none',
          }}
        />
        <span className="eb2 relative" style={{ color: 'inherit' }}>
          {held ? heldLabel : label}
        </span>
      </button>
    </div>
  )
}
