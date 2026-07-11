import { useCallback, useEffect, useRef } from "react"
import toast from "react-hot-toast"

import { updatePlayerProgress } from "../services/clickAwayHttpApiClient.js"
import { pickProgressIntent } from "./progressIntent.js"

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

  useEffect(() => {
    sessionEpochRef.current += 1
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

    persistQueueRef.current = persistQueueRef.current
      .catch(() => null)
      .then(async () => {
        const response = await updatePlayerProgress(payload)
        if (sessionEpochRef.current !== requestEpoch) {
          return null
        }

        applyProgress(response.progress)
        return response.progress
      })
      .catch((error) => {
        console.error("Unable to sync player progress:", error)
        toast.error("Couldn't save your progress. Check your connection.", {
          id: PROGRESS_SYNC_TOAST_ID,
          style: PROGRESS_ERROR_TOAST_STYLE,
        })
        return null
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
