const LOADOUT_ID_LIST = ["loadout_1", "loadout_2", "loadout_3"]
const DEFAULT_ACTIVE_LOADOUT_ID = LOADOUT_ID_LIST[0]

const MODULE_SLOT_DEFINITIONS = [
  {
    id: "tempoCore",
    key: "tempoCoreId",
    label: "Tempo Core",
    description: "Controls target size, shrink pace, and score pressure.",
    defaultModuleId: "tempo_balanced",
  },
  {
    id: "streakLens",
    key: "streakLensId",
    label: "Streak Lens",
    description: "Shifts combo pacing and miss-risk profile.",
    defaultModuleId: "streak_balanced",
  },
  {
    id: "powerRig",
    key: "powerRigId",
    label: "Power Rig",
    description: "Changes charge timing and utility cadence.",
    defaultModuleId: "power_balanced",
  },
]

const PASSIVE_MODULES = [
  {
    id: "tempo_balanced",
    slotId: "tempoCore",
    label: "Balanced Tempo",
    unlockLevel: 1,
    description: "Neutral target pacing with no stat changes.",
    effects: {},
  },
  {
    id: "tempo_anchor",
    slotId: "tempoCore",
    label: "Anchor",
    unlockLevel: 1,
    description: "Larger targets and slower shrink, but weaker score output.",
    effects: {
      initialButtonSize: 12,
      minButtonSize: 4,
      shrinkFactor: 0.02,
      scoreMultiplier: 0.88,
    },
  },
  {
    id: "tempo_overdrive",
    slotId: "tempoCore",
    label: "Overdrive",
    unlockLevel: 1,
    description: "Smaller targets and faster pressure for higher score output.",
    effects: {
      initialButtonSize: -8,
      minButtonSize: -2,
      shrinkFactor: -0.02,
      scoreMultiplier: 1.18,
    },
  },
  {
    id: "streak_balanced",
    slotId: "streakLens",
    label: "Balanced Streak",
    unlockLevel: 1,
    description: "Standard combo pacing.",
    effects: {},
  },
  {
    id: "streak_momentum",
    slotId: "streakLens",
    label: "Momentum",
    unlockLevel: 1,
    description: "Faster combo growth, but misses hit harder.",
    effects: {
      comboStep: -1,
      missPenalty: 2,
    },
  },
  {
    id: "streak_stabilizer",
    slotId: "streakLens",
    label: "Stabilizer",
    unlockLevel: 1,
    description: "Slower combo growth in exchange for safer misses.",
    effects: {
      comboStep: 2,
      missPenalty: -1,
      scoreMultiplier: 0.92,
    },
  },
  {
    id: "power_balanced",
    slotId: "powerRig",
    label: "Balanced Rig",
    unlockLevel: 1,
    description: "Default charge tempo.",
    effects: {},
  },
  {
    id: "power_surge",
    slotId: "powerRig",
    label: "Surge Rig",
    unlockLevel: 1,
    description: "Charges arrive faster, but combo growth slows slightly.",
    effects: {
      powerupAwardMultiplier: 0.8,
      comboStep: 1,
    },
  },
  {
    id: "power_reserve",
    slotId: "powerRig",
    label: "Reserve Rig",
    unlockLevel: 1,
    description: "Start with one charge per equipped power, but future charges come slower.",
    effects: {
      startingPowerupCharges: 1,
      powerupAwardMultiplier: 1.25,
      missPenalty: 1,
    },
  },
]

