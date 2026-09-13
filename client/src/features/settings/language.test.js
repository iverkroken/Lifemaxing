import { expect, test } from 'vitest'
import { interfaceLanguage, translate } from './language.js'

test.each([['en-GB', 'Settings'], ['nb-NO', 'Innstillinger'], ['sv-SE', 'Inställningar'], ['da-DK', 'Indstillinger']])('supported locale %s selects real interface copy', (locale, text) => {
  expect(translate(locale, 'settings')).toBe(text)
  expect(translate(locale, 'everywhere')).not.toBe('everywhere')
})
test('older regional preferences remain usable, with a safe English fallback', () => {
  expect(interfaceLanguage('hu-HU')).toBe('en')
  expect(translate('en-US', 'settings')).toBe('Settings')
  expect(interfaceLanguage('no-NO')).toBe('nb')
})
