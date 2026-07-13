import { useEffect, useRef } from "react"
import toast from "react-hot-toast"

import { ACHIEVEMENTS } from "../game/achievements/achievementsList.js"
import { mergeUnlockedAchievementIds } from "./appAccountStateHelpers.js"
import { useFeedbackPreferences } from "./useFeedbackPreferences.js"
import { FEEDBACK_EVENTS } from "../constants/feedbackEvents.js"

const ACHIEVEMENT_TITLE_BY_ID = Object.fromEntries(
  ACHIEVEMENTS.map((achievement) => [achievement.id, achievement.title])
)

export function useAchievementSync({
  unlockedAchievementIds,
  setUnlockedAchievementIds,
  unlockedAchievementIdsFromStats,
  sessionKey = "",
}) {
  const { emitFeedback } = useFeedbackPreferences()
  const establishedSessionKeyRef = useRef("")
  const reconciledIdsRef = useRef(new Set())

  useEffect(() => {
    if (!sessionKey) {
      establishedSessionKeyRef.current = ""
      reconciledIdsRef.current = new Set()
      return
    }

    const mergedIds = mergeUnlockedAchievementIds(
      unlockedAchievementIds,
      unlockedAchievementIdsFromStats
    )
    const isSessionHydration = establishedSessionKeyRef.current !== sessionKey

    if (isSessionHydration) {
      establishedSessionKeyRef.current = sessionKey
      reconciledIdsRef.current = new Set(mergedIds)
    }

    if (mergedIds === unlockedAchievementIds) {
      return
    }

    if (!isSessionHydration) {
      mergedIds.forEach((id) => {
        if (!reconciledIdsRef.current.has(id)) {
          const achievementTitle = ACHIEVEMENT_TITLE_BY_ID[id]
          if (achievementTitle) {
            toast.success(`Achievement unlocked: ${achievementTitle}`, { duration: 4000 })
            emitFeedback(FEEDBACK_EVENTS.ACHIEVEMENT, {
              eventId: `achievement-${id}`,
              scope: "progression",
            })
          }
        }
      })
      reconciledIdsRef.current = new Set([
        ...reconciledIdsRef.current,
        ...mergedIds,
      ])
    }

    setUnlockedAchievementIds(mergedIds)
  }, [
    setUnlockedAchievementIds,
    unlockedAchievementIds,
    unlockedAchievementIdsFromStats,
    emitFeedback,
    sessionKey,
  ])
}
