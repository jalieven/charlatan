import { fitFontSize, wordWidthEm } from './fitText'

/**
 * A secret word on exactly one line: never wrapped, never hyphen-broken, scaled down
 * from `capPx` only as far as its own width demands (see `./fitText`).
 *
 * Pass `widthEm` to lock several words to one shared size — the Whisper pair and the
 * real/decoy pair must be typographically identical, so neither size nor position can
 * hint at which word is which (§3.6).
 */
export function FitWord({
  text,
  capPx,
  widthEm,
  tracking = 0,
  testId,
}: {
  text: string
  capPx: number
  widthEm?: number
  tracking?: number
  testId?: string
}) {
  const em = widthEm ?? wordWidthEm(text, tracking)
  return (
    <div className="w-full" style={{ containerType: 'inline-size' }}>
      <div
        data-testid={testId}
        className="leading-none font-bold whitespace-nowrap"
        style={{ fontSize: fitFontSize(em, capPx), letterSpacing: `${tracking}em` }}
      >
        {text.toUpperCase()}
      </div>
    </div>
  )
}
