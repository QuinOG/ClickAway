import { useEffect, useState } from "react"
import { GOLD_TARGET_WINDOW_MS } from "../../../game/engine/roundGeometry.js"

// Read the round clock again after throttling or returning to the tab.
export function useGoldTargetWindow(spawn, isPlaying, getElapsedMs) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!isPlaying || !spawn?.isGold) return undefined
    let timer
    const sync = () => {
      const now = getElapsedMs()
      setElapsed(now)
      const remaining = spawn.spawnedAtMs + GOLD_TARGET_WINDOW_MS - now
      if (remaining > 0) timer = window.setTimeout(sync, Math.min(50, remaining))
    }
    sync()
    return () => window.clearTimeout(timer)
  }, [spawn, isPlaying, getElapsedMs])
  return isPlaying && spawn?.isGold
    ? Math.max(0, GOLD_TARGET_WINDOW_MS - (Math.max(elapsed, spawn.spawnedAtMs) - spawn.spawnedAtMs))
    : 0
}
