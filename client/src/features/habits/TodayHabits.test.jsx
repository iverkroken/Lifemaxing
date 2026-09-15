import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { expect, test, vi } from 'vitest'
import { TodayHabits } from './TodayHabits.jsx'

const day = { localDate: '2026-09-15', currentLocalDate: '2026-09-15', habits: [] }

test('offers contextual creation on the Habits page and preserves the Today navigation fallback', async () => {
  const onCreate = vi.fn()
  const action = { mutate: vi.fn(), isPending: false }
  const { rerender } = render(<MemoryRouter><TodayHabits data={day} action={action} onCreate={onCreate} /></MemoryRouter>)
  await userEvent.click(screen.getByRole('button', { name: 'New habit' }))
  expect(onCreate).toHaveBeenCalledOnce()
  expect(action.mutate).not.toHaveBeenCalled()
  rerender(<MemoryRouter><TodayHabits data={day} action={action} /></MemoryRouter>)
  expect(screen.getByRole('link', { name: 'Explore your habits' })).toHaveAttribute('href', '/habits')
})

test('logs the selected real date, reverses the existing log, and prevents future completion', async () => {
  const action = { mutate: vi.fn(), isPending: false }
  const habit = { id: 'read', title: 'Read a chapter', pattern: 'WeeklyCount', weeklyTarget: 3, weekCompletions: 2, activeLogId: null }
  const { rerender } = render(<MemoryRouter><TodayHabits data={{ ...day, habits: [habit] }} action={action} /></MemoryRouter>)
  expect(screen.getByText('2 / 3 this week')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Log completion: Read a chapter' })).toHaveAttribute('aria-pressed', 'false')
  await userEvent.click(screen.getByRole('button', { name: 'Log completion: Read a chapter' }))
  expect(action.mutate).toHaveBeenLastCalledWith({ path: '/habits/read/logs', body: { localDate: '2026-09-15' } })
  rerender(<MemoryRouter><TodayHabits data={{ ...day, habits: [{ ...habit, activeLogId: 'record' }] }} action={action} /></MemoryRouter>)
  expect(screen.getByRole('button', { name: 'Undo completion: Read a chapter' })).toHaveAttribute('aria-pressed', 'true')
  await userEvent.click(screen.getByRole('button', { name: 'Undo completion: Read a chapter' }))
  expect(action.mutate).toHaveBeenLastCalledWith({ path: '/habits/read/logs/record/revoke' })
  rerender(<MemoryRouter><TodayHabits data={{ ...day, localDate: '2026-09-16', habits: [habit] }} action={action} /></MemoryRouter>)
  expect(screen.getByRole('button', { name: 'Log completion: Read a chapter' })).toBeDisabled()
})
