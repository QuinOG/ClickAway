import { calculateAccuracyPercent } from "./gameMath.js"
import { DIFFICULTY_IDS, PROGRESSION_MODE } from "../constants/gameModesConfig.js"

export const INITIAL_RANK_MMR = 0
export const UNRANKED_LABEL = "Unranked"
export const RANK_SYSTEM_VERSION = 4
export const PLACEMENT_MATCH_COUNT = 5
export const DEMOTION_PROTECTION_MATCHES = 2
export const RR_PER_DIVISION = 100

const LEGACY_BRONZE_MAX_MMR = 499
const LEGACY_SILVER_MAX_MMR = 1499
const LEGACY_GOLD_START_MMR = 1500
const LEGACY_GOLD_SCALE = 0.4
const DIVISION_LABELS = ["I", "II", "III"]
const TOP_RANK = {
  id: "deadeye",
  label: "Deadeye",
}
const RANK_IMAGE_BY_TONE_ID = {
  bronze: "/ranks/bronze.png",
  silver: "/ranks/silver.png",
  gold: "/ranks/gold.png",
  platinum: "/ranks/platinum.svg",
  diamond: "/ranks/diamond.svg",
  deadeye: "/ranks/deadeye.svg",
}

export const RANK_MAJOR_TIERS = [
  { id: "bronze", label: "Bronze" },
  { id: "silver", label: "Silver" },
  { id: "gold", label: "Gold" },
  { id: "platinum", label: "Platinum" },
  { id: "diamond", label: "Diamond" },
]

export const RANK_DIVISIONS = RANK_MAJOR_TIERS.flatMap((majorTier, tierIndex) => (
  DIVISION_LABELS.map((divisionLabel, divisionIndex) => {
    const order = (tierIndex * DIVISION_LABELS.length) + divisionIndex
    const minMmr = order * RR_PER_DIVISION

    return {
      id: `${majorTier.id}_${divisionIndex + 1}`,
      majorTierId: majorTier.id,
      majorTierLabel: majorTier.label,
      division: divisionIndex + 1,
      divisionLabel,
      order,
      minMmr,
      maxMmr: minMmr + RR_PER_DIVISION - 1,
      label: `${majorTier.label} ${divisionLabel}`,
      toneId: majorTier.id,
      isTopRank: false,
    }
  })
))

export const TOP_RANK_MIN_MMR = RANK_DIVISIONS.length * RR_PER_DIVISION
export const PLACEMENT_MAX_MMR = (
  RANK_DIVISIONS.find((division) => division.id === "gold_3")?.maxMmr ??
  (TOP_RANK_MIN_MMR - 1)
)
export const PLACEMENT_MATCH_SCORE_MAX = 20
const PLACEMENT_SCORE_POINT_BANDS = [
  { minValue: 120, points: 8 },
  { minValue: 95, points: 7 },
  { minValue: 75, points: 6 },
  { minValue: 60, points: 5 },
  { minValue: 45, points: 4 },
  { minValue: 32, points: 3 },
  { minValue: 20, points: 2 },
  { minValue: 12, points: 1 },
  { minValue: 0, points: 0 },
]
const PLACEMENT_ACCURACY_POINT_BANDS = [
  { minValue: 98, points: 6 },
  { minValue: 95, points: 5 },
  { minValue: 92, points: 4 },
  { minValue: 88, points: 3 },
  { minValue: 84, points: 2 },
  { minValue: 78, points: 1 },
  { minValue: 0, points: 0 },
]
const PLACEMENT_STREAK_POINT_BANDS = [
  { minValue: 24, points: 4 },
  { minValue: 18, points: 3 },
  { minValue: 12, points: 2 },
  { minValue: 8, points: 1 },
  { minValue: 0, points: 0 },
]
const PLACEMENT_MISS_POINT_BANDS = [
  { maxValue: 2, points: 2 },
  { maxValue: 5, points: 1 },
  { maxValue: Number.POSITIVE_INFINITY, points: 0 },
]
const PLACEMENT_RESULT_BANDS = [
  { minAverageScore: 18, divisionId: "gold_3" },
  { minAverageScore: 17, divisionId: "gold_2" },
  { minAverageScore: 15, divisionId: "gold_1" },
  { minAverageScore: 13, divisionId: "silver_3" },
  { minAverageScore: 11, divisionId: "silver_2" },
  { minAverageScore: 9, divisionId: "silver_1" },
  { minAverageScore: 7, divisionId: "bronze_3" },
  { minAverageScore: 5, divisionId: "bronze_2" },
  { minAverageScore: 0, divisionId: "bronze_1" },
]

