// Exact numeric readout for each build instrument, derived from round rules.
export function getExactMetric(label, rules = {}) {
  if (label === "Aim Window") {
    return { value: Number(rules.initialButtonSize) || 0, text: `${Number(rules.initialButtonSize) || 0}px`, digits: 0, suffix: "px" }
  }
  if (label === "Shrink Pace") {
    const value = (1 - (Number(rules.shrinkFactor) || 1)) * 100
    return { value, text: `${value.toFixed(1)}% / hit`, digits: 1, suffix: "%" }
  }
  if (label === "Combo Ramp") {
    const value = Number(rules.comboStep) || 0
    return { value, text: `every ${value} hits`, digits: 0, suffix: " hits" }
  }
  if (label === "Miss Cost") {
    const value = Number(rules.missPenalty) || 0
    return { value, text: `${value} ${value === 1 ? "point" : "points"}`, digits: 0, suffix: " pts" }
  }

  const value = Number(rules.powerupAwardMultiplier) || 1
  const charges = Number(rules.startingPowerupCharges) || 0
  return {
    value,
    text: charges > 0 ? `x${value.toFixed(2)} · ${charges} ready` : `x${value.toFixed(2)} cadence`,
    digits: 2,
    suffix: "x",
  }
}
