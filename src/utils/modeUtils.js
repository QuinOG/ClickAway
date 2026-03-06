import { DIFFICULTY_IDS, PROGRESSION_MODE } from "../constants/difficultyConfig.js"

const MODE_LABELS_BY_ID = {
  [DIFFICULTY_IDS.EASY]: "Practice",
  [DIFFICULTY_IDS.NORMAL]: "Casual",
  [DIFFICULTY_IDS.HARD]: "Ranked",
}

const MODE_LABELS_BY_PROGRESSION = {
  [PROGRESSION_MODE.PRACTICE]: "Practice",
  [PROGRESSION_MODE.NON_RANKED]: "Casual",
  [PROGRESSION_MODE.RANKED]: "Ranked",
}

function resolveModeId(entry = {}) {
  return entry.modeId ?? entry.difficultyId ?? entry.id ?? ""
}

export function getModeLabel({
  progressionMode = "",
  modeId = "",
  fallback = "Unknown",
} = {}) {
  if (MODE_LABELS_BY_PROGRESSION[progressionMode]) {
    return MODE_LABELS_BY_PROGRESSION[progressionMode]
  }

  if (MODE_LABELS_BY_ID[modeId]) {
    return MODE_LABELS_BY_ID[modeId]
  }

  return fallback
}

export function getModeLabelFromHistoryEntry(entry = {}) {
  return getModeLabel({
    progressionMode: entry.progressionMode ?? "",
    modeId: resolveModeId(entry),
    fallback: "Unknown",
  })
}

export function getModeLabelFromModeConfig(mode = {}) {
  return getModeLabel({
    modeId: mode.id ?? "",
    fallback: mode.label ?? "Unknown",
  })
}

export function isRankedModeEntry(entry = {}) {
  const modeId = resolveModeId(entry)
  return entry.progressionMode === PROGRESSION_MODE.RANKED
    || modeId === DIFFICULTY_IDS.HARD
}
