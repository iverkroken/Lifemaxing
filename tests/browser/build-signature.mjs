import { build } from 'vite'
import { resolve } from 'node:path'

// Uses the existing React/Vite toolchain. The normal application build excludes this entry.
await build({
  root: resolve('client'),
  configFile: resolve('client/vite.config.js'),
  build: {
    outDir: resolve('artifacts/p1/build'),
    emptyOutDir: false,
    rollupOptions: { input: resolve('client/design-reference/index.html') },
  },
})
