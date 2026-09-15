// Export our own Blender PNG masters as transparent WebP, using the installed browser.
// Run from repository root after render.py. No network or third-party image service.
import { chromium } from '@playwright/test'
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const source = resolve('artifacts/atelier/renders')
const destination = resolve('client/design-reference/atelier/assets')
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  for (const name of (await readdir(source))
    .filter((name) => name.endsWith('.png'))
    .sort()) {
    const png = await readFile(resolve(source, name))
    const data = await page.evaluate(
      async (src) => {
        const img = new Image()
        img.src = src
        await img.decode()
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        canvas.getContext('2d').drawImage(img, 0, 0)
        return canvas.toDataURL('image/webp', 0.9).split(',')[1]
      },
      `data:image/png;base64,${png.toString('base64')}`
    )
    const result = Buffer.from(data, 'base64')
    await writeFile(resolve(destination, name.replace('.png', '.webp')), result)
    console.log(`${name}: ${png.length} → ${result.length} bytes`)
  }
} finally {
  await browser.close()
}
