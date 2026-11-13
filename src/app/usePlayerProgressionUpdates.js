import { useCallback } from "react"

import { submitRound } from "../services/clickAwayHttpApiClient.js"
import { applyProgressResponse, beginProgressRequest } from "./progressResponseGuard.js"

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
        arenaWidth = null,
        arenaHeight = null,
        challengeId = null,
        drillId = null,
      } = roundResult

      if (!isAuthed) return { ok: false, error: "You're logged out, so this round wasn't saved." }

      const ticket = beginProgressRequest()
      try {
        const response = await submitRound({
          modeId,
          events,
          loadoutSnapshot,
          avgReactionMs,
          bestReactionMs,
          roundToken,
          arenaWidth,
          arenaHeight,
          challengeId,
          drillId,
        })
        const applied = await applyProgressResponse(ticket, response.progress, applyProgress)
        return {
          ok: true,
          earnedCoins: response.earnedCoins,
          earnedXp: response.earnedXp,
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
      }
    },
    [isAuthed, applyProgress]
  )

  return {
    handleRoundComplete,
  }
}
