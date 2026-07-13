import { useCallback, useContext, useEffect, useRef } from "react"

import { FeedbackPreferencesContext } from "../app/feedbackPreferencesContextValue.js"
import { FEEDBACK_EVENTS } from "../constants/feedbackEvents.js"

const SOURCE_STATE_LIFETIME_MS = 720
const unavailableFeedback = () => ({ played: false, vibrated: false, reason: "unavailable" })

function resolveSourceNode(source) {
  if (typeof Element === "undefined") return null
  if (source?.currentTarget instanceof Element) return source.currentTarget
  if (source?.current instanceof Element) return source.current
  return source instanceof Element ? source : null
}

export function useActionFeedback() {
  const emitFeedback = useContext(FeedbackPreferencesContext)?.emitFeedback ?? unavailableFeedback
  const cleanupTimersRef = useRef(new Map())

  useEffect(() => () => {
    cleanupTimersRef.current.forEach((timerId) => window.clearTimeout(timerId))
    cleanupTimersRef.current.clear()
  }, [])

  const signalAction = useCallback((source, {
    state = "confirmed",
    eventName = FEEDBACK_EVENTS.ACTION_CONFIRM,
    eventId,
    strength,
    pitch,
    silent = false,
  } = {}) => {
    const sourceNode = resolveSourceNode(source)
    if (sourceNode) {
      const existingTimer = cleanupTimersRef.current.get(sourceNode)
      if (existingTimer) window.clearTimeout(existingTimer)

      sourceNode.removeAttribute("data-action-feedback")
      // Restart the compositor animation when the same control is used repeatedly.
      void sourceNode.offsetWidth
      sourceNode.dataset.actionFeedback = state
      const timerId = window.setTimeout(() => {
        sourceNode.removeAttribute("data-action-feedback")
        cleanupTimersRef.current.delete(sourceNode)
      }, SOURCE_STATE_LIFETIME_MS)
      cleanupTimersRef.current.set(sourceNode, timerId)
    }

    if (!silent && eventName) {
      emitFeedback(eventName, { eventId, strength, pitch, scope: "interface" })
    }
  }, [emitFeedback])

  return { signalAction }
}
