import { useCallback } from "react"

import { submitRound } from "../services/clickAwayHttpApiClient.js"
import { applyProgressResponse, beginProgressRequest, settleProgressMutation } from "./progressResponseGuard.js"
import { normalizeDailyGoalRewards } from "../utils/dailyGoals.js"

export function usePlayerProgressionUpdates({
  isAuthed,
  applyProgress,
}) {
  const handleRoundComplete = useCallback(
    async (roundResult = {}) => {
      const {
        modeId = "",
        events = [],
        loadoutSnapshot = null,
        avgReactionMs = null,
        bestReactionMs = null,
        roundToken = null,
        seed = null,
        arenaWidth = null,
        arenaHeight = null,
        challengeId = null,
        drillId = null,
      } = roundResult

      if (!isAuthed) return { ok: false, error: "You're logged out, so this round wasn't saved." }

      const ticket = beginProgressRequest()
      let mutationSucceeded = false
      try {
        const response = await submitRound({
          modeId,
          events,
          loadoutSnapshot,
          avgReactionMs,
          bestReactionMs,
          roundToken,
          seed,
          arenaWidth,
          arenaHeight,
          challengeId,
          drillId,
        })
        mutationSucceeded = true
        const applied = await applyProgressResponse(ticket, response.progress, applyProgress)
        return {
          ok: true,
          // Missing from older servers: Results then keeps the client's own count.
          goldHits: Number.isFinite(Number(response.goldHits)) && response.goldHits !== null ? Number(response.goldHits) : null,
          bullseyes: Number.isFinite(Number(response.bullseyes)) && response.bullseyes !== null ? Number(response.bullseyes) : null,
          earnedCoins: response.earnedCoins,
          earnedXp: response.earnedXp,
          dailyBonusXp: Number(response.dailyBonusXp) || 0,
          dailyGoalRewards: normalizeDailyGoalRewards(response.dailyGoalRewards),
          rankDelta: response.rankDelta,
          rankProgress: response.rankProgress ?? null,
          followUpError: [
            response.followUpError,
            applied === "refresh-failed" ? "Your round was saved. Reload to see your updated totals." : "",
          ].filter(Boolean).join(" "),
        }
      } catch (error) {
        console.error("Unable to submit round:", error)
        return { ok: false, error: error?.message || "Couldn't reach the server." }
      } finally {
        if (mutationSucceeded) settleProgressMutation(ticket, applyProgress)
      }
    },
    [isAuthed, applyProgress]
  )

  return {
    handleRoundComplete,
  }
}
