// Deadline and events use the same elapsed milliseconds. Freeze affects only
// movement; Time Boost extends this deadline exactly as the server replays it.
export function createRoundClock(durationSeconds, maxTimeBufferSeconds, now = Date.now) {
  const startedAt = now()
  let deadlineMs = durationSeconds * 1000
  const elapsedMs = () => Math.max(0, now() - startedAt)
  const remainingMs = () => Math.max(0, deadlineMs - elapsedMs())
  return {
    elapsedMs,
    remainingMs,
    secondsLeft: () => Math.ceil(remainingMs() / 1000),
    boost: () => {
      const elapsed = elapsedMs()
      deadlineMs = elapsed + Math.min(maxTimeBufferSeconds * 1000, Math.max(0, deadlineMs - elapsed) + 2000)
    },
  }
}