const BUILDCRAFT_POWERUPS = [
  {
    id: "time_boost",
    label: "Time +2s",
    unlockLevel: 1,
    awardEvery: 5,
    description: "Adds 2 seconds to the timer in timed rounds.",
    effectType: "time_boost",
  },
  {
    id: "size_boost",
    label: "Grow +10",
    unlockLevel: 1,
    awardEvery: 8,
    description: "Increase the current target size by 10, capped at the round start size.",
    effectType: "size_boost",
  },
  {
    id: "freeze_movement",
    label: "Freeze 1s",
    unlockLevel: 1,
    awardEvery: 12,
    description: "Freeze movement and reposition for 1 second.",
    effectType: "freeze_movement",
  },
  {
    id: "magnet_center",
    label: "Magnet Center",
    unlockLevel: 4,
    awardEvery: 9,
    description: "Pull the target to center, add 6 size, and freeze movement briefly.",
    effectType: "magnet_center",
  },
  {
    id: "combo_surge",
    label: "Combo Surge",
    unlockLevel: 7,
    awardEvery: 14,
    description: "Your next 4 hits score as if your streak were 4 higher.",
    effectType: "combo_surge",
  },
  {
    id: "guard_charge",
    label: "Guard Charge",
    unlockLevel: 11,
    awardEvery: 16,
    description: "The next miss within 8 seconds keeps your streak and prevents miss penalty.",
    effectType: "guard_charge",
  },
]

const STARTER_LOADOUTS = [
  {
    id: "loadout_1",
    name: "All-Rounder",
    moduleIds: {
      tempoCoreId: "tempo_balanced",
      streakLensId: "streak_balanced",
      powerRigId: "power_balanced",
    },
    powerupIds: ["time_boost", "size_boost", "freeze_movement"],
  },
  {
    id: "loadout_2",
    name: "Safe Hands",
    moduleIds: {
      tempoCoreId: "tempo_anchor",
      streakLensId: "streak_stabilizer",
      powerRigId: "power_balanced",
    },
    powerupIds: ["size_boost", "freeze_movement", "time_boost"],
  },
  {
    id: "loadout_3",
    name: "Glass Cannon",
    moduleIds: {
      tempoCoreId: "tempo_overdrive",
      streakLensId: "streak_momentum",
      powerRigId: "power_surge",
    },
    powerupIds: ["time_boost", "size_boost", "freeze_movement"],
  },
]

const PASSIVE_MODULES_BY_ID = Object.fromEntries(
  PASSIVE_MODULES.map((module) => [module.id, module])
)
const POWERUPS_BY_ID = Object.fromEntries(
  BUILDCRAFT_POWERUPS.map((powerup) => [powerup.id, powerup])
)
const LOADOUT_ID_SET = new Set(LOADOUT_ID_LIST)

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function normalizeInteger(value, fallback = 0) {
  const normalizedValue = Number(value)
  if (!Number.isFinite(normalizedValue)) {
    return fallback
  }

  return Math.floor(normalizedValue)
}

function normalizeLoadoutName(name = "", fallbackName = "Loadout") {
  const normalizedName = String(name || "").trim().replace(/\s+/g, " ")
  if (!normalizedName) {
    return fallbackName
  }

  return normalizedName.slice(0, 24)
}

function isUnlocked(level = 1, unlockLevel = 1) {
  return Math.max(1, normalizeInteger(level, 1)) >= Math.max(1, normalizeInteger(unlockLevel, 1))
}

function getFallbackLoadoutByIndex(index = 0) {
  return STARTER_LOADOUTS[index] ?? STARTER_LOADOUTS[0]
}

function normalizeModuleIds(level = 1, moduleIds = {}, fallbackLoadout) {
  const nextModuleIds = {}

  MODULE_SLOT_DEFINITIONS.forEach((slot) => {
    const requestedId = String(moduleIds?.[slot.key] || "")
    const requestedModule = PASSIVE_MODULES_BY_ID[requestedId]
    const fallbackId = fallbackLoadout.moduleIds?.[slot.key] || slot.defaultModuleId
    const fallbackModule = PASSIVE_MODULES_BY_ID[fallbackId]

    if (
      requestedModule &&
      requestedModule.slotId === slot.id &&
      isUnlocked(level, requestedModule.unlockLevel)
    ) {
      nextModuleIds[slot.key] = requestedModule.id
      return
    }

    if (
      fallbackModule &&
      fallbackModule.slotId === slot.id &&
      isUnlocked(level, fallbackModule.unlockLevel)
    ) {
      nextModuleIds[slot.key] = fallbackModule.id
      return
    }

    nextModuleIds[slot.key] = slot.defaultModuleId
  })

  return nextModuleIds
}

