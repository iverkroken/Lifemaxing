import { build } from 'vite'
import { resolve } from 'node:path'

await build({
  root: resolve('client'),
  configFile: resolve('client/vite.config.js'),
  build: {
    outDir: resolve('artifacts/atelier/build'),
    emptyOutDir: false,
    rollupOptions: {
      input: resolve('client/design-reference/atelier/index.html')
    }
  }
})
