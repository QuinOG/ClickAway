import {
  ACTIVE_LOADOUT_ID_DEFAULT,
  DEFAULT_SAVED_LOADOUTS,
} from "../../src/constants/buildcraft.js"
import {
  BUILD_WALKTHROUGH_STATUS,
  normalizeBuildWalkthrough,
} from "../../src/constants/buildWalkthrough.js"
import { buildDefaultRankedState } from "../../src/utils/rankUtils.js"
import {
  DEFAULT_LIFETIME_STATS,
  normalizeLifetimeStats,
} from "../../src/utils/lifetimeStatsUtils.js"
import {
  DEFAULT_PLAYER_STATE,
  getCatalogItemById,
  getDefaultItemIdForType,
  getMappedShopItemById,
} from "../serverShopCatalogIdMappings.js"

const DEFAULT_PROGRESS = {
  coins: 0,
  levelXp: 0,
  rankMmr: 0,
  rankedState: buildDefaultRankedState(),
  ownedItemIds: [],
  equippedButtonSkinId: DEFAULT_PLAYER_STATE.equippedButtonSkinId,
  equippedArenaThemeId: DEFAULT_PLAYER_STATE.equippedArenaThemeId,
  equippedProfileImageId: DEFAULT_PLAYER_STATE.equippedProfileImageId,
  activeLoadoutId: ACTIVE_LOADOUT_ID_DEFAULT,
  savedLoadouts: DEFAULT_SAVED_LOADOUTS,
  selectedModeId: "normal",
  roundHistory: [],
  lifetimeStats: normalizeLifetimeStats(DEFAULT_LIFETIME_STATS),
  loadoutStats: [],
  totalRoundCount: 0,
  unlockedAchievementIds: [],
  buildWalkthrough: normalizeBuildWalkthrough(
    {},
    BUILD_WALKTHROUGH_STATUS.DISMISSED
  ),
  seenUnlockPartIds: [],
}

const DEFAULT_PROGRESSION_MODE = "non_ranked"

function toNonNegativeNumber(value, fallback = 0) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : fallback
}

function toNullableNonNegativeNumber(value) {
  // Missing stays missing: Number(null) would turn "no measurement" into 0.
  if (value === null || value === undefined || value === "") return null
  const numericValue = Number(value)
  return Number.isFinite(numericValue) && numericValue >= 0
    ? Math.round(numericValue)
    : null
}

function parseDateValue(value) {
  if (!value) return null
  const parsedDate = value instanceof Date ? value : new Date(value)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

function normalizeStringList(values = []) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  )
}

function normalizeOwnedItemIds(itemIds = []) {
  return normalizeStringList(itemIds).filter((itemId) => {
    const catalogItem = getCatalogItemById(itemId)
    return catalogItem && !catalogItem.builtIn
  })
}

function normalizeLoadoutSnapshot(snapshot = {}) {
  const moduleIds = snapshot?.moduleIds ?? {}
  const powerupIds = Array.isArray(snapshot?.powerupIds)
    ? snapshot.powerupIds
        .map((powerupId) => String(powerupId || "").trim())
        .filter(Boolean)
        .slice(0, 3)
    : []

  const loadoutId = String(snapshot?.loadoutId || "")
  const loadoutName = String(snapshot?.loadoutName || "").trim()

  if (!loadoutId && !loadoutName && !powerupIds.length) {
    return null
  }

  return {
    loadoutId,
    loadoutName: loadoutName || "Loadout",
    moduleIds: {
      tempoCoreId: String(moduleIds.tempoCoreId || ""),
      streakLensId: String(moduleIds.streakLensId || ""),
      powerRigId: String(moduleIds.powerRigId || ""),
    },
    powerupIds,
  }
}

function resolveEquippedItemId(itemId, type, ownedItemIdSet) {
  const mappedItem = getMappedShopItemById(itemId)
  const defaultItemId = getDefaultItemIdForType(type)

  if (!mappedItem || mappedItem.type !== type) {
    return defaultItemId
  }

  if (!mappedItem.builtIn && !ownedItemIdSet.has(mappedItem.frontendItemId)) {
    return defaultItemId
  }

  return mappedItem.frontendItemId
}

