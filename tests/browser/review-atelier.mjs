import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const output = 'artifacts/atelier/screenshots'
await mkdir(output, { recursive: true })
// Keep native scrollbars visible: they are part of the visual study.
const browser = await chromium.launch({
  ignoreDefaultArgs: ['--hide-scrollbars']
})
try {
  const page = await browser.newPage()
  page.on('pageerror', (error) => {
    throw error
  })
  for (const [device, width, height] of [
    ['desktop', 1440, 1000],
    ['mobile', 390, 844]
  ]) {
    await page.setViewportSize({ width, height })
    for (const theme of ['light', 'dark']) {
      for (const view of [
        'today',
        'areas',
        'progress',
        'settings',
        ...(device === 'desktop' ? ['brand', 'sidebar', 'surfaces'] : [])
      ]) {
        await page.goto(
          `http://127.0.0.1:5176/design-reference/atelier/?view=${view}&theme=${theme}&preview=1`
        )
        await page.waitForLoadState('networkidle')
        await page.screenshot({
          path: `${output}/${view}-${device}-${theme}.png`,
          fullPage: true
        })
        if (view === 'today')
          await page.screenshot({
            path: `${output}/today-${device}-${theme}-viewport.png`
          })
      }
    }
  }
  await page.setViewportSize({ width: 1600, height: 1200 })
  await page.goto('http://127.0.0.1:5176/design-reference/atelier/')
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: `${output}/gallery.png`, fullPage: true })
} finally {
  await browser.close()
}
