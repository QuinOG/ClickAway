import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"

import { fetchChallenges } from "../services/clickAwayHttpApiClient.js"

// Incoming duels waiting for a reply, for the nav badges. Refreshed whenever the
// player moves between pages (which includes leaving Duels after answering one),
// and cleared on logout. A response for an earlier page or session is ignored.
export function usePendingDuelCount({ isAuthed, sessionKey = "" }) {
  const { pathname } = useLocation()
  const [counted, setCounted] = useState({ sessionKey: "", count: 0 })

  useEffect(() => {
    if (!isAuthed) return undefined

    let isCancelled = false
    fetchChallenges({ role: "incoming" })
      .then((response) => {
        if (isCancelled) return
        const challenges = Array.isArray(response?.challenges) ? response.challenges : []
        setCounted({
          sessionKey,
          count: challenges.filter((challenge) => challenge.status === "pending").length,
        })
      })
      .catch(() => {
        // Keep the last known count; the badge is a hint, not a source of truth.
      })

    return () => {
      isCancelled = true
    }
  }, [isAuthed, pathname, sessionKey])

  return isAuthed && counted.sessionKey === sessionKey ? counted.count : 0
}
