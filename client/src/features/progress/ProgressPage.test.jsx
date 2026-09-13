import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { expect, test, vi } from 'vitest'
import { LanguageContext, translate } from '../settings/language.js'
import { ProgressSummary } from './ProgressPage.jsx'

vi.mock('../../shared/api/productivity.js', () => ({
  useProductivity: () => ({ isSuccess: true, data: { progress: {
    rank: 'Silver', level: 10, totalXp: 8100, xpIntoLevel: 0, xpForNextLevel: 1400,
  } } }),
}))

test.each(['en', 'nb', 'sv', 'da'])('rank artwork retains its domain identity in %s', language => {
  const t = (key, values) => translate(language, key, values)
  const { container } = render(<MemoryRouter><LanguageContext.Provider value={{ language, t }}>
    <ProgressSummary />
  </LanguageContext.Provider></MemoryRouter>)
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(t('Silver'))
  expect(container.querySelector('[data-rank]')).toHaveAttribute('data-rank', 'Silver')
})
