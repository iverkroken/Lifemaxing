import { chromium } from 'playwright'
import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { basename } from 'node:path'

const output = 'artifacts/p1'
const browser = await chromium.launch()
const page = await browser.newPage()
const contrast = []
try {
  for (const theme of ['light', 'dark']) {
    await page.goto(`http://127.0.0.1:5175/design-reference/?theme=${theme}`)
    const tokens = await page.locator('[data-theme]').evaluate(element => {
      const style = getComputedStyle(element)
      return Object.fromEntries(['canvas', 'surface', 'support', 'rail', 'text', 'muted', 'action', 'on-action', 'action-soft', 'danger', 'on-danger', 'control', 'focus', 'bronze', 'ruby', 'category-green', 'category-blue', 'category-bronze', 'category-ruby'].map(name => [name, style.getPropertyValue('--' + name).trim()]))
    })
    const luminance = hex => {
      const rgb = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
      return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722
    }
    const pairs = []
    for (const background of ['canvas', 'surface', 'support', 'rail']) for (const foreground of ['text', 'muted']) pairs.push([foreground, background, 4.5])
    for (const foreground of ['category-green', 'category-blue', 'category-bronze', 'category-ruby', 'danger', 'bronze']) for (const background of ['canvas', 'surface']) pairs.push([foreground, background, 4.5])
    pairs.push(['on-action', 'action', 4.5], ['on-danger', 'danger', 4.5], ['text', 'action-soft', 4.5], ['control', 'surface', 3], ['control', 'canvas', 3], ['focus', 'canvas', 3])
    for (const [foreground, background, minimum] of pairs) {
      const values = [luminance(tokens[foreground]), luminance(tokens[background])].sort((a, b) => b - a)
      const ratio = (values[0] + .05) / (values[1] + .05)
      contrast.push({ theme, foreground, background, ratio: +ratio.toFixed(2), minimum, pass: ratio >= minimum })
    }
  }
  await page.setViewportSize({ width: 1920, height: 1200 })
  await page.goto('http://127.0.0.1:5175/design-reference/?compare=1')
  await page.locator('iframe').first().waitFor()
  for (const frame of page.frames().slice(1)) await frame.locator('h1').waitFor()
  await page.screenshot({ path: `${output}/comparison.png`, fullPage: true })
} finally { await browser.close() }
writeFileSync(`${output}/contrast.json`, JSON.stringify(contrast, null, 2))
const assets = readdirSync('client/design-reference/assets').filter(name => name.endsWith('.png')).map(name => {
  const bytes = readFileSync('client/design-reference/assets/' + name)
  return { name, bytes: bytes.length, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), sha256: createHash('sha256').update(bytes).digest('hex') }
})
writeFileSync(`${output}/asset-metadata.json`, JSON.stringify(assets, null, 2))
const names = readdirSync(`${output}/chromium`).filter(name => name.endsWith('.png')).sort()
const cards = names.map(name => `<figure><a href="chromium/${name}"><img loading="lazy" src="chromium/${name}" alt="${name}"></a><figcaption>${name}</figcaption></figure>`).join('\n')
writeFileSync(`${output}/review.html`, `<!doctype html><html lang="nb"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>P1 · visuell sammenligning</title><style>body{margin:32px;background:#f3efe7;color:#302b27;font:16px/1.6 system-ui}a{color:inherit}h1{font-size:32px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px}figure{margin:0}img{width:100%;max-height:600px;object-fit:contain;object-position:top;background:#e9e3d9}figcaption{overflow-wrap:anywhere}header{max-width:900px;margin-bottom:32px}</style><header><h1>P1 / A og B</h1><p>Faktiske Chromium-bilder av den isolerte prototypen. A er anbefalingen. Draft, ingen eiergodkjenning. Åpne et bilde for full størrelse.</p><p><a href="http://127.0.0.1:5175/design-reference/?compare=1">Interaktiv sammenligning</a> · <a href="../../docs/SIGNATURE_DESIGN_REFERENCE.md">Designkontrakt</a></p><p>Bildene er lokale verifiseringsartefakter. Ingen av dem viser eierdata.</p></header><main>${cards}</main></html>`)
const buildHtml = readFileSync(`${output}/build/design-reference/index.html`, 'utf8')
const currentAssets = [...buildHtml.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(match => basename(match[1]))
const builds = currentAssets.map(name => ({ name, bytes: statSync(`${output}/build/assets/${name}`).size }))
console.log(JSON.stringify({ contrastPairs: contrast.length, failed: contrast.filter(row => !row.pass), assets, builds, screenshots: names.length }, null, 2))
if (contrast.some(row => !row.pass)) process.exitCode = 1