function fillPowerupIds(level = 1, requestedIds = [], fallbackIds = []) {
  const nextPowerupIds = []
  const usedIds = new Set()
  const unlockedPowerupIds = BUILDCRAFT_POWERUPS
    .filter((powerup) => isUnlocked(level, powerup.unlockLevel))
    .map((powerup) => powerup.id)

  const candidateIds = [
    ...(Array.isArray(requestedIds) ? requestedIds : []),
    ...(Array.isArray(fallbackIds) ? fallbackIds : []),
    ...unlockedPowerupIds,
  ]

  candidateIds.forEach((candidateId) => {
    if (nextPowerupIds.length >= 3) return

    const normalizedId = String(candidateId || "")
    const powerup = POWERUPS_BY_ID[normalizedId]
    if (!powerup || usedIds.has(normalizedId) || !isUnlocked(level, powerup.unlockLevel)) {
      return
    }

    usedIds.add(normalizedId)
    nextPowerupIds.push(normalizedId)
  })

  return nextPowerupIds.slice(0, 3)
}

export function getPassiveModuleById(moduleId) {
  return PASSIVE_MODULES_BY_ID[moduleId] ?? null
}

export function getPowerupById(powerupId) {
  return POWERUPS_BY_ID[powerupId] ?? null
}

export function getLoadoutById(loadouts = [], loadoutId = DEFAULT_ACTIVE_LOADOUT_ID) {
  const loadoutList = Array.isArray(loadouts) ? loadouts : []
  return loadoutList.find((loadout) => loadout.id === loadoutId) ?? loadoutList[0] ?? null
}

export function buildLoadoutSnapshot(loadout = {}) {
  return {
    loadoutId: String(loadout.id || loadout.loadoutId || DEFAULT_ACTIVE_LOADOUT_ID),
    loadoutName: normalizeLoadoutName(loadout.name || loadout.loadoutName, "All-Rounder"),
    moduleIds: {
      tempoCoreId: String(loadout.moduleIds?.tempoCoreId || "tempo_balanced"),
      streakLensId: String(loadout.moduleIds?.streakLensId || "streak_balanced"),
      powerRigId: String(loadout.moduleIds?.powerRigId || "power_balanced"),
    },
    powerupIds: fillPowerupIds(999, loadout.powerupIds, STARTER_LOADOUTS[0].powerupIds),
  }
}

export function normalizeLoadoutState(level = 1, savedLoadouts = [], activeLoadoutId = DEFAULT_ACTIVE_LOADOUT_ID) {
  const providedLoadouts = Array.isArray(savedLoadouts) ? savedLoadouts : []
  const loadoutsById = Object.fromEntries(
    providedLoadouts
      .filter((loadout) => loadout?.id)
      .map((loadout) => [String(loadout.id), loadout])
  )

  const normalizedLoadouts = LOADOUT_ID_LIST.map((loadoutId, index) => {
    const fallbackLoadout = getFallbackLoadoutByIndex(index)
    const providedLoadout = loadoutsById[loadoutId]
      ?? providedLoadouts[index]
      ?? fallbackLoadout

    return {
      id: loadoutId,
      name: normalizeLoadoutName(providedLoadout?.name, fallbackLoadout.name),
      moduleIds: normalizeModuleIds(level, providedLoadout?.moduleIds, fallbackLoadout),
      powerupIds: fillPowerupIds(level, providedLoadout?.powerupIds, fallbackLoadout.powerupIds),
    }
  })

  const resolvedActiveLoadoutId = LOADOUT_ID_SET.has(String(activeLoadoutId || ""))
    ? String(activeLoadoutId)
    : DEFAULT_ACTIVE_LOADOUT_ID
  const activeLoadout = getLoadoutById(normalizedLoadouts, resolvedActiveLoadoutId)

  return {
    savedLoadouts: normalizedLoadouts,
    activeLoadoutId: activeLoadout?.id ?? DEFAULT_ACTIVE_LOADOUT_ID,
    activeLoadout: activeLoadout ?? normalizedLoadouts[0],
  }
}

