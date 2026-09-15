import { useLayoutEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSettings } from './settingsApi.js'
import { interfaceLanguage, translate, LanguageContext } from './language.js'
import { useCurrentUser } from '../auth/useCurrentUser.js'
import { readDisplayPreferences, rememberDisplayPreferences } from './displayPreferences.js'

export function LanguageProvider({ children }) {
  const user = useCurrentUser()
  const userId = user.data?.id
  const settings = useQuery({ queryKey: ['settings', userId], queryFn: ({ signal }) => getSettings(signal), enabled: Boolean(userId) })
  const [publicPreferences, setPublicPreferences] = useState(readDisplayPreferences)
  const [preview, setPreview] = useState(null)
  const saved = settings.data || publicPreferences
  const preferences = { ...saved, ...(preview && preview.userId === userId ? preview.values : {}) }
  const { theme = 'system', density = 'normal' } = preferences
  const language = interfaceLanguage(preferences.uiLanguage || preferences.locale || 'en')
  useLayoutEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      document.documentElement.dataset.theme = theme === 'system' ? media.matches ? 'dark' : 'light' : theme
      document.documentElement.dataset.density = density
      document.documentElement.lang = language
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--color-canvas').trim())
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [language, theme, density])
  useLayoutEffect(() => { rememberDisplayPreferences({ ...saved, uiLanguage: language }) }, [saved, language])
  return <LanguageContext.Provider value={{ language, locale: settings.data?.locale || 'en-GB',
    timeZone: settings.data?.timeZoneId || 'UTC', preferences, settings,
    previewAppearance: values => setPreview(values ? { userId, values } : null),
    setPublicPreferences: values => setPublicPreferences(current => ({ ...current, ...values })),
    t: (key, values) => translate(language, key, values, settings.data?.locale || 'en-GB'),
  }}>{children}</LanguageContext.Provider>
}
