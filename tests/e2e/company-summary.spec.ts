import { expect, test } from '@playwright/test'

const workerBase = process.env.E2E_WORKER_BASE_URL || 'http://127.0.0.1:8787'

const seedPayload = {
  source: 'NAVER',
  companies: [
    {
      corp_code: '00126380',
      corp_name: 'NAVER',
      stock_code: '035420'
    }
  ],
  metrics: [
    {
      corp_code: '00126380',
      basis: 'consolidated',
      period: 'yearly',
      label: '2024',
      fs_nm: 'Consolidated FS',
      revenue: 9700000000,
      operating_income: 1250000000,
      selling_general_administrative_expense: 2100000000,
      cost_of_sales: 3300000000
    },
    {
      corp_code: '00126380',
      basis: 'consolidated',
      period: 'yearly',
      label: '2023',
      fs_nm: 'Consolidated FS',
      revenue: 9200000000,
      operating_income: 1150000000,
      selling_general_administrative_expense: 1980000000,
      cost_of_sales: 3120000000
    },
    {
      corp_code: '00126380',
      basis: 'consolidated',
      period: 'ttm',
      label: '2025 Q1 TTM',
      fs_nm: 'Consolidated FS',
      revenue: 9950000000,
      operating_income: 1310000000,
      selling_general_administrative_expense: 2150000000,
      cost_of_sales: 3370000000
    }
  ]
}

async function resetAndSeedFixtures(): Promise<void> {
  const reset = await fetch(`${workerBase}/api/dev/fixtures/reset`, {
    method: 'POST'
  })

  if (!reset.ok) {
    throw new Error(`Failed to reset fixtures: ${reset.status} ${await reset.text()}`)
  }

  const seed = await fetch(`${workerBase}/api/dev/fixtures/seed`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(seedPayload)
  })

  if (!seed.ok) {
    throw new Error(`Failed to seed fixtures: ${seed.status} ${await seed.text()}`)
  }
}

test.describe('company summary local e2e', () => {
  test.beforeEach(async () => {
    await resetAndSeedFixtures()
  })

  test('sync required state is shown when directory is empty', async ({ page }) => {
    await fetch(`${workerBase}/api/dev/fixtures/reset`, { method: 'POST' })
    await page.goto('/companies')

    await page.getByLabel('회사 검색').fill('NAVER')
    await expect(page.getByText('회사 디렉터리가 동기화되지 않아 검색할 수 없습니다. 먼저 동기화하세요.')).toBeVisible()
  })

  test('manual sync succeeds after sync-required state', async ({ page }) => {
    await fetch(`${workerBase}/api/dev/fixtures/reset`, { method: 'POST' })
    await page.goto('/companies')

    await page.getByLabel('회사 검색').fill('NAVER')
    await expect(page.getByText('회사 디렉터리가 동기화되지 않아 검색할 수 없습니다. 먼저 동기화하세요.')).toBeVisible()

    await page.getByRole('button', { name: '회사 디렉터리 동기화' }).click()
    await expect(page.getByText(/동기화된 회사 수/)).toBeVisible()
    await expect(page.getByRole('button', { name: /NAVER/ })).toBeVisible()
    await expect(page.getByText('회사 디렉터리 동기화에 실패했습니다. OpenDART 키, 네트워크, 응답형식을 확인하세요.')).toHaveCount(0)
  })

  test('search shows company and opens summary', async ({ page }) => {
    await page.goto('/companies')

    await page.getByLabel('회사 검색').fill('NAVER')
    await expect(page.getByRole('button', { name: /NAVER/ })).toBeVisible()

    await page.getByRole('button', { name: /NAVER/ }).click()
    await expect(page).toHaveURL(/\/companies\/00126380\/summary/)
    await expect(page.getByRole('heading', { name: 'NAVER' })).toBeVisible()
  })

  test('summary controls respond to period and range options', async ({ page }) => {
    await page.goto('/companies/00126380/summary')

    await expect(page.getByRole('heading', { name: 'NAVER' })).toBeVisible()

    await page.getByRole('button', { name: /^분기$/ }).click()
    await page.getByRole('button', { name: /^최근 4개 분기$/ }).click()
    await page.getByRole('button', { name: '10년' }).click()

    await expect(page.getByLabel('summary trend chart')).toBeVisible()
  })
})
