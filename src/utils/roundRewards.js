/**
 * Converts round hit count into earned coins.
 * @param {number} clicksScored
 * @param {number} coinMultiplier
 * @returns {number}
 */
export function calculateRoundCoins(clicksScored, coinMultiplier = 1) {
  const normalizedMultiplier = Number.isFinite(coinMultiplier)
    ? Math.max(0, coinMultiplier)
    : 1
  return Math.max(0, Math.floor(clicksScored * normalizedMultiplier))
}
