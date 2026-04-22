import confetti from "canvas-confetti"

function prefersReducedMotion() {
  if (typeof window === "undefined") return true
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/** Short burst for a new cosmetic purchase (high-impact). */
export function celebrateShopPurchase() {
  if (prefersReducedMotion()) return

  const colors = ["#6af5c8", "#4ab8ff", "#ffffff", "#c084fc", "#ffd76a"]

  const burst = (originX) => {
    confetti({
      particleCount: 44,
      spread: 62,
      startVelocity: 36,
      angle: 90,
      origin: { x: originX, y: 0.94 },
      colors,
      decay: 0.89,
      zIndex: 9999,
      ticks: 190,
    })
  }

  burst(0.32)
  burst(0.68)
}

/** Lighter sparkle when equipping an already-owned item. */
export function celebrateShopEquip() {
  if (prefersReducedMotion()) return

  confetti({
    particleCount: 16,
    spread: 48,
    startVelocity: 24,
    angle: 90,
    origin: { x: 0.5, y: 0.9 },
    colors: ["#80f2be", "#4ab8ff", "#ffffff"],
    decay: 0.88,
    zIndex: 9999,
    ticks: 130,
  })
}
