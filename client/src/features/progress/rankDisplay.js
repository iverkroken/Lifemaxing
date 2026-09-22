// Rank names, thresholds, image paths and progression come from the server catalog.
export function rankLabel(info, t) {
  return info ? `${t(info.name)} ${info.division || ''}`.trim() : ''
}
export function rankStyle(info) {
  return info?.colorToken ? { '--rank-accent': `var(${info.colorToken})` } : undefined
}
export function nextRankLabel(info, t) {
  if (!info?.nextLabel) return ''
  const [name, division] = info.nextLabel.split(' ')
  return `${t(name)} ${division}`
}
