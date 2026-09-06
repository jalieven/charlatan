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

/** Tap a code into a PinPad by its testid prefix. */
async function typePin(page: Page, code: string, pad = 'pin') {
  for (const d of code) await page.getByTestId(`${pad}.key-${d}`).click()
}

test('forgot-your-word re-check: PIN gate and slider gate from the clue screen', async ({ page }) => {
  await page.goto('/')

  // S1 · Setup: Anna protects her re-check with a PIN, Bea and Carl do not.
  for (const name of ['Anna', 'Bea', 'Carl']) {
    await page.getByTestId('setup.name-input').fill(name)
    await page.getByTestId('setup.name-add').click()
  }

  // The pin pill opens the keypad sheet: choose, then confirm — nothing is
  // saved until the code is entered twice and ✓ matches.
  await page.getByTestId('setup.player.Anna.pin').click()
  await typePin(page, '1234')
  await expect(page.getByTestId('pin.title')).toHaveText('Kies een pincode')
  await page.getByTestId('pin.key-ok').click()
  await expect(page.getByTestId('pin.title')).toHaveText('Bevestig je pincode')
  // A mismatching confirmation restarts the choice…
  await typePin(page, '9999')
  await page.getByTestId('pin.key-ok').click()
  await expect(page.getByTestId('pin.error')).toBeVisible()
  await expect(page.getByTestId('pin.title')).toHaveText('Kies een pincode')
  // …so choose and confirm again, matching this time.
  await typePin(page, '1234')
  await page.getByTestId('pin.key-ok').click()
  await typePin(page, '1234')
  await page.getByTestId('pin.key-ok').click()
  await expect(page.getByTestId('pin.sheet')).not.toBeVisible()
  await expect(page.getByTestId('setup.player.Anna.pin')).toHaveText('PIN ✓')

  // Changing it asks for the current code first; cancel leaves it untouched.
  await page.getByTestId('setup.player.Anna.pin').click()
  await expect(page.getByTestId('pin.title')).toHaveText('Huidige pincode eerst')
  await page.getByTestId('pin.cancel').click()

  await page.getByTestId('setup.start').click()
  await page.getByTestId('score.next-round').click()

  // Walk all three reveals without opening the covers.
  for (let i = 0; i < 3; i++) {
    await slide(page, 'handoff.slide')
    await slide(page, 'reveal.slide-next')
  }
  await expect(page.getByTestId('clues.input')).toBeVisible()

  // Anna's pill → PIN gate on the same keypad. Wrong code refused, right one unlocks.
  await page.getByTestId('clues.pill.Anna').click()
  await expect(page.getByTestId('recheck.pin.key-ok')).toBeVisible()
  await typePin(page, '9999', 'recheck.pin')
  await page.getByTestId('recheck.pin.key-ok').click()
  await expect(page.getByTestId('recheck.pin-wrong')).toBeVisible()
  await typePin(page, '1234', 'recheck.pin')
  await page.getByTestId('recheck.pin.key-ok').click()

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

test('deaf & stone: only players who opened their word can re-check it', async ({ page }) => {
  await page.goto('/')

  for (const name of ['Anna', 'Bea', 'Carl']) {
    await page.getByTestId('setup.name-input').fill(name)
    await page.getByTestId('setup.name-add').click()
  }
  // The switch that makes word-viewing a tracked choice (§2.3).
  await page.getByTestId('setup.deaf.on').click()
  await page.getByTestId('setup.start').click()
  await page.getByTestId('score.next-round').click()

  // Only the first reveal opens its cover; the other two pass the phone blind.
  let looker = ''
  for (let i = 0; i < 3; i++) {
    await slide(page, 'handoff.slide')
    if (i === 0) {
      looker = (await page.getByTestId('reveal.name').textContent())!.trim()
      const release = await holdCoverOpen(page, 'reveal.cover')
      await expect(page.getByTestId('reveal.word').first()).toBeVisible()
      await release()
    }
    await slide(page, 'reveal.slide-next')
  }
  await expect(page.getByTestId('clues.input')).toBeVisible()

  // The hint no longer promises a tap the deaf players do not have.
  await expect(page.getByTestId('clues.pill-hint')).toHaveText(
    'Woord vergeten? Tik op je naam — enkel als je het deze ronde bekeek.',
  )

  // Whoever opened their cover is the only re-checkable name; the other two are
  // deaf or stone this round, so their names render as inert text.
  const openable: string[] = []
  for (const name of ['Anna', 'Bea', 'Carl']) {
    if ((await page.getByTestId(`clues.pill.${name}`).count()) > 0) openable.push(name)
  }
  expect(openable.map((n) => n.toUpperCase())).toEqual([looker])
  await page.getByTestId(`clues.pill.${openable[0]}`).click()
  await expect(page.getByTestId('recheck.slide')).toBeVisible()
  await page.getByTestId('recheck.back').click()
  await expect(page.getByTestId('clues.input')).toBeVisible()
})
