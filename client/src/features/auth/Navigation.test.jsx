import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { TopNavigation, SectionNavigation } from './Navigation.jsx'

vi.mock('../settings/language.js', () => ({ useLanguage: () => ({ t: key => key }) }))

describe('application navigation', () => {
  it('marks Plan active on task details without adding a global creation action', () => {
    render(<MemoryRouter initialEntries={['/tasks/example']}><TopNavigation onSearch={() => {}} onMenu={() => {}} /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Plan' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: 'Search' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Menu' })).toBeVisible()
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })
  it('exposes all Plan destinations without changing their routes', () => {
    render(<MemoryRouter initialEntries={['/goals/example']}><SectionNavigation /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'goals' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'inbox' })).toHaveAttribute('href', '/inbox')
    expect(screen.getAllByRole('link')).toHaveLength(4)
  })
  it('marks Progress active on Rewards and keeps Focus reachable', () => {
    render(<MemoryRouter initialEntries={['/rewards']}><TopNavigation session={{ status: 'Paused' }} onSearch={() => {}} onMenu={() => {}} /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'progress' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('link', { name: /continueFocus/ })).toHaveAttribute('href', '/focus')
  })
})
