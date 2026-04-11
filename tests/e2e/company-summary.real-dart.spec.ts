import { expect, test } from '@playwright/test'

function normalizeBaseUrl(raw: string | undefined): string | null {
  if (!raw) {
    return null
  }

  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.replace(/\/$/, '')
  }

  return `https://${trimmed.replace(/\/$/, '')}`
}

const workerBase = normalizeBaseUrl(process.env.E2E_WORKER_BASE_URL)
const targetCompany = process.env.E2E_REAL_DART_COMPANY || '\uC0BC\uC131\uC804\uC790'

if (!workerBase) {
  throw new Error('E2E_WORKER_BASE_URL is required for real-dart e2e tests.')
}

async function syncCompaniesOrFail() {
  const start = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => {
    controller.abort('sync-timeout')
  }, 150_000)

  let response: Response
  try {
    response = await fetch(`${workerBase}/api/companies/sync`, {
      method: 'POST',
      headers: {
        accept: 'application/json'
      },
      signal: controller.signal
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Real-DART sync request timed out after 150s. Worker did not return response in time.')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }

  const elapsed = Date.now() - start
  // eslint-disable-next-line no-console
  console.log(`real-dart sync response time: ${elapsed}ms`)

  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    payload = { parseError: true }
  }

  if (!response.ok) {
    throw new Error(`Real-DART sync failed: status=${response.status} payload=${JSON.stringify(payload)}`)
  }

  return payload
}

test.describe('company summary real OpenDART e2e', () => {
  test.setTimeout(300_000)

  test('sync endpoint responds within timeout using real OpenDART', async () => {
    await syncCompaniesOrFail()
  })

  test('search, and summary navigation using real OpenDART synced data', async ({ page }) => {
    await syncCompaniesOrFail()

    await page.goto('/companies')
    await expect(page.getByLabel('\uD68C\uC0AC \uAC80\uC0C9')).toBeVisible({ timeout: 30_000 })

    await page.getByLabel('\uD68C\uC0AC \uAC80\uC0C9').fill(targetCompany)

    const companyButton = page.getByRole('button', { name: new RegExp(targetCompany) }).first()
    await expect(companyButton).toBeVisible({ timeout: 30_000 })
    await companyButton.click()

    await expect(page).toHaveURL(/\/companies\/\d{8}\/summary/, { timeout: 30_000 })
    await expect(page.getByLabel('summary trend chart')).toBeVisible({ timeout: 30_000 })
  })
})
