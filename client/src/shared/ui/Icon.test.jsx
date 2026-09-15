import { render } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Icon } from './Icon.jsx'

test('all production semantic icons resolve without the unknown-name fallback', () => {
  const names = ['back', 'arrow', 'search', 'signOut', 'shield', 'flag', 'today', 'tasks', 'habits', 'goals', 'inbox', 'focus', 'progress', 'activity', 'rewards', 'settings', 'plus', 'close', 'check', 'more', 'fitness', 'university', 'career', 'finance', 'home', 'style', 'food', 'creative', 'travel', 'personal', 'leaf', 'appearance', 'languageTime']
  const { container } = render(<><Icon name="unknown" />{names.map(name => <Icon key={name} name={name} />)}</>)
  const [fallback, ...icons] = container.querySelectorAll('svg')
  for (const icon of icons) {
    expect(icon.innerHTML).not.toBe(fallback.innerHTML)
    expect(icon.getAttribute('viewBox')).toBe('0 0 256 256')
  }
})

test('preserves size and caller props while remaining decorative and using currentColor', () => {
  const { container } = render(<Icon name="areas" size={24} className="area-icon" data-context="label" />)
  const svg = container.querySelector('svg')
  expect(svg).toHaveAttribute('width', '24')
  expect(svg).toHaveAttribute('height', '24')
  expect(svg).toHaveClass('area-icon')
  expect(svg).toHaveAttribute('data-context', 'label')
  expect(svg).toHaveAttribute('aria-hidden', 'true')
  expect(svg).toHaveAttribute('focusable', 'false')
  expect(svg).toHaveAttribute('fill', 'currentColor')
  expect(svg).toHaveAttribute('stroke', 'none')
})
