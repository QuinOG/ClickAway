export const PROGRESS_INTENT_FIELDS = new Set([
  "savedLoadouts",
  "activeLoadoutId",
  "buildWalkthrough",
  "selectedModeId",
])

export function pickProgressIntent(payload = {}) {
  return Object.fromEntries(
    Object.entries(payload).filter(([key, value]) => (
      PROGRESS_INTENT_FIELDS.has(key) && value !== undefined
    ))
  )
}
