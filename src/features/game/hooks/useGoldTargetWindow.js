import { useCallback, useEffect, useState } from "react"
import { GOLD_TARGET_WINDOW_MS } from "../../../game/engine/roundGeometry.js"

export function useGoldTargetWindow(spawn, isPlaying, getElapsedMs) {
  const [expiredSpawn, setExpiredSpawn] = useState(null)
  const getGoldRemainingMs = useCallback(() => (
    isPlaying && spawn?.isGold
      ? Math.max(0, Math.min(GOLD_TARGET_WINDOW_MS, spawn.spawnedAtMs + GOLD_TARGET_WINDOW_MS - getElapsedMs()))
      : 0
  ), [spawn, isPlaying, getElapsedMs])

  useEffect(() => {
    if (!isPlaying || !spawn?.isGold) return undefined
    let timer
    const sync = () => {
      window.clearTimeout(timer)
      const remaining = getGoldRemainingMs()
      if (remaining > 0) timer = window.setTimeout(sync, remaining)
      else setExpiredSpawn(spawn)
    }
    sync()
    // Re-read the round clock when a throttled tab becomes active again.
    document.addEventListener("visibilitychange", sync)
    window.addEventListener("focus", sync)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener("visibilitychange", sync)
      window.removeEventListener("focus", sync)
    }
  }, [spawn, isPlaying, getGoldRemainingMs])

  return {
    goldRemainingMs: expiredSpawn === spawn ? 0 : getGoldRemainingMs(),
    getGoldRemainingMs,
  }
}
