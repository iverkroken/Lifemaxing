import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { useProductivityAction } from './productivity.js'
import { clearCsrfToken } from './client.js'
import { ActionFeedback } from '../ui/ProductivityFeedback.jsx'

afterEach(() => { clearCsrfToken(); vi.unstubAllGlobals() })

test('a lost response retains command identity while the next intentional action gets a new one', async () => {
  const keys = []
  vi.stubGlobal('fetch', vi.fn(async (path, options) => {
    if (path.endsWith('/csrf')) return Response.json({ requestToken: 'test' })
    keys.push(options.headers.ClientActionId)
    if (keys.length === 1) throw new TypeError('Failed to fetch')
    return Response.json({ id: 'task' })
  }))
  const client = new QueryClient()
  const { result } = renderHook(() => useProductivityAction(), { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> })
  const action = { path: '/tasks/task/complete' }
  act(() => result.current.mutate(action))
  await waitFor(() => expect(result.current.isError).toBe(true))
  act(() => result.current.mutate(action))
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(keys[0]).toBeTruthy()
  expect(keys[1]).toBe(keys[0])
  await act(() => result.current.mutateAsync(action))
  expect(keys[2]).not.toBe(keys[0])
})

test('completion feedback announces actual XP and the server-derived level', () => {
  render(<ActionFeedback action={{ isSuccess: true, data: { progression: { xpChange: 15, levelUp: true, progress: { level: 2, rank: 'Bronze' } } } }} />)
  expect(screen.getByRole('status')).toHaveTextContent('+15 XP. Level 2 reached · Bronze.')
})
