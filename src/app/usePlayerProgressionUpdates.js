import { useCallback } from "react"

import { appendHistoryEntry, createHistoryEntry } from "../utils/historyUtils.js"
import { calculateRoundXp } from "../utils/progressionUtils.js"
import { calculateRoundRankDelta } from "../utils/rankUtils.js"
import { calculateRoundCoins } from "../utils/roundRewards.js"

export function usePlayerProgressionUpdates({
  coins,
  levelXp,
  rankMmr,
  roundHistory,
  setCoins,
  setLevelXp,
  setRankMmr,
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
        modeId = "",
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

      const historyEntry = createHistoryEntry({
        score,
        hits,
        misses,
        bestStreak,
        coinsEarned: earnedCoins,
        modeId,
        progressionMode,
        xpEarned: earnedXp,
        rankDelta,
      })

      const nextCoins = Math.max(0, coins + earnedCoins)
      const nextLevelXp = Math.max(0, levelXp + earnedXp)
      const nextRankMmr = Math.max(0, rankMmr + rankDelta)
      const nextRoundHistory = appendHistoryEntry(roundHistory, historyEntry)

      setCoins(nextCoins)
      setLevelXp(nextLevelXp)
      setRankMmr(nextRankMmr)
      setRoundHistory(nextRoundHistory)

      void persistProgress({
        coins: nextCoins,
        levelXp: nextLevelXp,
        rankMmr: nextRankMmr,
        roundHistory: nextRoundHistory,
      })
    },
    [
      coins,
      levelXp,
      persistProgress,
      rankMmr,
      roundHistory,
      setCoins,
      setLevelXp,
      setRankMmr,
      setRoundHistory,
    ]
  )

  return {
    handleRoundComplete,
  }
}
