import { useEffect } from "react"
import toast from "react-hot-toast"

import { ACHIEVEMENTS } from "../game/achievements/achievementsList.js"
import { mergeUnlockedAchievementIds } from "./appAccountStateHelpers.js"

const ACHIEVEMENT_TITLE_BY_ID = Object.fromEntries(
  ACHIEVEMENTS.map((achievement) => [achievement.id, achievement.title])
)

export function useAchievementSync({
  unlockedAchievementIds,
  setUnlockedAchievementIds,
  unlockedAchievementIdsFromStats,
  persistProgress,
}) {
  useEffect(() => {
    const mergedIds = mergeUnlockedAchievementIds(
      unlockedAchievementIds,
      unlockedAchievementIdsFromStats
    )

    if (mergedIds === unlockedAchievementIds) {
      return
    }

    const currentIdSet = new Set(Array.isArray(unlockedAchievementIds) ? unlockedAchievementIds : [])
    mergedIds.forEach((id) => {
      if (!currentIdSet.has(id)) {
        const achievementTitle = ACHIEVEMENT_TITLE_BY_ID[id]
        if (achievementTitle) {
          toast.success(`Achievement unlocked: ${achievementTitle}`, { duration: 4000 })
        }
      }
    })

    setUnlockedAchievementIds(mergedIds)
    void persistProgress({
      unlockedAchievementIds: mergedIds,
    })
  }, [
    persistProgress,
    setUnlockedAchievementIds,
    unlockedAchievementIds,
    unlockedAchievementIdsFromStats,
  ])
}
