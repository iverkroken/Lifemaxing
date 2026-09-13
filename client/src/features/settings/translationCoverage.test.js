import { readFileSync, readdirSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { expect, test } from 'vitest'
import { messages, translate } from './language.js'
import { formatDate, localizedArea, errorKey } from './formatting.js'

test('every literal UI translation key has four complete translations and matching parameters', () => {
  const root = resolve('src') + sep
  const missing = []
  for (const file of readdirSync(root, { recursive: true }).filter(file => file.endsWith('.jsx') && !file.includes('.test.'))) {
    const source = readFileSync(root + file, 'utf8')
    for (const match of source.matchAll(/\bt\(\s*(?:'([^']*)'|"([^"]*)")\s*[,)]/g)) {
      const key = match[1] ?? match[2]
      if (!messages[key]) missing.push(file + ': ' + key)
    }
  }
  expect(missing).toEqual([])
  for (const [key, values] of Object.entries(messages)) {
    expect(values, key).toHaveLength(4)
    const parameters = value => [...value.matchAll(/\{\w+\}/g)].map(match => match[0]).sort()
    for (const value of values) {
      expect(value.trim(), key).not.toBe('')
      expect(parameters(value), key).toEqual(parameters(values[0]))
    }
  }
})

test('formatting preserves historical calendar dates, custom area names and localized structured errors', () => {
  expect(formatDate('2026-03-29', 'nb-NO')).toContain('29.')
  expect(formatDate('2026-03-29', 'en-US')).toBe('Mar 29, 2026')
  for (const language of ['en', 'nb', 'sv', 'da']) {
    const t = (key, values) => translate(language, key, values)
    expect(localizedArea({ key: 'fitness', displayName: 'Ærlig øvelse – långsiktigt' }, t)).toBe('Ærlig øvelse – långsiktigt')
    expect(localizedArea({ key: 'fitness', displayName: 'Health & Fitness' }, t)).toBe(t('area_fitness'))
    expect(t('doneCount', { done: 1, total: 3 })).not.toMatch(/\{/)
    expect(t('areaCount_tasks', { count: 1 })).toBe(messages.areaCount_tasksOne[['en', 'nb', 'sv', 'da'].indexOf(language)].replace('{count}', '1'))
    expect(t('areaCount_tasks', { count: 2 })).toBe(messages.areaCount_tasks[['en', 'nb', 'sv', 'da'].indexOf(language)].replace('{count}', '2'))
    expect(t(errorKey({ code: 'invalid_credentials', status: 401, message: 'private diagnostic' }))).not.toContain('private diagnostic')
  }
  expect(errorKey(new TypeError('network'))).toBe('error_connection')
  expect(errorKey({ status: 503 })).toBe('error_server')
})
