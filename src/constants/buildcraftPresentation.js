import {
  MODULE_SLOTS,
  buildRoundRules,
  getPassiveModuleById,
} from "./buildcraft.js"

const MODULE_CARD_COPY_BY_ID = {
  tempo_balanced: {
    youGet: "Default size and shrink pressure.",
    youGiveUp: "No specialist edge.",
    bestIn: "Any mode when you want neutral feel.",
  },
  tempo_anchor: {
    youGet: "Bigger targets and slower shrink.",
    youGiveUp: "Lower raw score output.",
    bestIn: "Warmups, recovery runs, and safer Ranked starts.",
  },
  tempo_overdrive: {
    youGet: "More score pressure and faster pace.",
    youGiveUp: "Smaller targets and tighter aim.",
    bestIn: "PB pushes when your aim is already clean.",
  },
  streak_balanced: {
    youGet: "Default combo pacing.",
    youGiveUp: "No combo or safety bias.",
    bestIn: "Any mode when you want familiar rhythm.",
  },
  streak_momentum: {
    youGet: "Faster combo ramp.",
    youGiveUp: "Misses punish harder.",
    bestIn: "Aggressive score-chasing builds.",
  },
  streak_stabilizer: {
    youGet: "Safer misses and steadier recovery.",
    youGiveUp: "Slower combo growth.",
    bestIn: "Consistency-focused runs and streak protection.",
  },
  power_balanced: {
    youGet: "Default charge timing.",
    youGiveUp: "No early spike or reserve edge.",
    bestIn: "Any mode when you want simple timing.",
  },
  power_surge: {
    youGet: "Faster power charges.",
    youGiveUp: "Slightly slower combo ramp.",
    bestIn: "Utility loops and clutch-heavy play.",
  },
  power_reserve: {
    youGet: "Start the round with charges ready.",
    youGiveUp: "Slower future charges and harsher misses.",
    bestIn: "Burst openings and recovery-first plans.",
  },
}

const POWERUP_CARD_COPY_BY_ID = {
  time_boost: {
    youGet: "A timed-round bailout worth 2 extra seconds.",
    youGiveUp: "No direct score or aim boost.",
    bestIn: "Casual and Ranked timer saves.",
  },
  size_boost: {
    youGet: "Immediate hitbox recovery.",
    youGiveUp: "No score spike on its own.",
    bestIn: "Shrink-heavy moments and aim recovery.",
  },
  freeze_movement: {
    youGet: "A full second of calm aim.",
    youGiveUp: "Longer wait than the basic tools.",
    bestIn: "Panic resets and streak protection.",
  },
  magnet_center: {
    youGet: "Center reset plus a size bump.",
    youGiveUp: "No direct combo spike.",
    bestIn: "Bad target positions and recovery turns.",
  },
  combo_surge: {
    youGet: "Four hits of boosted scoring.",
    youGiveUp: "No safety if you miss.",
    bestIn: "Personal best pushes and clean streak runs.",
  },
  guard_charge: {
    youGet: "One streak-saving miss shield.",
    youGiveUp: "The slowest charge cadence.",
    bestIn: "Ranked stabilizing and late-round survival.",
  },
}

function formatSignedPercent(multiplier = 1) {
  const delta = Math.round((multiplier - 1) * 100)
  if (delta === 0) return "0%"
  return `${delta > 0 ? "+" : ""}${delta}%`
}

function getAimWindowValue(baseMode, roundRules) {
  const delta = roundRules.initialButtonSize - baseMode.initialButtonSize

  if (delta >= 10) return "Forgiving"
  if (delta >= 4) return "Slightly larger"
  if (delta <= -6) return "Tight"
  return "Standard"
}

function getShrinkValue(baseMode, roundRules) {
  const delta = roundRules.shrinkFactor - baseMode.shrinkFactor

  if (delta >= 0.015) return "Slower"
  if (delta <= -0.015) return "Faster"
  return "Standard"
}

function getComboValue(baseMode, roundRules) {
  const delta = roundRules.comboStep - baseMode.comboStep

  if (delta <= -1) return "Fast ramp"
  if (delta >= 1) return "Slow ramp"
  return "Standard"
}

function getMissValue(baseMode, roundRules) {
  const delta = roundRules.missPenalty - baseMode.missPenalty

  if (delta <= -1) return "Forgiving"
  if (delta >= 1) return "Punishing"
  return "Standard"
}

