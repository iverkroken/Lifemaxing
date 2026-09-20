let sessionCheck
let generation = 0

export function sessionGeneration() { return generation }
export function invalidateSessionRequests() { generation += 1 }

export function checkSession(operation) {
  const check = Promise.resolve().then(operation)
  sessionCheck = check
  const clear = () => { if (sessionCheck === check) sessionCheck = undefined }
  check.then(clear, clear)
  return check
}

export async function waitForSessionCheck() {
  while (sessionCheck) await sessionCheck
}

export function notifySessionChange() {
  invalidateSessionRequests()
  if (typeof BroadcastChannel === 'undefined') return
  const channel = new BroadcastChannel('lifemaxing.session')
  // No identity, credentials or private data leave this tab.
  channel.postMessage('changed')
  channel.close()
}

export function watchSessionChanges(recheck) {
  const visible = () => { if (document.visibilityState === 'visible') recheck() }
  window.addEventListener('focus', visible)
  document.addEventListener('visibilitychange', visible)
  const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('lifemaxing.session')
  if (channel) channel.onmessage = event => { if (event.data === 'changed') recheck() }
  return () => {
    window.removeEventListener('focus', visible)
    document.removeEventListener('visibilitychange', visible)
    channel?.close()
  }
}
