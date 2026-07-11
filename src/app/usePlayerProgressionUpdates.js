import { useCallback } from "react"

import { submitRound } from "../services/clickAwayHttpApiClient.js"

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
      } = roundResult

      if (!isAuthed) return

      try {
        const response = await submitRound({
          modeId,
          events,
          loadoutSnapshot,
          avgReactionMs,
          bestReactionMs,
          roundToken,
        })
        applyProgress(response.progress)
      } catch (error) {
        console.error("Unable to submit round:", error)
      }
    },
    [isAuthed, applyProgress]
  )

  return {
    handleRoundComplete,
  }
}
