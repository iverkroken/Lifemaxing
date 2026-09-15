import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { expect, test, vi } from 'vitest'
import { LanguageContext, translate } from '../settings/language.js'
import { RewardsPage } from './RewardsPage.jsx'

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }))
vi.mock('../../shared/api/productivity.js', () => ({
  useProductivity: path => ({ isSuccess: true, data: path === '/progress' ? { progress: { level: 2 } } : {
    page: 1, pageSize: 3, total: 40,
    items: path.includes('archived=true') ? [
      { id: 'archived', title: 'An archived idea', requiredLevel: 1, archivedAtUtc: '2026-09-14T12:00:00Z', eligible: false },
    ] : [
      { id: 'locked', title: 'A future outing', requiredLevel: 5, eligible: false },
      { id: 'claimed', title: 'A recorded reward', requiredLevel: 1, eligible: true, claimedAtUtc: '2026-09-14T12:00:00Z' },
      { id: 'ready', title: 'An available break', requiredLevel: 2, eligible: true },
    ],
  } }),
  useProductivityAction: () => ({ mutate }),
}))

test('reward groups describe the returned page and retain eligible claim actions', async () => {
  render(<MemoryRouter><LanguageContext.Provider value={{ t: (key, values) => translate('en', key, values), number: String, dateTime: value => value }}>
    <RewardsPage />
  </LanguageContext.Provider></MemoryRouter>)
  expect(screen.getByText('Rewards on this page')).toBeVisible()
  expect(within(screen.getByRole('region', { name: 'Ready to claim', exact: true })).getByRole('region', { name: 'An available break' })).toBeVisible()
  expect(within(screen.getByRole('region', { name: 'Claimed', exact: true })).getByRole('region', { name: 'A recorded reward' })).toBeVisible()
  expect(within(screen.getByRole('region', { name: 'Locked', exact: true })).getByRole('region', { name: 'A future outing' })).toBeVisible()
  expect(screen.getAllByRole('button', { name: 'Claim reward', exact: true })).toHaveLength(1)
  await userEvent.click(screen.getByRole('button', { name: 'Claim reward', exact: true }))
  expect(mutate).toHaveBeenCalledWith({ path: '/rewards/ready/claim' })
  expect(screen.getByRole('button', { name: 'Next', exact: true })).toBeEnabled()
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Reward list' }), 'true')
  expect(screen.getByRole('region', { name: 'Archived rewards', exact: true })).toHaveTextContent('An archived idea')
  expect(screen.queryByRole('region', { name: 'Locked', exact: true })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Claim reward', exact: true })).not.toBeInTheDocument()
})
