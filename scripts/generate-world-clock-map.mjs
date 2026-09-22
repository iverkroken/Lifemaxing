// Offline map maintenance: node scripts/generate-world-clock-map.mjs
// Pinned public-domain sources. No dependencies or runtime network requests.
import { writeFile } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'

const commit = 'ca96624a56bd078437bca8184e78163e5039ad19'
async function download(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Source failed: ${response.status} ${url}`)
  return Buffer.from(await response.arrayBuffer())
}
const land = JSON.parse(await download(`https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${commit}/geojson/ne_110m_land.geojson`))
const paths = []
for (const { geometry } of land.features) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  for (const polygon of polygons) for (const ring of polygon) {
    paths.push('M' + ring.map(([lon, lat]) => `${+(lon + 180).toFixed(2)},${+(90 - lat).toFixed(2)}`).join('L') + 'Z')
  }
}
const archive = gunzipSync(await download('https://data.iana.org/time-zones/releases/tzdata2026d.tar.gz'))
const files = new Map()
for (let offset = 0; offset + 512 <= archive.length;) {
  const name = archive.toString('utf8', offset, offset + 100).replace(/\0.*$/s, '')
  if (!name) break
  const size = parseInt(archive.toString('ascii', offset + 124, offset + 136).replace(/\0.*$/s, '').trim(), 8)
  files.set(name, archive.toString('utf8', offset + 512, offset + 512 + size))
  offset += 512 + Math.ceil(size / 512) * 512
}
function coordinate(value) {
  const raw = value.slice(1), degrees = [4, 6].includes(raw.length) ? 2 : 3
  return +((value[0] === '-' ? -1 : 1) * (Number(raw.slice(0, degrees)) + Number(raw.slice(degrees, degrees + 2)) / 60 + Number(raw.slice(degrees + 2)) / 3600)).toFixed(5)
}
const zones = {}, links = {}
// zone.tab retains country-specific coordinates for exemplars such as Oslo.
for (const name of ['zone1970.tab', 'zone.tab']) for (const line of files.get(name).split('\n')) {
  if (!line || line.startsWith('#')) continue
  const [, coords, zone] = line.split('\t'), split = coords.slice(1).search(/[+-]/) + 1
  zones[zone] = [coordinate(coords.slice(0, split)), coordinate(coords.slice(split))]
}
for (const name of ['backward', 'africa', 'antarctica', 'asia', 'australasia', 'europe', 'northamerica', 'southamerica', 'etcetera']) {
  for (const line of files.get(name).split('\n')) {
    const fields = line.trim().split(/\s+/)
    if (fields[0] === 'Link') links[fields[2]] = fields[1]
  }
}
for (let pass = 0; pass < 3; pass++) for (const [alias, target] of Object.entries(links)) {
  if (!zones[alias] && zones[target]) zones[alias] = zones[target]
}
const json = JSON.stringify({ land: paths.join(''), zones })
await writeFile(new URL('../client/src/features/focus/worldMapData.json', import.meta.url), json)
console.log(`World map: ${json.length} bytes, ${Object.keys(zones).length} geographic zones`)
