import { useEffect } from "react"

import { mergeUnlockedAchievementIds } from "./appStateHelpers.js"

export function useAchievementSync({
  setUnlockedAchievementIds,
  unlockedAchievementIdsFromStats,
}) {
  useEffect(() => {
    setUnlockedAchievementIds((currentIds) =>
      mergeUnlockedAchievementIds(currentIds, unlockedAchievementIdsFromStats)
    )
  }, [setUnlockedAchievementIds, unlockedAchievementIdsFromStats])
}