function getPowerTempoValue(roundRules) {
  if (roundRules.startingPowerupCharges > 0) {
    return "Starts charged"
  }

  if (roundRules.powerupAwardMultiplier <= 0.85) return "Fast charge"
  if (roundRules.powerupAwardMultiplier >= 1.15) return "Slow charge"
  return "Standard"
}

function buildCueList(summaryStats = []) {
  const cueMap = {
    "Aim Window": {
      Forgiving: "forgiving aim",
      "Slightly larger": "larger aim window",
      Tight: "tight aim window",
      Standard: "standard aim window",
    },
    "Shrink Pace": {
      Slower: "slower shrink",
      Faster: "faster shrink",
      Standard: "standard shrink",
    },
    "Combo Ramp": {
      "Fast ramp": "fast combo ramp",
      "Slow ramp": "slow combo ramp",
      Standard: "standard combo ramp",
    },
    "Miss Cost": {
      Forgiving: "forgiving misses",
      Punishing: "punishing misses",
      Standard: "standard miss cost",
    },
    "Power Tempo": {
      "Starts charged": "starts charged",
      "Fast charge": "fast charges",
      "Slow charge": "slow charges",
      Standard: "standard charges",
    },
  }

  return summaryStats
    .map((stat) => cueMap[stat.label]?.[stat.value] ?? String(stat.value || "").toLowerCase())
    .filter(Boolean)
}

function getDifficultyTag({ controlSignals, pressureSignals, utilitySignals }) {
  if (pressureSignals >= 3) return "High Risk"
  if (controlSignals >= 2 && pressureSignals === 0) return "Safe"
  if (utilitySignals >= 2 && pressureSignals <= 1) return "Clutch"
  return "Balanced"
}

function getBestFor(identityLabel = "Balanced", modeLabel = "this mode") {
  if (identityLabel === "Control") {
    return modeLabel === "Ranked"
      ? "Best for stabilizing high-pressure Ranked rounds."
      : "Best for clean streaks and low-stress reps."
  }

  if (identityLabel === "Pressure") {
    return modeLabel === "Ranked"
      ? "Best for confident aim and fast score swings."
      : "Best for PB pushes and aggressive sessions."
  }

  if (identityLabel === "Utility") {
    return "Best for clutch recoveries and power-driven saves."
  }

  return "Best for learning the mode without surprises."
}

export function getModuleOptionPresentation(moduleId = "") {
  return MODULE_CARD_COPY_BY_ID[moduleId] ?? {
    youGet: "A small shift to how the round feels.",
    youGiveUp: "Another specialist option.",
    bestIn: "General play.",
  }
}

export function getPowerupOptionPresentation(powerupId = "") {
  return POWERUP_CARD_COPY_BY_ID[powerupId] ?? {
    youGet: "A situational round tool.",
    youGiveUp: "Another hotbar slot option.",
    bestIn: "General play.",
  }
}

