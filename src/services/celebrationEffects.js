let confettiModulePromise = null
let activeConfetti = null
let celebrationGeneration = 0

function loadConfetti() {
  if (!confettiModulePromise) {
    confettiModulePromise = import("canvas-confetti")
      .then((module) => module.default)
      .catch(() => null)
  }
  return confettiModulePromise
}

function canShowCelebration() {
  if (typeof document === "undefined") return false
  return document.visibilityState !== "hidden"
    && document.documentElement.dataset.flashes !== "reduced"
    && document.documentElement.dataset.motionReduced !== "true"
}

export function fireConfetti(options) {
  if (!canShowCelebration()) return false
  const requestedGeneration = celebrationGeneration

  void loadConfetti().then((confetti) => {
    if (
      !confetti
      || requestedGeneration !== celebrationGeneration
      || !canShowCelebration()
    ) return

    activeConfetti = confetti
    try {
      confetti({
        disableForReducedMotion: true,
        ...options,
      })
    } catch {
      // Celebration is presentation-only and never interrupts a player action.
    }
  })
  return true
}

export function cancelCelebrationEffects() {
  celebrationGeneration += 1
  try {
    activeConfetti?.reset()
  } catch {
    // Canvas effects are optional and never surface failures to the player.
  }
}
