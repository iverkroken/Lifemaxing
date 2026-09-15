async function navigateTo(page, label) {
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.getByRole('dialog', { name: 'LIFEMAXING', exact: true }).getByRole('link', { name: label, exact: true }).click()
}
async function captureTask(page) {
  const contextual = page.getByRole('button', { name: /^(Add|Capture) a task$/ }).first()
  // Wait for the lazy route's contextual action instead of choosing Search before it mounts.
  if (['/today', '/tasks', '/inbox'].includes(new URL(page.url()).pathname)) { await contextual.click(); return }
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Search', exact: true })
  await dialog.getByRole('button', { name: /Create a task/ }).click()
}
module.exports = { navigateTo, captureTask }
