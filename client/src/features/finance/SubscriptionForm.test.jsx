import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { SubscriptionForm } from './SubscriptionForm.jsx'

const action = vi.hoisted(() => ({ mutate: vi.fn(), isPending: false, isError: false }))
vi.mock('../../shared/api/productivity.js', () => ({ useProductivityAction: () => action }))
vi.mock('../settings/language.js', async importOriginal => {
  const original = await importOriginal()
  return { ...original, useLanguage: () => ({ ...original.useLanguage(), t: key => ({
    subscriptionName: 'Subscription name', subscriptionPrice: 'Price per payment', subscriptionCurrency: 'Currency',
    subscriptionInterval: 'Billing interval', subscriptionStart: 'Start date', subscriptionNext: 'Next billing date',
    subscriptionCreate: 'Add subscription', subscriptionSave: 'Save subscription', subscriptionInvalidDate: 'Choose a valid date.',
    subscriptionDateOrder: 'Next billing date cannot be before start date.', subscriptionInvalidPrice: 'Use a price with at most two decimals.',
  }[key] || key) }) }
})

beforeEach(() => { action.mutate.mockReset(); action.isError = false })

test('requires a real price and ordered dates, then creates a free subscription through the shared API mutation', async () => {
  const user = userEvent.setup()
  render(<SubscriptionForm localDate="2026-09-20" />)
  await user.type(screen.getByLabelText(/Subscription name/), 'Fictional reading club')
  await user.click(screen.getByRole('button', { name: 'Add subscription' }))
  expect(action.mutate).not.toHaveBeenCalled()
  await user.type(screen.getByLabelText(/Price per payment/), '0')
  await user.clear(screen.getByLabelText(/Next billing date/))
  await user.type(screen.getByLabelText(/Next billing date/), '2026-09-19')
  await user.click(screen.getByRole('button', { name: 'Add subscription' }))
  expect(await screen.findByText('Next billing date cannot be before start date.')).toBeVisible()
  expect(action.mutate).not.toHaveBeenCalled()
  await user.clear(screen.getByLabelText(/Next billing date/))
  await user.type(screen.getByLabelText(/Next billing date/), '2026-09-20')
  await user.click(screen.getByRole('button', { name: 'Add subscription' }))
  await waitFor(() => expect(action.mutate).toHaveBeenCalledWith(expect.objectContaining({
    path: '/finance/subscriptions', method: 'POST', body: expect.objectContaining({ name: 'Fictional reading club', price: 0, currency: 'EUR', billingInterval: 'Monthly' }),
  }), expect.any(Object)))
})

test('an edit retains entered values when the mutation fails and sends the stable record ID', async () => {
  action.isError = true
  action.error = { status: 503 }
  const user = userEvent.setup()
  render(<SubscriptionForm subscription={{ id: 'stable-id', name: 'Fictional journal', category: 'Reading', price: 12, currency: 'NOK', billingInterval: 'Yearly', startDate: '2024-02-29', nextBillingDate: '2028-02-29', notes: 'Keep this note' }} />)
  await user.clear(screen.getByLabelText(/Subscription name/))
  await user.type(screen.getByLabelText(/Subscription name/), 'Updated journal')
  await user.click(screen.getByRole('button', { name: 'Save subscription' }))
  await waitFor(() => expect(action.mutate).toHaveBeenCalledWith(expect.objectContaining({ path: '/finance/subscriptions/stable-id', method: 'PUT' }), expect.any(Object)))
  expect(screen.getByLabelText(/Subscription name/)).toHaveValue('Updated journal')
  expect(screen.getByRole('alert')).toBeVisible()
})
