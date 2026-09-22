import data from './worldMapData.json'

export const cityAliases = [
  ['Beijing', 'Asia/Shanghai', 39.9042, 116.4074],
  ['Mumbai', 'Asia/Kolkata', 19.076, 72.8777],
  ['Los Angeles', 'America/Los_Angeles', 34.0522, -118.2437],
  ['Washington, DC', 'America/New_York', 38.9072, -77.0369],
]
export function cityLocation(city) {
  const alias = cityAliases.find(([name, zone]) => name === city.name && zone === city.timeZoneId)
  const coordinates = alias ? alias.slice(2) : data.zones[city.timeZoneId]
  if (!coordinates) return null
  const [latitude, longitude] = coordinates
  const exemplar = city.timeZoneId.split('/').at(-1).replaceAll('_', ' ')
  return { x: longitude + 180, y: 90 - latitude, representative: !alias && city.name !== exemplar }
}