function clampInteger(value, min, max) {
  const normalizedValue = Number(value)
  if (!Number.isFinite(normalizedValue)) return min

  return Math.max(min, Math.min(max, Math.round(normalizedValue)))
}

function clampNonNegative(value) {
  const normalizedValue = Number(value)
  if (!Number.isFinite(normalizedValue)) return 0

  return Math.max(0, normalizedValue)
}

function resolvePointsFromMinimumBands(value, bands = []) {
  const normalizedValue = Number(value)
  if (!Number.isFinite(normalizedValue)) {
    return bands[bands.length - 1]?.points ?? 0
  }

  return (
    bands.find((band) => normalizedValue >= band.minValue)?.points ??
    bands[bands.length - 1]?.points ??
    0
  )
}

function resolvePointsFromMaximumBands(value, bands = []) {
  const normalizedValue = Number(value)
  if (!Number.isFinite(normalizedValue)) {
    return bands[bands.length - 1]?.points ?? 0
  }

  return (
    bands.find((band) => normalizedValue <= band.maxValue)?.points ??
    bands[bands.length - 1]?.points ??
    0
  )
}

function mapRange(value, inputMin, inputMax, outputMin, outputMax) {
  if (inputMax <= inputMin) return outputMin

  const normalizedProgress = (value - inputMin) / (inputMax - inputMin)
  return outputMin + ((outputMax - outputMin) * normalizedProgress)
}

function getDivisionById(divisionId = "") {
  return RANK_DIVISIONS.find((division) => division.id === divisionId) ?? RANK_DIVISIONS[0]
}

function buildTopRankDefinition() {
  return {
    ...TOP_RANK,
    majorTierId: TOP_RANK.id,
    majorTierLabel: TOP_RANK.label,
    division: null,
    divisionLabel: "",
    order: RANK_DIVISIONS.length,
    minMmr: TOP_RANK_MIN_MMR,
    maxMmr: Number.POSITIVE_INFINITY,
    toneId: TOP_RANK.id,
    isTopRank: true,
  }
}

function buildVisibleRankProgress(rankDefinition, mmr) {
  const normalizedMmr = clampNonNegative(mmr)
  const nextRankDefinition = rankDefinition.isTopRank
    ? null
    : getRankTierFromMmr(rankDefinition.maxMmr + 1)

  return {
    mmr: normalizedMmr,
    tierId: rankDefinition.id,
    tierLabel: rankDefinition.label,
    majorTierId: rankDefinition.majorTierId,
    majorTierLabel: rankDefinition.majorTierLabel,
    division: rankDefinition.division,
    divisionLabel: rankDefinition.divisionLabel,
    nextTierLabel: nextRankDefinition?.label ?? "Max",
    mmrToNextTier: nextRankDefinition
      ? Math.max(0, nextRankDefinition.minMmr - normalizedMmr)
      : 0,
    divisionFloorMmr: rankDefinition.minMmr,
    divisionCeilingMmr: rankDefinition.maxMmr,
    rr: rankDefinition.isTopRank
      ? null
      : Math.max(0, Math.min(RR_PER_DIVISION, normalizedMmr - rankDefinition.minMmr)),
    rrMax: rankDefinition.isTopRank ? null : RR_PER_DIVISION,
    rankOrder: rankDefinition.order,
    toneId: rankDefinition.toneId,
    isPlacement: false,
    isTopRank: rankDefinition.isTopRank,
    isUnranked: false,
    placementMatchesPlayed: PLACEMENT_MATCH_COUNT,
    placementMatchesRemaining: 0,
  }
}

function buildPlacementProgress(mmr, rankedState, hasRankedHistory) {
  const normalizedRankedState = normalizeRankedState(rankedState)

  if (!hasRankedHistory && normalizedRankedState.placementMatchesPlayed <= 0) {
    return getUnrankedProgress()
  }

  return {
    mmr: clampNonNegative(mmr),
    tierId: "placement",
    tierLabel: `Placement ${normalizedRankedState.placementMatchesPlayed}/${PLACEMENT_MATCH_COUNT}`,
    majorTierId: "placement",
    majorTierLabel: "Placement",
    division: null,
    divisionLabel: "",
    nextTierLabel: "Initial Rank",
    mmrToNextTier: 0,
    divisionFloorMmr: 0,
    divisionCeilingMmr: 0,
    rr: null,
    rrMax: null,
    rankOrder: -1,
    toneId: "placement",
    isPlacement: true,
    isTopRank: false,
    isUnranked: false,
    placementMatchesPlayed: normalizedRankedState.placementMatchesPlayed,
    placementMatchesRemaining: Math.max(
      0,
      PLACEMENT_MATCH_COUNT - normalizedRankedState.placementMatchesPlayed
    ),
  }
}

