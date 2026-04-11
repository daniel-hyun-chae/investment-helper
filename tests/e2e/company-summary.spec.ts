import { expect, test } from '@playwright/test'

const workerBase = 'http://127.0.0.1:8787'

async function resetAndSeedFixtures() {
  await fetch(`${workerBase}/api/dev/fixtures/reset`, { method: 'POST' })
  const seedResponse = await fetch(`${workerBase}/api/dev/fixtures/seed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ corpCode: '00126380', corpName: 'NAVER', stockCode: '035420' })
  })

  if (!seedResponse.ok) {
    throw new Error(`fixture seed failed: ${seedResponse.status}`)
  }
}

test.beforeEach(async () => {
  await resetAndSeedFixtures()
})

test('sync-required error is shown when directory is empty', async ({ page }) => {
  await fetch(`${workerBase}/api/dev/fixtures/reset`, { method: 'POST' })

  await page.goto('/companies')
  await page.getByRole('textbox', { name: '\uD68C\uC0AC \uAC80\uC0C9' }).fill('NAVER')

  await expect(
    page.getByText(
      '\uD68C\uC0AC \uB514\uB809\uD130\uB9AC\uAC00 \uB3D9\uAE30\uD654\uB418\uC9C0 \uC54A\uC544 \uAC80\uC0C9\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uBA3C\uC800 \uB3D9\uAE30\uD654\uD558\uC138\uC694.'
    )
  ).toBeVisible()
})

test('manual sync action succeeds after sync-required state', async ({ page }) => {
  await fetch(`${workerBase}/api/dev/fixtures/reset`, { method: 'POST' })
  await page.goto('/companies')

  await page.getByRole('textbox', { name: '\uD68C\uC0AC \uAC80\uC0C9' }).fill('NAVER')
  await expect(
    page.getByText(
      '\uD68C\uC0AC \uB514\uB809\uD130\uB9AC\uAC00 \uB3D9\uAE30\uD654\uB418\uC9C0 \uC54A\uC544 \uAC80\uC0C9\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uBA3C\uC800 \uB3D9\uAE30\uD654\uD558\uC138\uC694.'
    )
  ).toBeVisible()

  await page.getByRole('button', { name: '\uD68C\uC0AC \uB514\uB809\uD130\uB9AC \uB3D9\uAE30\uD654' }).click()
  await expect(page.getByText('\uB3D9\uAE30\uD654\uB41C \uD68C\uC0AC \uC218')).toBeVisible()
})

test('search shows company and opens summary', async ({ page }) => {
  await page.goto('/companies')

  await page.getByRole('textbox', { name: '\uD68C\uC0AC \uAC80\uC0C9' }).fill('NAVER')
  await expect(page.getByRole('button', { name: /NAVER/ })).toBeVisible()

  await page.getByRole('button', { name: /NAVER/ }).click()
  await expect(page.getByRole('heading', { name: 'NAVER' })).toBeVisible()
  await expect(page.getByText('\uC7AC\uBB34 \uAE30\uC900')).toBeVisible()
})

test('summary controls change between period and range options', async ({ page }) => {
  await page.goto('/companies/00126380/summary')

  await expect(page.getByRole('heading', { name: 'NAVER' })).toBeVisible()

  await page.getByRole('button', { name: '\uBD84\uAE30' }).click()
  await page.getByRole('button', { name: '\uCD5C\uADFC 4\uAC1C \uBD84\uAE30' }).click()
  await page.getByRole('button', { name: '10\uB144' }).click()

  await expect(page.getByLabel('summary trend chart')).toBeVisible()
})