function normalizeRoundHistoryEntry(entry = {}, index = 0) {
  const playedAtDate =
    parseDateValue(entry.playedAtIso) ||
    parseDateValue(entry.playedAt) ||
    new Date(Date.now() - index)

  const hits = toNonNegativeNumber(entry.hits, 0)
  const misses = toNonNegativeNumber(entry.misses, 0)
  const totalAttempts = hits + misses
  const loadoutSnapshot = normalizeLoadoutSnapshot(
    entry.loadoutSnapshot ?? {
      loadoutId: entry.loadoutId,
      loadoutName: entry.loadoutName,
      moduleIds: {
        tempoCoreId: entry.tempoCoreId,
        streakLensId: entry.streakLensId,
        powerRigId: entry.powerRigId,
      },
      powerupIds: [
        entry.powerupSlot1Id,
        entry.powerupSlot2Id,
        entry.powerupSlot3Id,
      ],
    }
  )

  return {
    playedAtDate,
    modeId: String(entry.modeId || entry.difficultyId || DEFAULT_PROGRESS.selectedModeId),
    progressionMode: String(entry.progressionMode || DEFAULT_PROGRESSION_MODE),
    outcome: entry.outcome === "forfeit" ? "forfeit" : "completed",
    score: toNonNegativeNumber(entry.score, 0),
    hits,
    misses,
    bestStreak: toNonNegativeNumber(entry.bestStreak, 0),
    avgReactionMs: toNullableNonNegativeNumber(entry.avgReactionMs),
    bestReactionMs: toNullableNonNegativeNumber(entry.bestReactionMs),
    coinsEarned: toNonNegativeNumber(entry.coinsEarned, 0),
    xpEarned: toNonNegativeNumber(entry.xpEarned, 0),
    rankDelta: Number.isFinite(Number(entry.rankDelta)) ? Number(entry.rankDelta) : 0,
    rankResultKind: ["rr", "placement"].includes(entry.rankResultKind) ? entry.rankResultKind : null,
    accuracyPercent: totalAttempts > 0 ? (hits / totalAttempts) * 100 : 0,
    loadoutSnapshot,
  }
}

function buildHistoryEntry(row) {
  const playedAtDate = parseDateValue(row.playedAt) || new Date()
  const hits = toNonNegativeNumber(row.hits, 0)
  const misses = toNonNegativeNumber(row.misses, 0)
  const loadoutSnapshot = normalizeLoadoutSnapshot({
    loadoutId: row.loadoutId,
    loadoutName: row.loadoutName,
    moduleIds: {
      tempoCoreId: row.tempoCoreId,
      streakLensId: row.streakLensId,
      powerRigId: row.powerRigId,
    },
    powerupIds: [
      row.powerupSlot1Id,
      row.powerupSlot2Id,
      row.powerupSlot3Id,
    ],
  })

  return {
    id: `r-${row.id}`,
    playedAtIso: playedAtDate.toISOString(),
    score: toNonNegativeNumber(row.score, 0),
    hits,
    misses,
    bestStreak: toNonNegativeNumber(row.bestStreak, 0),
    accuracyPercent: hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0,
    // A round with no hits has no reaction time; older rows stored 0 for it.
    avgReactionMs: hits > 0 ? toNullableNonNegativeNumber(row.avgReactionMs) : null,
    bestReactionMs: hits > 0 ? toNullableNonNegativeNumber(row.bestReactionMs) : null,
    coinsEarned: toNonNegativeNumber(row.coinsEarned, 0),
    modeId: String(row.modeId || DEFAULT_PROGRESS.selectedModeId),
    difficultyId: String(row.modeId || DEFAULT_PROGRESS.selectedModeId),
    progressionMode: String(row.progressionMode || DEFAULT_PROGRESSION_MODE),
    outcome: row.outcome === "forfeit" ? "forfeit" : "completed",
    xpEarned: toNonNegativeNumber(row.xpEarned, 0),
    rankDelta: Number.isFinite(Number(row.rankDelta)) ? Number(row.rankDelta) : 0,
    rankResultKind: ["rr", "placement"].includes(row.rankResultKind) ? row.rankResultKind : null,
    loadoutSnapshot,
  }
}

export function normalizePaginationPage(page = 1) {
  const value = Number(page)
  return Number.isFinite(value) ? Math.max(1, Math.min(1_000_000, Math.floor(value))) : 1
}

export function normalizePaginationLimit(limit, maxLimit, defaultLimit) {
  if (limit === undefined || limit === null || limit === "") return defaultLimit
  const value = Number(limit)
  if (!Number.isFinite(value) || value === 0) return defaultLimit
  return Math.max(1, Math.min(maxLimit, Math.floor(value)))
}

export {
  DEFAULT_PROGRESS,
  DEFAULT_PROGRESSION_MODE,
  buildHistoryEntry,
  normalizeLoadoutSnapshot,
  normalizeOwnedItemIds,
  normalizeRoundHistoryEntry,
  normalizeStringList,
  parseDateValue,
  resolveEquippedItemId,
  toNonNegativeNumber,
  toNullableNonNegativeNumber,
}