function resolvePlacementRatingFromAverageScore(averagePlacementScore) {
  const placementBand = PLACEMENT_RESULT_BANDS.find(
    (band) => averagePlacementScore >= band.minAverageScore
  ) ?? PLACEMENT_RESULT_BANDS[PLACEMENT_RESULT_BANDS.length - 1]
  const division = getDivisionById(placementBand.divisionId)

  return Math.min(
    PLACEMENT_MAX_MMR,
    division.minMmr + Math.floor(RR_PER_DIVISION / 2)
  )
}

export function buildDefaultRankedState() {
  return {
    rankSystemVersion: RANK_SYSTEM_VERSION,
    placementMatchesPlayed: 0,
    demotionProtectionRounds: 0,
  }
}

export function normalizeRankedState(rankedState = {}) {
  return {
    rankSystemVersion: clampInteger(
      rankedState.rankSystemVersion,
      0,
      RANK_SYSTEM_VERSION
    ),
    placementMatchesPlayed: clampInteger(
      rankedState.placementMatchesPlayed,
      0,
      PLACEMENT_MATCH_COUNT
    ),
    demotionProtectionRounds: clampInteger(
      rankedState.demotionProtectionRounds,
      0,
      DEMOTION_PROTECTION_MATCHES
    ),
  }
}

export function hasCompletedPlacements(rankedState = {}) {
  return normalizeRankedState(rankedState).placementMatchesPlayed >= PLACEMENT_MATCH_COUNT
}

export function migrateLegacyRankMmr(mmr = INITIAL_RANK_MMR) {
  const normalizedMmr = clampNonNegative(mmr)

  if (normalizedMmr <= 0) {
    return 0
  }

  if (normalizedMmr <= LEGACY_BRONZE_MAX_MMR) {
    return Math.round(
      mapRange(
        normalizedMmr,
        0,
        LEGACY_BRONZE_MAX_MMR,
        RANK_DIVISIONS[0].minMmr,
        RANK_DIVISIONS[2].maxMmr
      )
    )
  }

  if (normalizedMmr <= LEGACY_SILVER_MAX_MMR) {
    return Math.round(
      mapRange(
        normalizedMmr,
        LEGACY_BRONZE_MAX_MMR + 1,
        LEGACY_SILVER_MAX_MMR,
        RANK_DIVISIONS[3].minMmr,
        RANK_DIVISIONS[8].maxMmr
      )
    )
  }

  return Math.round(
    RANK_DIVISIONS[9].minMmr +
    ((normalizedMmr - LEGACY_GOLD_START_MMR) * LEGACY_GOLD_SCALE)
  )
}

export function migrateLegacyRankData({
  rankMmr = INITIAL_RANK_MMR,
  rankedState = {},
}) {
  const normalizedRankedState = normalizeRankedState(rankedState)

  if (normalizedRankedState.rankSystemVersion >= RANK_SYSTEM_VERSION) {
    return {
      rankMmr: clampNonNegative(rankMmr),
      rankedState: {
        ...buildDefaultRankedState(),
        ...normalizedRankedState,
        rankSystemVersion: RANK_SYSTEM_VERSION,
      },
    }
  }

  return {
    rankMmr: 0,
    rankedState: buildDefaultRankedState(),
  }
}

export function getRankTierFromMmr(mmr = INITIAL_RANK_MMR) {
  const normalizedMmr = clampNonNegative(mmr)

  if (normalizedMmr >= TOP_RANK_MIN_MMR) {
    return buildTopRankDefinition()
  }

  const divisionIndex = Math.min(
    RANK_DIVISIONS.length - 1,
    Math.floor(normalizedMmr / RR_PER_DIVISION)
  )

  return RANK_DIVISIONS[divisionIndex] ?? RANK_DIVISIONS[0]
}

export function getRankProgress(mmr = INITIAL_RANK_MMR) {
  return buildVisibleRankProgress(getRankTierFromMmr(mmr), mmr)
}

export function getUnrankedProgress() {
  return {
    mmr: 0,
    tierId: "unranked",
    tierLabel: UNRANKED_LABEL,
    majorTierId: "unranked",
    majorTierLabel: UNRANKED_LABEL,
    division: null,
    divisionLabel: "",
    nextTierLabel: RANK_DIVISIONS[0]?.label ?? "Bronze I",
    mmrToNextTier: 0,
    divisionFloorMmr: 0,
    divisionCeilingMmr: 0,
    rr: null,
    rrMax: null,
    rankOrder: -2,
    toneId: "unranked",
    isPlacement: false,
    isTopRank: false,
    isUnranked: true,
    placementMatchesPlayed: 0,
    placementMatchesRemaining: PLACEMENT_MATCH_COUNT,
  }
}

