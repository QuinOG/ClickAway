// Deadline and events use the same elapsed milliseconds. Freeze affects only
// movement; Time Boost extends this deadline exactly as the server replays it.
export function createRoundClock(durationSeconds, maxTimeBufferSeconds, now = Date.now) {
  // Wall time keeps counting through tab suspension and sleep, which the round
  // needs. If the system clock is set back, shift the start by the same amount so
  // elapsed time never decreases: no extra time, and event times stay in order.
  let startedAt = now()
  let lastReading = startedAt
  let deadlineMs = durationSeconds * 1000
  const elapsedMs = () => {
    const reading = now()
    if (reading < lastReading) startedAt -= lastReading - reading
    lastReading = reading
    return Math.max(0, reading - startedAt)
  }
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
