export function getUnlockText(unlockLevel = 1) {
  return `Unlocks at Level ${unlockLevel}`
}

export function normalizeDraftName(name = "", fallbackName = "Loadout") {
  const trimmed = String(name || "").trim().replace(/\s+/g, " ").slice(0, 24)
  return trimmed || fallbackName
}

export function formatSignedPercent(multiplier = 1) {
  const delta = Math.round((Number(multiplier) - 1) * 100)
  if (delta === 0) return "No score change"
  return `${delta > 0 ? "+" : ""}${delta}% score`
}

export function formatSignedNumber(value = 0, digits = 0) {
  const normalizedValue = Number(value) || 0
  return `${normalizedValue > 0 ? "+" : ""}${normalizedValue.toFixed(digits)}`
}

export function buildCommittedNameResult(loadouts = [], activeLoadout = null, nameDraft = "") {
  const nextName = normalizeDraftName(nameDraft, activeLoadout?.name || "Loadout")

  if (!activeLoadout || nextName === activeLoadout.name) {
    return { nextSavedLoadouts: loadouts, nextName, didChange: false }
  }

  return {
    nextSavedLoadouts: loadouts.map((loadout) => (
      loadout.id === activeLoadout.id ? { ...loadout, name: nextName } : loadout
    )),
    nextName,
    didChange: true,
  }
}

export function getModuleExactChips(module = null) {
  const effects = module?.effects ?? {}
  const chips = []

  if (effects.initialButtonSize) chips.push(`Start size ${formatSignedNumber(effects.initialButtonSize)}`)
  if (effects.minButtonSize) chips.push(`Min size ${formatSignedNumber(effects.minButtonSize)}`)
  if (effects.shrinkFactor) chips.push(`Shrink ${formatSignedNumber(effects.shrinkFactor, 2)}`)
  if (effects.comboStep) chips.push(`Combo step ${formatSignedNumber(effects.comboStep)}`)
  if (effects.missPenalty) chips.push(`Miss penalty ${formatSignedNumber(effects.missPenalty)}`)
  if (effects.scoreMultiplier) chips.push(formatSignedPercent(effects.scoreMultiplier))
  if (effects.powerupAwardMultiplier) {
    chips.push(`Charge rate x${Number(effects.powerupAwardMultiplier).toFixed(2)}`)
  }
  if (effects.startingPowerupCharges) chips.push(`Start +${effects.startingPowerupCharges} charge`)

  return chips.length ? chips : ["No exact stat changes"]
}

export function getPowerupExactChips(powerup = null, adjustedAwardEvery = 0) {
  if (!powerup) return ["Choose a power to see the exact behavior."]

  const cadenceChip = `Charge every ${adjustedAwardEvery || powerup.awardEvery} streak`

  if (powerup.effectType === "time_boost") return ["+2 seconds in timed rounds", cadenceChip]
  if (powerup.effectType === "size_boost") return ["+10 current size", "Stops at round start size", cadenceChip]
  if (powerup.effectType === "freeze_movement") return ["Freeze movement for 1 second", cadenceChip]
  if (powerup.effectType === "magnet_center") {
    return ["Snap target to center", "+6 size and 0.4s freeze", cadenceChip]
  }
  if (powerup.effectType === "combo_surge") {
    return ["Next 4 hits score as streak +4", "Real streak stays unchanged", cadenceChip]
  }
  if (powerup.effectType === "guard_charge") {
    return ["Next miss within 8 seconds is ignored", "Guard is consumed on miss", cadenceChip]
  }

  return [cadenceChip]
}

export function getStepSummary(stepId, activeLoadout, activePresentation, selectedMode) {
  if (stepId === "slot") return activeLoadout?.name || "Saved build"
  if (stepId === "passives") {
    return activePresentation?.moduleStack?.map((module) => module.label).join(" / ") || "3 passive systems"
  }
  if (stepId === "hotbar") {
    return activePresentation?.powerSlots?.map((powerSlot) => `${powerSlot.slotKey}: ${powerSlot.label}`).join(" / ") || "3 hotbar tools"
  }

  return selectedMode?.label ? `${selectedMode.label} preview` : "Current mode preview"
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function measureSpotlightRect(shellElement, targetElement) {
  if (!shellElement || !targetElement) return null

  const shellRect = shellElement.getBoundingClientRect()
  const targetRect = targetElement.getBoundingClientRect()
  const padding = 14
  const left = clamp(targetRect.left - shellRect.left - padding, 8, shellRect.width - 8)
  const top = clamp(targetRect.top - shellRect.top - padding, 8, shellRect.height - 8)
  const right = clamp(targetRect.right - shellRect.left + padding, 8, shellRect.width - 8)
  const bottom = clamp(targetRect.bottom - shellRect.top + padding, 8, shellRect.height - 8)

  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  }
}
