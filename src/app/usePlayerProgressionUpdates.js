import { useCallback } from "react"

import { appendHistoryEntry, createHistoryEntry } from "../utils/historyUtils.js"
import { calculateRoundXp } from "../utils/progressionUtils.js"
import { calculateRoundRankDelta } from "../utils/rankUtils.js"
import { calculateRoundCoins } from "../utils/roundRewards.js"

export function usePlayerProgressionUpdates ({
  setCoins,
  setLevelXp,
  setRankMmr,
  setRoundHistory,
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

      if (earnedCoins > 0) {
        setCoins((currentCoins) => currentCoins + earnedCoins)
      }

      if (earnedXp > 0) {
        setLevelXp((currentXp) => currentXp + earnedXp)
      }

      if (rankDelta !== 0) {
        setRankMmr((currentMmr) => Math.max(0, currentMmr + rankDelta))
      }

      setRoundHistory((currentHistory) =>
        appendHistoryEntry(currentHistory, historyEntry)
      )
    },
    [setCoins, setLevelXp, setRankMmr, setRoundHistory]
  )

  return {
    handleRoundComplete,
  }
}