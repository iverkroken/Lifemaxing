export function goalProgress(goal, entry) {
  if (goal.targetValue == null || entry?.value == null) return null
  const distance = goal.targetValue - goal.baselineValue
  if (!distance) return null
  return Math.round((entry.value - goal.baselineValue) / distance * 100)
}