export function buildRoundRules(mode = {}, loadout = {}) {
  const snapshot = buildLoadoutSnapshot(loadout)
  const modules = MODULE_SLOT_DEFINITIONS
    .map((slot) => getPassiveModuleById(snapshot.moduleIds[slot.key]))
    .filter(Boolean)
  const scoreMultiplier = modules.reduce(
    (multiplier, module) => multiplier * (module.effects?.scoreMultiplier ?? 1),
    1
  )
  const powerupAwardMultiplier = modules.reduce(
    (multiplier, module) => multiplier * (module.effects?.powerupAwardMultiplier ?? 1),
    1
  )
  const startingPowerupCharges = modules.reduce(
    (chargeCount, module) => chargeCount + (module.effects?.startingPowerupCharges ?? 0),
    0
  )

  const nextMinButtonSize = clamp(
    normalizeInteger(mode.minButtonSize, 10)
      + modules.reduce((size, module) => size + (module.effects?.minButtonSize ?? 0), 0),
    8,
    999
  )
  const nextInitialButtonSize = clamp(
    normalizeInteger(mode.initialButtonSize, 100)
      + modules.reduce((size, module) => size + (module.effects?.initialButtonSize ?? 0), 0),
    nextMinButtonSize + 4,
    999
  )
  const nextShrinkFactor = clamp(
    Number(mode.shrinkFactor ?? 0.97)
      + modules.reduce((value, module) => value + (module.effects?.shrinkFactor ?? 0), 0),
    0.88,
    0.99
  )
  const nextComboStep = Math.max(
    2,
    normalizeInteger(mode.comboStep, 5)
      + modules.reduce((value, module) => value + (module.effects?.comboStep ?? 0), 0)
  )
  const nextMissPenalty = Math.max(
    0,
    normalizeInteger(mode.missPenalty, 0)
      + modules.reduce((value, module) => value + (module.effects?.missPenalty ?? 0), 0)
  )

  const equippedPowerups = snapshot.powerupIds
    .map((powerupId, index) => {
      const powerup = getPowerupById(powerupId)
      if (!powerup) return null

      return {
        ...powerup,
        slotIndex: index,
        slotKey: String(index + 1),
        awardEvery: Math.max(1, Math.round(powerup.awardEvery * powerupAwardMultiplier)),
      }
    })
    .filter(Boolean)

  return {
    ...mode,
    initialButtonSize: nextInitialButtonSize,
    minButtonSize: nextMinButtonSize,
    shrinkFactor: nextShrinkFactor,
    comboStep: nextComboStep,
    missPenalty: nextMissPenalty,
    scoreMultiplier,
    powerupAwardMultiplier,
    startingPowerupCharges,
    equippedPowerups,
    loadoutSnapshot: snapshot,
  }
}

export const LOADOUT_IDS = LOADOUT_ID_LIST
export const ACTIVE_LOADOUT_ID_DEFAULT = DEFAULT_ACTIVE_LOADOUT_ID
export const MODULE_SLOTS = MODULE_SLOT_DEFINITIONS
export const PASSIVE_LOADOUT_MODULES = PASSIVE_MODULES
export const LOADOUT_POWERUPS = BUILDCRAFT_POWERUPS
export const DEFAULT_SAVED_LOADOUTS = STARTER_LOADOUTS.map((loadout) => ({
  id: loadout.id,
  name: loadout.name,
  moduleIds: { ...loadout.moduleIds },
  powerupIds: [...loadout.powerupIds],
}))
