// Contextual first-touch tips (Phase 12): a one-line callout shown the first
// time a player does each of these things, never again after. This is local
// UX polish only — unlike buildWalkthrough.status it never reaches the
// server, so it resets per-browser instead of following the account.
export const ARMORY_FIRST_TOUCH_TIPS_STORAGE_KEY = "clickaway.armory-first-touch-tips.v1"

export const FIRST_TOUCH_TIP_IDS = Object.freeze([
  "baySwitch",
  "lockedPart",
  "compare",
  "blueprint",
])

export const FIRST_TOUCH_TIP_MESSAGES = Object.freeze({
  baySwitch: "This bay is now your active build — Ready always launches whichever bay is active here.",
  lockedPart: "Locked parts unlock as you level up. Everything you already have stays fully usable.",
  compare: "Ghost another bay against your active build, or read one build across all three modes.",
  blueprint: "Blueprint codes are a compact copy of a build — paste one in to try someone else's bay.",
})

export function normalizeFirstTouchTipIds(value) {
  if (!Array.isArray(value)) return []
  return value.filter((id) => FIRST_TOUCH_TIP_IDS.includes(id))
}

export function loadSeenFirstTouchTipIds(storage) {
  try {
    const resolvedStorage = storage ?? globalThis.localStorage
    if (!resolvedStorage?.getItem) return []
    const storedValue = resolvedStorage.getItem(ARMORY_FIRST_TOUCH_TIPS_STORAGE_KEY)
    if (!storedValue) return []
    return normalizeFirstTouchTipIds(JSON.parse(storedValue))
  } catch {
    return []
  }
}

export function saveSeenFirstTouchTipIds(ids, storage) {
  try {
    const resolvedStorage = storage ?? globalThis.localStorage
    if (!resolvedStorage?.setItem) return
    resolvedStorage.setItem(
      ARMORY_FIRST_TOUCH_TIPS_STORAGE_KEY,
      JSON.stringify(normalizeFirstTouchTipIds(ids))
    )
  } catch {
    // Best-effort only — a blocked localStorage just means tips repeat.
  }
}
