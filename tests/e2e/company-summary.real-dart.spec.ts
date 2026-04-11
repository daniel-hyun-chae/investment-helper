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
  let offset = 0
  let imported = 0

  for (let i = 0; i < 300; i += 1) {
    const url = new URL(`${workerBase}/api/companies/sync`)
    url.searchParams.set('offset', String(offset))
    url.searchParams.set('limit', '1200')

    const controller = new AbortController()
    const timer = setTimeout(() => {
      controller.abort('sync-timeout')
    }, 40_000)

    let response: Response
    try {
      response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          accept: 'application/json'
        },
        signal: controller.signal
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Real-DART sync batch timed out at offset=${offset}.`)
      }
      throw error
    } finally {
      clearTimeout(timer)
    }

    const payload = (await response.json()) as {
      ok: boolean
      imported?: number
      done?: boolean
      nextOffset?: number | null
      error?: string
      code?: string
      detail?: string
    }

    if (!response.ok || !payload.ok) {
      throw new Error(`Real-DART sync failed: status=${response.status} payload=${JSON.stringify(payload)}`)
    }

    imported += payload.imported ?? 0

    if (payload.done) {
      return { imported }
    }

    if (typeof payload.nextOffset !== 'number') {
      throw new Error(`Real-DART sync progress invalid at offset=${offset}: ${JSON.stringify(payload)}`)
    }

    offset = payload.nextOffset
  }

  throw new Error('Real-DART sync exceeded iteration limit.')
}

test.describe('company summary real OpenDART e2e', () => {
  test.setTimeout(420_000)

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
    await expect(page.getByText('Worker exceeded CPU time limit.')).toHaveCount(0)
    await expect(page.getByText('Too many subrequests by single Worker invocation.')).toHaveCount(0)
  })

  test('direct company summary open works after real sync', async ({ page }) => {
    await syncCompaniesOrFail()

    await page.goto('/companies')
    await page.getByLabel('\uD68C\uC0AC \uAC80\uC0C9').fill(targetCompany)
    const companyButton = page.getByRole('button', { name: new RegExp(targetCompany) }).first()
    await expect(companyButton).toBeVisible({ timeout: 30_000 })

    const text = await companyButton.textContent()
    const corpMatch = text?.match(/(\d{8})/)
    if (!corpMatch) {
      throw new Error(`Failed to parse corp code from search result: ${text}`)
    }

    await page.goto(`/companies/${corpMatch[1]}/summary?period=yearly&range=5`)
    await expect(page.getByLabel('summary trend chart')).toBeVisible({ timeout: 45_000 })
    await expect(page.getByText('Too many redirects')).toHaveCount(0)
  })
})
