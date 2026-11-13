// Shared 1-10 ratings for a build's round rules (spec sheet, lobby build card).
// powerupAwardMultiplier scales the hits needed per charge, so lower is faster
// and rates higher.
export function getRating(value, low, high, invert = false) {
  const ratio = Math.min(1, Math.max(0, (Number(value) - low) / (high - low)))
  return Math.max(1, Math.round((invert ? 1 - ratio : ratio) * 10))
}

export function formatPayout(multiplier) {
  const percent = Math.round((Number(multiplier) - 1) * 100)
  return percent === 0 ? "±0%" : `${percent > 0 ? "+" : ""}${percent}%`
}

export function getProfileStats(roundRules) {
  return [
    { key: "size", label: "Target size", rating: getRating(roundRules.initialButtonSize, 60, 140), value: `${roundRules.initialButtonSize}px` },
    { key: "floor", label: "Floor size", rating: getRating(roundRules.minButtonSize, 4, 34), value: `${roundRules.minButtonSize}px` },
    { key: "shrink", label: "Shrink control", rating: getRating(roundRules.shrinkFactor, 0.9, 1), value: `x${Number(Number(roundRules.shrinkFactor).toFixed(3))}` },
    { key: "combo", label: "Combo speed", rating: getRating(roundRules.comboStep, 2, 9, true), value: `every ${roundRules.comboStep}` },
    { key: "miss", label: "Miss forgiveness", rating: getRating(roundRules.missPenalty, 0, 5, true), value: roundRules.missPenalty > 0 ? `-${roundRules.missPenalty}` : "0" },
    { key: "charge", label: "Charge rate", rating: getRating(roundRules.powerupAwardMultiplier, 0.5, 1.6, true), value: `x${Number(roundRules.powerupAwardMultiplier).toFixed(2)}` },
    { key: "payout", label: "Score payout", rating: getRating(roundRules.scoreMultiplier, 0.7, 1.3), value: formatPayout(roundRules.scoreMultiplier) },
  ]
}
