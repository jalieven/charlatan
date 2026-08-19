import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

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

/** Swipe the word cover up and hold; returns a release function. */
async function holdCoverOpen(page: Page, testId: string) {
  const cover = page.getByTestId(testId)
  await expect(cover).toBeVisible()
  const box = (await cover.boundingBox())!
  const cx = box.x + box.width / 2
  await page.mouse.move(cx, box.y + box.height - 60)
  await page.mouse.down()
  await page.mouse.move(cx, box.y + box.height - 220, { steps: 8 })
  return () => page.mouse.up()
}

test('forgot-your-word re-check: PIN gate and slider gate from the clue screen', async ({ page }) => {
  await page.goto('/')

  // S1 · Setup: Anna protects her re-check with a PIN, Bea and Carl do not.
  await page.getByTestId('setup.name-input').fill('Anna')
  await page.getByTestId('setup.pin-input').fill('1234')
  await page.getByTestId('setup.name-add').click()
  await expect(page.getByTestId('setup.player.Anna.pin')).toBeVisible()
  for (const name of ['Bea', 'Carl']) {
    await page.getByTestId('setup.name-input').fill(name)
    await page.getByTestId('setup.name-add').click()
  }
  await page.getByTestId('setup.start').click()
  await page.getByTestId('score.next-round').click()

  // Walk all three reveals without opening the covers.
  for (let i = 0; i < 3; i++) {
    await slide(page, 'handoff.slide')
    await slide(page, 'reveal.slide-next')
  }
  await expect(page.getByTestId('clues.input')).toBeVisible()

  // Anna's pill → PIN gate. A wrong code is refused, the right one unlocks.
  await page.getByTestId('clues.pill.Anna').click()
  await expect(page.getByTestId('recheck.pin-input')).toBeVisible()
  await page.getByTestId('recheck.pin-input').fill('9999')
  await page.getByTestId('recheck.pin-submit').click()
  await expect(page.getByTestId('recheck.pin-wrong')).toBeVisible()
  await page.getByTestId('recheck.pin-input').fill('1234')
  await page.getByTestId('recheck.pin-submit').click()

  // The word sits behind the same hold-to-see cover as the reveal.
  const release = await holdCoverOpen(page, 'recheck.cover')
  await expect(page.getByTestId('reveal.word').first()).toBeVisible()
  await release()
  await expect(page.getByTestId('reveal.word')).not.toBeVisible()
  await page.getByTestId('recheck.back').click()
  await expect(page.getByTestId('clues.input')).toBeVisible()

  // Bea set no PIN: her gate is the handoff-style slider.
  await page.getByTestId('clues.pill.Bea').click()
  await expect(page.getByTestId('recheck.slide')).toBeVisible()
  await slide(page, 'recheck.slide')
  await expect(page.getByTestId('recheck.cover')).toBeVisible()
  await page.getByTestId('recheck.back').click()

  // The clue turn underneath is untouched by both visits.
  await expect(page.getByTestId('clues.input')).toBeVisible()
})
