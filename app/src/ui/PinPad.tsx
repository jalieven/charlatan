/**
 * The re-check pin keypad (§S4c): round keys on a grid, so the OS keyboard never
 * opens and a code is only ever anonymous dots — never text in a field. Codes are
 * at least 4 digits with no fixed length (capped at 8 so the dot row keeps fitting).
 */
export const PIN_MIN = 4
export const PIN_MAX = 8

/** Four hollow placeholders fill first; every extra digit appends a dot. */
export function PinDots({ count }: { count: number }) {
  const total = Math.max(PIN_MIN, count)
  return (
    <div className="flex justify-center gap-3">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className="size-[11px] rounded-full border"
          style={
            i < count
              ? { background: 'var(--color-ink)', borderColor: 'var(--color-ink)' }
              : { borderColor: 'var(--color-g3)' }
          }
        />
      ))}
    </div>
  )
}

export function PinPad({
  value,
  onChange,
  onSubmit,
  testId,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  testId: string
}) {
  const ready = value.length >= PIN_MIN
  const digit = (d: number) => (
    <button
      key={d}
      type="button"
      data-testid={`${testId}.key-${d}`}
      className="flex size-14 items-center justify-center rounded-full border text-lg font-bold"
      style={{ borderColor: 'var(--color-g3)' }}
      onClick={() => value.length < PIN_MAX && onChange(value + d)}
    >
      {d}
    </button>
  )
  return (
    <div className="mx-auto grid w-fit grid-cols-3 gap-3">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit)}
      <button
        type="button"
        data-testid={`${testId}.key-back`}
        className="flex size-14 items-center justify-center rounded-full text-base"
        style={{ color: 'var(--color-g4)' }}
        onClick={() => onChange(value.slice(0, -1))}
      >
        ⌫
      </button>
      {digit(0)}
      <button
        type="button"
        data-testid={`${testId}.key-ok`}
        className="flex size-14 items-center justify-center rounded-full border text-lg font-bold"
        disabled={!ready}
        style={
          ready
            ? { borderColor: 'var(--color-ink)' }
            : { borderColor: 'var(--color-g2)', color: 'var(--color-g3)' }
        }
        onClick={onSubmit}
      >
        ✓
      </button>
    </div>
  )
}