export function buildLoadoutPresentation(mode = {}, loadout = {}) {
  const baseMode = mode ?? {}
  const roundRules = buildRoundRules(baseMode, loadout)
  const controlSignals = [
    roundRules.initialButtonSize >= baseMode.initialButtonSize + 8,
    roundRules.shrinkFactor >= baseMode.shrinkFactor + 0.015,
    roundRules.missPenalty <= baseMode.missPenalty - 1,
  ].filter(Boolean).length
  const pressureSignals = [
    roundRules.initialButtonSize <= baseMode.initialButtonSize - 6,
    roundRules.shrinkFactor <= baseMode.shrinkFactor - 0.015,
    roundRules.comboStep <= baseMode.comboStep - 1,
    roundRules.scoreMultiplier >= 1.1,
    roundRules.missPenalty >= baseMode.missPenalty + 1,
  ].filter(Boolean).length
  const utilitySignals = [
    roundRules.startingPowerupCharges > 0,
    roundRules.powerupAwardMultiplier <= 0.85,
  ].filter(Boolean).length

  let identity = {
    label: "Balanced",
    description: "Plays close to the mode defaults with no huge swing.",
  }

  if (controlSignals >= pressureSignals && controlSignals >= utilitySignals && controlSignals > 0) {
    identity = {
      label: "Control",
      description: "Built to stay stable while you learn the pattern.",
    }
  } else if (pressureSignals > controlSignals && pressureSignals >= utilitySignals) {
    identity = {
      label: "Pressure",
      description: "Pushes score harder, but asks for cleaner aim.",
    }
  } else if (utilitySignals > 0) {
    identity = {
      label: "Utility",
      description: "Leans on power timing to bail out or spike runs.",
    }
  }

  const strengths = []
  const tradeoffs = []

  if (roundRules.initialButtonSize >= baseMode.initialButtonSize + 8) strengths.push("Bigger targets")
  if (roundRules.shrinkFactor >= baseMode.shrinkFactor + 0.015) strengths.push("Slower shrink")
  if (roundRules.comboStep <= baseMode.comboStep - 1) strengths.push("Faster combo")
  if (roundRules.missPenalty <= baseMode.missPenalty - 1) strengths.push("Safer misses")
  if (roundRules.scoreMultiplier >= 1.1) strengths.push("Higher score ceiling")
  if (roundRules.powerupAwardMultiplier <= 0.85) strengths.push("Faster charges")
  if (roundRules.startingPowerupCharges > 0) strengths.push("Starts charged")

  if (roundRules.initialButtonSize <= baseMode.initialButtonSize - 6) tradeoffs.push("Smaller targets")
  if (roundRules.shrinkFactor <= baseMode.shrinkFactor - 0.015) tradeoffs.push("Faster shrink")
  if (roundRules.comboStep >= baseMode.comboStep + 1) tradeoffs.push("Slower combo")
  if (roundRules.missPenalty >= baseMode.missPenalty + 1) tradeoffs.push("Punishing misses")
  if (roundRules.scoreMultiplier <= 0.95) tradeoffs.push("Lower raw score")
  if (roundRules.powerupAwardMultiplier >= 1.15) tradeoffs.push("Slower charges")

  if (!strengths.length) strengths.push("No major stat swing")
  if (!tradeoffs.length) tradeoffs.push("Few sharp downsides")

  const summaryStats = [
    { label: "Aim Window", value: getAimWindowValue(baseMode, roundRules) },
    { label: "Shrink Pace", value: getShrinkValue(baseMode, roundRules) },
    { label: "Combo Ramp", value: getComboValue(baseMode, roundRules) },
    { label: "Miss Cost", value: getMissValue(baseMode, roundRules) },
    { label: "Power Tempo", value: getPowerTempoValue(roundRules) },
  ]
  const cueList = buildCueList(summaryStats)
  const difficultyTag = getDifficultyTag({
    controlSignals,
    pressureSignals,
    utilitySignals,
  })
  const bestFor = getBestFor(identity.label, baseMode.label || "this mode")
  const powerCadence = getPowerTempoValue(roundRules)
  const titleLine = difficultyTag === identity.label
    ? identity.label
    : `${identity.label} • ${difficultyTag}`
  const powerSlots = roundRules.equippedPowerups.map((powerup) => ({
    id: powerup.id,
    label: powerup.label,
    slotKey: powerup.slotKey,
    awardEvery: powerup.awardEvery,
    cadenceLabel: `Every ${powerup.awardEvery} streak`,
    ...getPowerupOptionPresentation(powerup.id),
  }))
  const moduleStack = MODULE_SLOTS.map((slot) => {
    const module = getPassiveModuleById(roundRules.loadoutSnapshot.moduleIds[slot.key])

    return {
      slotId: slot.id,
      slotKey: slot.key,
      slotLabel: slot.label,
      moduleId: module?.id ?? "",
      label: module?.label ?? slot.label,
      unlockLevel: module?.unlockLevel ?? 1,
      ...getModuleOptionPresentation(module?.id),
    }
  })

  return {
    identity,
    glanceText: cueList.slice(0, 3).join(" • "),
    cueList,
    summaryStats,
    strengths: strengths.slice(0, 3),
    tradeoffs: tradeoffs.slice(0, 2),
    difficultyTag,
    bestFor,
    powerCadence,
    scoreDeltaLabel: formatSignedPercent(roundRules.scoreMultiplier ?? 1),
    roundRules,
    moduleStack,
    powerSlots,
    titleLine,
    tagLine: `${cueList.slice(0, 3).join(" • ")} • ${bestFor}`,
  }
}
