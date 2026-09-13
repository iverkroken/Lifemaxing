// Only non-sensitive display preferences. Run before the first paint.
(() => {
  let saved = {}
  try { saved = JSON.parse(localStorage.getItem('lifemaxing.display') || '{}') || {} } catch { /* Storage may be unavailable. */ }
  const theme = ['light', 'dark', 'system'].includes(saved.theme) ? saved.theme : 'system'
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.documentElement.dataset.density = saved.density === 'compact' ? 'compact' : 'normal'
  document.documentElement.lang = ['en', 'nb', 'sv', 'da'].includes(saved.uiLanguage) ? saved.uiLanguage : 'en'
})()
