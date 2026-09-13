export function displayPreferences(value = {}) {
  return {
    uiLanguage: ['en', 'nb', 'sv', 'da'].includes(value.uiLanguage) ? value.uiLanguage : 'en',
    theme: ['light', 'dark', 'system'].includes(value.theme) ? value.theme : 'system',
    density: value.density === 'compact' ? 'compact' : 'normal',
  }
}
export function readDisplayPreferences() {
  try { return displayPreferences(JSON.parse(localStorage.getItem('lifemaxing.display') || '{}') || {}) }
  catch { return displayPreferences() }
}
export function rememberDisplayPreferences(value) {
  try { localStorage.setItem('lifemaxing.display', JSON.stringify(displayPreferences(value))) }
  catch { /* Account preferences still persist on the server when browser storage is unavailable. */ }
}
