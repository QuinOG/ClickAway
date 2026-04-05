import { useCallback } from "react"

import { PROGRESSION_MODE } from "../constants/difficultyConfig.js"
import { appendHistoryEntry, createHistoryEntry } from "../utils/historyUtils.js"
import { calculateRoundXp } from "../utils/progressionUtils.js"
import {
  applyRankedMatchResult,
  calculatePlacementMatchScore,
  calculateRoundRankDelta,
} from "../utils/rankUtils.js"
import { calculateRoundCoins } from "../utils/roundRewards.js"

export function usePlayerProgressionUpdates({
  coins,
  levelXp,
  rankMmr,
  rankedState,
  roundHistory,
  setCoins,
  setLevelXp,
  setRankMmr,
  setRankedState,
  setRoundHistory,
  persistProgress,
}) {
  const handleRoundComplete = useCallback(
    (roundResult = {}) => {
      const {
        clicksScored,
        coinMultiplier = 1,
        allowsCoinRewards = true,
        allowsLevelProgression = true,
        allowsRankProgression = false,
        progressionMode = "",
        hits = 0,
        misses = 0,
        score = 0,
        bestStreak = 0,
        avgReactionMs = null,
        bestReactionMs = null,
        modeId = "",
        loadoutSnapshot = null,
      } = roundResult

      const earnedCoins = allowsCoinRewards
        ? calculateRoundCoins(clicksScored, coinMultiplier)
        : 0

      const earnedXp = allowsLevelProgression
        ? calculateRoundXp({
            hits,
            misses,
            bestStreak,
            score,
          })
        : 0

      const rankDelta = calculateRoundRankDelta({
        score,
        hits,
        misses,
        bestStreak,
        modeId,
        progressionMode,
        allowsRankProgression,
      })
      const placementMatchScore = calculatePlacementMatchScore({
        score,
        hits,
        misses,
        bestStreak,
        modeId,
        progressionMode,
        allowsRankProgression,
      })
      const hasRankedHistory = roundHistory.some(
        (entry) => entry?.progressionMode === PROGRESSION_MODE.RANKED
      )
      const rankResult = applyRankedMatchResult({
        currentMmr: rankMmr,
        currentRankedState: rankedState,
        hasRankedHistory,
        baseRankDelta: rankDelta,
        placementMatchScore,
        allowsRankProgression,
      })

      const historyEntry = createHistoryEntry({
        score,
        hits,
        misses,
        bestStreak,
        avgReactionMs,
        bestReactionMs,
        coinsEarned: earnedCoins,
        modeId,
        progressionMode,
        xpEarned: earnedXp,
        rankDelta: rankResult.appliedRankDelta,
        loadoutSnapshot,
      })

      const nextCoins = Math.max(0, coins + earnedCoins)
      const nextLevelXp = Math.max(0, levelXp + earnedXp)
      const nextRankMmr = rankResult.nextMmr
      const nextRankedState = rankResult.nextRankedState
      const nextRoundHistory = appendHistoryEntry(roundHistory, historyEntry)

      setCoins(nextCoins)
      setLevelXp(nextLevelXp)
      setRankMmr(nextRankMmr)
      setRankedState(nextRankedState)
      setRoundHistory(nextRoundHistory)

      void persistProgress({
        coins: nextCoins,
        levelXp: nextLevelXp,
        rankMmr: nextRankMmr,
        rankedState: nextRankedState,
        roundHistory: nextRoundHistory,
      })
    },
    [
      coins,
      levelXp,
      persistProgress,
      rankMmr,
      rankedState,
      roundHistory,
      setCoins,
      setLevelXp,
      setRankMmr,
      setRankedState,
      setRoundHistory,
    ]
  )

  return {
    handleRoundComplete,
  }
}
