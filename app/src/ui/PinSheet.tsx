import { useState } from 'react'
import { useT } from '../i18n'
import { PinDots, PinPad } from './PinPad'

type Step = 'verify' | 'choose' | 'confirm'

/**
 * Bottom sheet for setting or changing a player's re-check pin. Nothing is saved
 * until the code is entered twice: choose, then confirm. Changing an existing pin
 * adds a verify step in front — the current code first — so nobody rewrites another
 * player's pin by grabbing the phone. All comparison happens locally; only the
 * final committed pin leaves this component via onSave.
 */
export function PinSheet({
  name,
  currentPin,
  onSave,
  onClose,
}: {
  name: string
  currentPin: string | null
  onSave: (pin: string) => void
  onClose: () => void
}) {
  const t = useT()
  const [step, setStep] = useState<Step>(currentPin ? 'verify' : 'choose')
  const [value, setValue] = useState('')
  const [first, setFirst] = useState('')
  const [error, setError] = useState<string | null>(null)

  const eyebrow = currentPin
    ? `${t('pin.changeTitle')} · ${name.toUpperCase()}`
    : `${t('pin.title')} · ${name.toUpperCase()} · ${t('pin.step', { i: step === 'confirm' ? 2 : 1 })}`
  const title =
    step === 'verify' ? t('pin.verifyCurrent') : step === 'choose' ? t('pin.choose') : t('pin.confirm')

  const submit = () => {
    if (step === 'verify') {
      if (value === currentPin) {
        setStep('choose')
        setError(null)
      } else {
        setError(t('recheck.wrongPin'))
      }
      setValue('')
    } else if (step === 'choose') {
      setFirst(value)
      setValue('')
      setError(null)
      setStep('confirm')
    } else if (value === first) {
      onSave(value)
    } else {
      // A mismatch restarts the choice: the first entry may be the mistyped one.
      setError(t('pin.mismatch'))
      setValue('')
      setFirst('')
      setStep('choose')
    }
  }

  return (
    <>
      <div
        className="absolute inset-0 z-10"
        style={{ background: 'rgba(10,10,10,.66)' }}
        data-testid="pin.scrim"
        onClick={onClose}
      />
      <div
        className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 rounded-t-2xl border-t p-4 pb-5"
        style={{ background: '#111111', borderColor: '#2e2e2e' }}
        data-testid="pin.sheet"
      >
        <div className="mx-auto h-[3px] w-9 rounded-full" style={{ background: 'var(--color-g3)' }} />
        <div className="eb">{eyebrow}</div>
        <div className="text-lg font-bold" data-testid="pin.title">
          {title}
        </div>
        <div className="py-2">
          <PinDots count={value.length} />
        </div>
        {error ? (
          <div className="text-center text-xs" data-testid="pin.error" style={{ color: 'var(--color-ink)' }}>
            {error}
          </div>
        ) : (
          <div className="text-center text-xs" style={{ color: 'var(--color-g4)' }}>
            {t('pin.minHint')}
          </div>
        )}
        <div className="py-2">
          <PinPad
            value={value}
            onChange={(v) => {
              setValue(v)
              setError(null)
            }}
            onSubmit={submit}
            testId="pin"
          />
        </div>
        <button type="button" className="cta cta-quiet" data-testid="pin.cancel" onClick={onClose}>
          {t('pin.cancel')}
        </button>
      </div>
    </>
  )
}
