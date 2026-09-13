const defaults = { fitness: 'Health & Fitness', university: 'University', career: 'Work & Career', finance: 'Finance', home: 'Home & Plants', style: 'Style', food: 'Food & Cooking', creative: 'Creative', travel: 'Travel', personal: 'Personal' }

export function localizedArea(area, t) {
  if (!area) return ''
  return area.displayName === defaults[area.key] ? t('area_' + area.key) : area.displayName
}

// Date-only domain values keep their recorded calendar day in every time zone.
export function formatDate(value, locale = 'en-GB', options = {}) {
  if (!value) return ''
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', ...options, timeZone: 'UTC' }).format(new Date(value + 'T12:00:00Z'))
}

export function errorKey(error) {
  if (error?.code === 'invalid_credentials') return 'error_credentials'
  if (error?.code === 'csrf_validation_failed') return 'error_secure'
  if (error?.status === 401) return 'error_expired'
  if (error?.status === 403) return 'error_denied'
  if (error?.status === 404) return 'error_missing'
  if (error?.status === 409) return 'error_conflict'
  if (error?.status === 429) return 'error_rate'
  if (error?.status === 400 || error?.code === 'validation_failed') return 'error_validation'
  if (error?.status >= 500) return 'error_server'
  return 'error_connection'
}