export function getRankProgressWithPlacement({
  mmr = INITIAL_RANK_MMR,
  hasRankedHistory = false,
  rankedState = {},
} = {}) {
  const normalizedRankedState = normalizeRankedState(rankedState)

  if (!hasCompletedPlacements(normalizedRankedState)) {
    return buildPlacementProgress(mmr, normalizedRankedState, hasRankedHistory)
  }

  return getRankProgress(mmr)
}

export function applyRankedMatchResult({
  currentMmr = INITIAL_RANK_MMR,
  currentRankedState = {},
  hasRankedHistory = false,
  baseRankDelta = 0,
  placementMatchScore = 0,
  allowsRankProgression = false,
} = {}) {
  const normalizedCurrentMmr = clampNonNegative(currentMmr)
  const normalizedRankedState = {
    ...buildDefaultRankedState(),
    ...normalizeRankedState(currentRankedState),
    rankSystemVersion: RANK_SYSTEM_VERSION,
  }
  const previousRankProgress = getRankProgressWithPlacement({
    mmr: normalizedCurrentMmr,
    hasRankedHistory,
    rankedState: normalizedRankedState,
  })

  if (!allowsRankProgression) {
    return {
      nextMmr: normalizedCurrentMmr,
      nextRankedState: normalizedRankedState,
      appliedRankDelta: 0,
      placementMatchScore: 0,
      previousRankProgress,
      nextRankProgress: previousRankProgress,
      revealedFromPlacements: false,
      wasPromotion: false,
      wasDemotion: false,
    }
  }

  let nextMmr = normalizedCurrentMmr
  let nextRankedState = { ...normalizedRankedState }
  let appliedRankDelta = clampInteger(baseRankDelta, -25, 35)
  let appliedPlacementScore = 0
  const isInPlacements = !hasCompletedPlacements(nextRankedState)

  if (isInPlacements) {
    appliedPlacementScore = clampInteger(
      placementMatchScore,
      0,
      PLACEMENT_MATCH_SCORE_MAX
    )
    appliedRankDelta = appliedPlacementScore
    nextMmr = normalizedCurrentMmr + appliedPlacementScore

    nextRankedState = {
      ...nextRankedState,
      placementMatchesPlayed: Math.min(
        PLACEMENT_MATCH_COUNT,
        nextRankedState.placementMatchesPlayed + 1
      ),
      demotionProtectionRounds: 0,
    }

    if (hasCompletedPlacements(nextRankedState)) {
      const placementAverageScore = nextMmr / PLACEMENT_MATCH_COUNT
      nextMmr = resolvePlacementRatingFromAverageScore(placementAverageScore)
    }
  } else {
    const previousVisibleTier = getRankTierFromMmr(normalizedCurrentMmr)
    nextMmr = Math.max(0, normalizedCurrentMmr + appliedRankDelta)

    if (
      nextRankedState.demotionProtectionRounds > 0 &&
      !previousVisibleTier.isTopRank &&
      nextMmr < previousVisibleTier.minMmr
    ) {
      nextMmr = previousVisibleTier.minMmr
    }

    const nextVisibleTier = getRankTierFromMmr(nextMmr)
    const wasPromotion = nextVisibleTier.order > previousVisibleTier.order

    nextRankedState = {
      ...nextRankedState,
      demotionProtectionRounds: wasPromotion && !nextVisibleTier.isTopRank
        ? DEMOTION_PROTECTION_MATCHES
        : Math.max(0, nextRankedState.demotionProtectionRounds - 1),
    }
  }

  const nextRankProgress = getRankProgressWithPlacement({
    mmr: nextMmr,
    hasRankedHistory: true,
    rankedState: nextRankedState,
  })

  return {
    nextMmr,
    nextRankedState,
    appliedRankDelta,
    placementMatchScore: appliedPlacementScore,
    previousRankProgress,
    nextRankProgress,
    revealedFromPlacements:
      previousRankProgress.isPlacement && !nextRankProgress.isPlacement,
    wasPromotion:
      !previousRankProgress.isPlacement &&
      !nextRankProgress.isPlacement &&
      nextRankProgress.rankOrder > previousRankProgress.rankOrder,
    wasDemotion:
      !previousRankProgress.isPlacement &&
      !nextRankProgress.isPlacement &&
      nextRankProgress.rankOrder < previousRankProgress.rankOrder,
  }
}

