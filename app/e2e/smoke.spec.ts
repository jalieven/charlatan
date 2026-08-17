import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const NAMES = ['Anna', 'Bea', 'Carl', 'Dora', 'Enzo', 'Fien']

/** Drag the slide-to-continue knob across its track. */
async function slide(page: Page, testId: string) {
  const track = page.getByTestId(testId)
  await expect(track).toBeVisible()
  const box = (await track.boundingBox())!
  const cy = box.y + box.height / 2
  await page.mouse.move(box.x + 28, cy)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width - 6, cy, { steps: 10 })
  await page.mouse.up()
}

test('full round happy path: setup → reveal → clues → votes → result → scoreboard', async ({
  page,
}) => {
  // Elimination rounds legitimately run long (each ejection adds a clue cycle).
  test.setTimeout(300_000)
  await page.goto('/')

  // S1 · Setup
  for (const name of NAMES) {
    await page.getByTestId('setup.name-input').fill(name)
    await page.getByTestId('setup.name-add').click()
  }
  await page.getByTestId('setup.start').click()

  // Round lobby (scoreboard) → start the round.
  await page.getByTestId('score.next-round').click()

  // First reveal: verify the hold-to-see privacy physics once.
  await slide(page, 'handoff.slide')
  const cover = page.getByTestId('reveal.cover')
  await expect(cover).toBeVisible()
  const cbox = (await cover.boundingBox())!
  const cx = cbox.x + cbox.width / 2
  await page.mouse.move(cx, cbox.y + cbox.height - 60)
  await page.mouse.down()
  await page.mouse.move(cx, cbox.y + cbox.height - 220, { steps: 8 })
  await expect(page.getByText(/jouw woord/i)).toBeVisible() // word visible while held
  await page.mouse.up()
  await expect(page.getByText(/jouw woord/i)).not.toBeVisible() // snaps shut on release

  // Drive the round to its end, whatever the random roles decided. Every
  // action is short-timeout and non-fatal: the loop re-reads the screen each
  // iteration, so a click lost to an enter animation simply retries.
  const tryClick = (testId: string) =>
    page.getByTestId(testId).click({ timeout: 2000 }).catch(() => {})
  let clue = 0
  for (let step = 0; step < 600; step++) {
    if (await page.getByTestId('handoff.slide').isVisible().catch(() => false)) {
      await slide(page, 'handoff.slide').catch(() => {})
    } else if (await page.getByTestId('reveal.slide-next').isVisible().catch(() => false)) {
      await slide(page, 'reveal.slide-next').catch(() => {})
    } else if (await page.getByTestId('clues.go-vote').isVisible().catch(() => false)) {
      await tryClick('clues.go-vote')
    } else if (await page.getByTestId('clues.input').isVisible().catch(() => false)) {
      await page.getByTestId('clues.input').fill(`hint${clue++}`, { timeout: 2000 }).catch(() => {})
      await tryClick('clues.confirm')
    } else if (await page.getByTestId('vote.confirm').isVisible().catch(() => false)) {
      // Everyone gangs up on the first-listed candidate: guaranteed ejection.
      await page
        .locator('[data-testid^="vote.candidate."]')
        .first()
        .click({ timeout: 2000 })
        .catch(() => {})
      await tryClick('vote.confirm')
    } else if (await page.getByTestId('verdict.continue').isVisible().catch(() => false)) {
      await tryClick('verdict.continue')
    } else if (await page.getByTestId('guess.input').isVisible().catch(() => false)) {
      await page.getByTestId('guess.input').fill('zzz', { timeout: 2000 }).catch(() => {})
      await tryClick('guess.submit')
    } else if (await page.getByTestId('result.finish').isVisible().catch(() => false)) {
      await tryClick('result.finish')
      if (await page.getByTestId('score.next-round').isVisible().catch(() => false)) break
    } else if (await page.getByTestId('result.screen').isVisible().catch(() => false)) {
      // Peek into the drill-in once, close it, then advance the acts.
      if (await page.getByTestId('result.drill-in').isVisible().catch(() => false)) {
        await tryClick('result.drill-in')
        await tryClick('result.drill-back')
      }
      await tryClick('result.screen')
    } else if (await page.getByTestId('score.next-round').isVisible().catch(() => false)) {
      break
    } else {
      await page.waitForTimeout(150)
    }
  }

  // Back on the scoreboard with one round in the history.
  await expect(page.getByTestId('score.next-round')).toBeVisible()
  await expect(page.locator('text=1 ·')).toBeVisible()
})
