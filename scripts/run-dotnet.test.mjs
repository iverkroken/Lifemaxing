import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { resolveDotnetExecutable } from './run-dotnet.mjs'

const launcherPath = fileURLToPath(new URL('./run-dotnet.mjs', import.meta.url))
const repositoryRoot = fileURLToPath(new URL('../', import.meta.url))

test('uses a compatible per-user dotnet when PATH cannot load the pinned SDK', () => {
  const selected = resolveDotnetExecutable({
    platform: 'win32',
    env: {
      LOCALAPPDATA: 'C:\\Users\\developer\\AppData\\Local',
      USERPROFILE: 'C:\\Users\\developer',
    },
    isUsable: (candidate) => candidate === 'C:\\Users\\developer\\AppData\\Local\\Microsoft\\dotnet\\dotnet.exe',
  })

  assert.equal(selected, 'C:\\Users\\developer\\AppData\\Local\\Microsoft\\dotnet\\dotnet.exe')
})

test('explains how to fix the environment when no compatible dotnet can be found', () => {
  assert.throws(
    () => resolveDotnetExecutable({
      platform: 'linux',
      env: {},
      isUsable: () => false,
    }),
    /compatible .NET SDK.*global\.json/i,
  )
})

test('runs the repository-compatible dotnet executable', () => {
  const result = spawnSync(process.execPath, [launcherPath, '--version'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  })

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /^10\.0\.401\s*$/)
})