export function getRankAppearanceId(rankInput = "") {
  const explicitToneId = typeof rankInput === "object" && rankInput !== null
    ? (
        rankInput.toneId ||
        rankInput.majorTierId ||
        rankInput.tierId ||
        rankInput.rankLabel ||
        rankInput.tierLabel ||
        ""
      )
    : rankInput
  const normalizedValue = String(explicitToneId || "").trim().toLowerCase()

  if (!normalizedValue) return ""
  if (normalizedValue === "unranked") return "unranked"
  if (normalizedValue.startsWith("placement")) return "placement"

  if (normalizedValue.includes("bronze")) return "bronze"
  if (normalizedValue.includes("silver")) return "silver"
  if (normalizedValue.includes("gold")) return "gold"
  if (normalizedValue.includes("platinum")) return "platinum"
  if (normalizedValue.includes("diamond")) return "diamond"
  if (normalizedValue.includes("deadeye")) return "deadeye"

  return ""
}

export function getRankToneClassName(rankInput = "") {
  const toneId = getRankAppearanceId(rankInput)
  if (!toneId) return "rank-unranked"

  return `rank-${toneId}`
}

export function getRankImageSrc(rankInput = "") {
  const toneId = getRankAppearanceId(rankInput)
  if (!toneId || toneId === "unranked" || toneId === "placement") {
    return ""
  }

  return RANK_IMAGE_BY_TONE_ID[toneId] ?? ""
}

export function calculatePlacementMatchScore({
  score = 0,
  hits = 0,
  misses = 0,
  bestStreak = 0,
  modeId = "",
  difficultyId = "",
  progressionMode = "",
  allowsRankProgression = false,
}) {
  const resolvedModeId = modeId || difficultyId
  const isHardMode = resolvedModeId === DIFFICULTY_IDS.HARD
  const isRankedMode = progressionMode === PROGRESSION_MODE.RANKED

  if (!allowsRankProgression || !isHardMode || !isRankedMode) {
    return 0
  }

  const normalizedScore = clampNonNegative(score)
  const normalizedHits = clampNonNegative(hits)
  const normalizedMisses = clampNonNegative(misses)
  const normalizedBestStreak = clampNonNegative(bestStreak)
  const normalizedAccuracy = calculateAccuracyPercent(normalizedHits, normalizedMisses)

  const placementScore = (
    resolvePointsFromMinimumBands(normalizedScore, PLACEMENT_SCORE_POINT_BANDS) +
    resolvePointsFromMinimumBands(normalizedAccuracy, PLACEMENT_ACCURACY_POINT_BANDS) +
    resolvePointsFromMinimumBands(normalizedBestStreak, PLACEMENT_STREAK_POINT_BANDS) +
    resolvePointsFromMaximumBands(normalizedMisses, PLACEMENT_MISS_POINT_BANDS)
  )

  return clampInteger(placementScore, 0, PLACEMENT_MATCH_SCORE_MAX)
}

export function calculateRoundRankDelta({
  score = 0,
  hits = 0,
  misses = 0,
  bestStreak = 0,
  modeId = "",
  difficultyId = "",
  progressionMode = "",
  allowsRankProgression = false,
}) {
  const resolvedModeId = modeId || difficultyId
  const isHardMode = resolvedModeId === DIFFICULTY_IDS.HARD
  const isRankedMode = progressionMode === PROGRESSION_MODE.RANKED

  if (!allowsRankProgression || !isHardMode || !isRankedMode) {
    return 0
  }

  const normalizedScore = clampNonNegative(score)
  const normalizedHits = clampNonNegative(hits)
  const normalizedMisses = clampNonNegative(misses)
  const normalizedBestStreak = clampNonNegative(bestStreak)
  const normalizedAccuracy = calculateAccuracyPercent(normalizedHits, normalizedMisses)

  let delta = 0

  delta += Math.floor(normalizedScore / 40)
  delta += Math.floor(normalizedBestStreak / 3)

  if (normalizedAccuracy >= 99) delta += 8
  else if (normalizedAccuracy >= 96) delta += 6
  else if (normalizedAccuracy >= 93) delta += 3
  else if (normalizedAccuracy >= 90) delta += 1
  else if (normalizedAccuracy >= 85) delta -= 3
  else if (normalizedAccuracy >= 80) delta -= 6
  else delta -= 10

  if (normalizedMisses >= 18) delta -= 10
  if (normalizedHits <= 8) delta -= 12

  return Math.max(-25, Math.min(35, Math.floor(delta)))
}
