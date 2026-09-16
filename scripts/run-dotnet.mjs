import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

function canLoadPinnedSdk(candidate) {
  const result = spawnSync(candidate, ['--version'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    windowsHide: true,
  })

  return result.status === 0
}

export function resolveDotnetExecutable({
  platform = process.platform,
  env = process.env,
  isUsable = canLoadPinnedSdk,
} = {}) {
  const executableName = platform === 'win32' ? 'dotnet.exe' : 'dotnet'
  const pathApi = platform === 'win32' ? path.win32 : path.posix
  const candidates = ['dotnet']

  if (env.DOTNET_ROOT) {
    candidates.push(pathApi.join(env.DOTNET_ROOT, executableName))
  }

  if (platform === 'win32') {
    if (env.LOCALAPPDATA) {
      candidates.push(pathApi.join(env.LOCALAPPDATA, 'Microsoft', 'dotnet', executableName))
    }
    if (env.USERPROFILE) {
      candidates.push(pathApi.join(env.USERPROFILE, '.dotnet', executableName))
    }
  }

  const executable = candidates.find((candidate) => isUsable(candidate))
  if (!executable) {
    throw new Error('Could not find a compatible .NET SDK for this repository. Install the version selected by global.json or configure DOTNET_ROOT/PATH.')
  }

  return executable
}

function isDirectInvocation() {
  if (!process.argv[1]) return false

  const invokedPath = path.resolve(process.argv[1])
  const modulePath = fileURLToPath(import.meta.url)
  return process.platform === 'win32'
    ? invokedPath.toLowerCase() === modulePath.toLowerCase()
    : invokedPath === modulePath
}

if (isDirectInvocation()) {
  try {
    const executable = resolveDotnetExecutable()
    const child = spawn(executable, process.argv.slice(2), {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
      windowsHide: true,
    })

    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.once(signal, () => {
        if (!child.killed) child.kill(signal)
      })
    }

    child.once('error', (error) => {
      console.error(`Failed to start ${executable}: ${error.message}`)
      process.exitCode = 1
    })
    child.once('exit', (code) => {
      process.exitCode = code ?? 1
    })
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
