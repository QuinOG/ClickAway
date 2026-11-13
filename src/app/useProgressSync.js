import { useCallback, useEffect, useRef } from "react"
import toast from "react-hot-toast"

import { updatePlayerProgress } from "../services/clickAwayHttpApiClient.js"
import { pickProgressIntent } from "./progressIntent.js"
import {
  applyProgressResponse,
  beginProgressRequest,
  isCurrentSession,
  markPendingPreferences,
  settlePendingPreferences,
  settleProgressMutation,
} from "./progressResponseGuard.js"

const PROGRESS_SYNC_TOAST_ID = "progress-sync"

const PROGRESS_ERROR_TOAST_STYLE = {
  background: "rgba(11, 18, 36, 0.97)",
  color: "#ddeeff",
  border: "1px solid rgba(255, 106, 117, 0.4)",
  borderRadius: "12px",
  fontSize: "13px",
  fontFamily: "inherit",
  fontWeight: 600,
  padding: "10px 14px",
  boxShadow: "0 12px 28px rgba(4, 8, 20, 0.52)",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  maxWidth: "min(380px, 92vw)",
}

export function useProgressSync({ isAuthed, applyProgress }) {
  const persistQueueRef = useRef(Promise.resolve(null))
  const sessionEpochRef = useRef(0)
  const latestIntentSequenceRef = useRef(0)

  useEffect(() => {
    sessionEpochRef.current += 1
    latestIntentSequenceRef.current = 0
    persistQueueRef.current = Promise.resolve(null)
  }, [isAuthed])

  const persistIntent = useCallback((intent = {}) => {
    if (!isAuthed) {
      return Promise.resolve(null)
    }

    const payload = pickProgressIntent(intent)
    if (!Object.keys(payload).length) {
      return Promise.resolve(null)
    }

    const requestEpoch = sessionEpochRef.current
    const intentSequence = ++latestIntentSequenceRef.current
    const ticket = beginProgressRequest()
    const pendingHandle = markPendingPreferences(payload)

    persistQueueRef.current = persistQueueRef.current
      .catch(() => null)
      .then(async () => {
        // Checked before sending, not only after: a save queued by one account
        // must never be sent once another account has logged in.
        if (sessionEpochRef.current !== requestEpoch || !isCurrentSession(ticket)) {
          return null
        }

        const response = await updatePlayerProgress(payload)
        if (
          sessionEpochRef.current !== requestEpoch
          || intentSequence !== latestIntentSequenceRef.current
        ) {
          return null
        }

        settlePendingPreferences(pendingHandle)
        const outcome = await applyProgressResponse(ticket, response.progress, applyProgress)
        if (outcome === "refresh-failed") {
          toast.error("Build saved, but progress couldn't refresh. Reload to see it.")
        }
        return response.progress
      })
      .catch(async (error) => {
        settlePendingPreferences(pendingHandle)
        if (sessionEpochRef.current !== requestEpoch || !isCurrentSession(ticket)) return null
        const outcome = await applyProgressResponse(ticket, null, applyProgress)
        if (!isCurrentSession(ticket) || sessionEpochRef.current !== requestEpoch) return null
        if (outcome === "refresh-failed") {
          toast.error("Couldn't refresh your build. Build not saved, retry.")
        }
        console.error("Unable to sync player progress:", error)
        toast.error("Build not saved, retry. Check your connection.", {
          id: PROGRESS_SYNC_TOAST_ID,
          style: PROGRESS_ERROR_TOAST_STYLE,
        })
        return null
      })
      .finally(() => {
        settlePendingPreferences(pendingHandle)
        settleProgressMutation(ticket, applyProgress)
      })

    return persistQueueRef.current
  }, [applyProgress, isAuthed])

  const waitForPendingProgress = useCallback(
    () => persistQueueRef.current.catch(() => null),
    []
  )

  return {
    persistIntent,
    waitForPendingProgress,
  }
}
