import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, expect, test, vi } from 'vitest'
import { SubscriptionsPage } from './SubscriptionsPage.jsx'
import { LanguageContext, translate } from '../settings/language.js'
import { financeCatalog } from './financeCatalog.js'

const hooks = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn(), failed: false }))
vi.mock('../../shared/api/productivity.js', () => ({
  useProductivity: hooks.query,
  useProductivityAction: () => ({ mutate: hooks.mutate, isError: hooks.failed, error: { status: 503 } }),
}))
const record = { id: 'fictional-id', name: 'Fictional journal', category: 'Reading', price: 12, currency: 'EUR',
  billingInterval: 'Monthly', nextBillingDate: '2026-08-01', startDate: '2026-01-01', status: 'Active' }
const result = { items: [record], total: 22, page: 1, pageSize: 20, localDate: '2026-09-20', overdueCount: 1,
  totals: [{ currency: 'EUR', monthly: 35, annual: 420, count: 21 }, { currency: 'NOK', monthly: 10, annual: 120, count: 1 }],
  categories: [{ currency: 'EUR', category: 'Reading', monthly: 35, annual: 420, count: 21 }], upcoming: [record] }
function mount() {
  const t = (key, values = {}) => (financeCatalog[key]?.[0] || translate('en', key)).replace(/\{(\w+)\}/g, (_, name) => values[name])
  return render(<LanguageContext.Provider value={{ t }}><MemoryRouter><SubscriptionsPage /></MemoryRouter></LanguageContext.Provider>)
}
beforeEach(() => { hooks.query.mockReturnValue({ data: result }); hooks.mutate.mockReset(); hooks.failed = false })

test('uses full API summaries by currency and labels manual dates and cancellation honestly', async () => {
  const user = userEvent.setup()
  mount()
  expect(hooks.query).toHaveBeenCalledWith('/finance/subscriptions?status=Active&page=1&pageSize=20')
  expect(screen.getAllByText(/EUR\s*35\.00/).length).toBeGreaterThan(0)
  expect(screen.getByText(/NOK\s*120\.00/)).toBeVisible()
  expect(screen.getByText(/does not cancel or change billing with your provider/)).toBeVisible()
  expect(screen.getAllByText('Needs review')).toHaveLength(2)
  await user.click(screen.getByRole('button', { name: 'Mark cancelled' }))
  expect(hooks.mutate).toHaveBeenCalledWith({ path: '/finance/subscriptions/fictional-id/status', method: 'PUT', body: { status: 'Cancelled' } })
  await user.selectOptions(screen.getByLabelText('Subscription list'), 'Cancelled')
  expect(hooks.query).toHaveBeenLastCalledWith('/finance/subscriptions?status=Cancelled&page=1&pageSize=20')
})

test('failed cancellation retains the record and presents retryable feedback', async () => {
  hooks.failed = true
  mount()
  expect(screen.getByRole('heading', { name: 'Fictional journal' })).toBeVisible()
  expect(screen.getByRole('alert')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Mark cancelled' })).toBeEnabled()
})
