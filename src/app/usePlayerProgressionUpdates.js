import { useCallback } from "react"

import { submitRound } from "../services/clickAwayHttpApiClient.js"

export function usePlayerProgressionUpdates({
  authToken,
  applyProgress,
}) {
  const handleRoundComplete = useCallback(
    async (roundResult = {}) => {
      const {
        modeId = "",
        events = [],
      } = roundResult

      if (!authToken) return

      try {
        const response = await submitRound(authToken, { modeId, events })
        applyProgress(response.progress)
      } catch (error) {
        console.error("Unable to submit round:", error)
      }
    },
    [authToken, applyProgress]
  )

  return {
    handleRoundComplete,
  }
}
