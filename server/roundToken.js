import { randomUUID } from "node:crypto"

import jwt from "jsonwebtoken"

// Round tokens bind a server-issued RNG seed to a user + mode at round start.
// The client derives button geometry from the seed, which is the groundwork
// for replaying rounds and geometrically validating hits. Practice rounds are
// untimed and can run long, so the expiry is generous.
export const ROUND_TOKEN_LIFETIME_MS = 60 * 60 * 1000

export function createRoundSeed() {
  return Math.floor(Math.random() * 0xffffffff) >>> 0
}

export function signRoundToken({ userId, modeId, seed, challengeId = null, roundId = randomUUID() }, jwtSecret) {
  return jwt.sign(
    {
      sub: String(userId),
      modeId,
      seed,
      purpose: "round",
      // Each token can complete exactly one round; the server records this id
      // when the round's rewards are written.
      roundId,
      // Set when the round races a duel ghost; the seed is then the ghost's.
      challengeId: challengeId ?? null,
    },
    jwtSecret,
    { expiresIn: ROUND_TOKEN_LIFETIME_MS / 1000 }
  )
}

/**
 * Verifies a submitted round token. Returns `{ valid, seed, roundId, issuedAtMs }` on success or
 * `{ valid: false, reason }` when the token is forged, expired, or belongs to
 * a different user/mode.
 */
export function verifyRoundToken(token, { userId, modeId }, jwtSecret) {
  let payload
  try {
    payload = jwt.verify(token, jwtSecret)
  } catch {
    return { valid: false, reason: "Invalid or expired round token." }
  }

  if (payload.purpose !== "round") {
    return { valid: false, reason: "Invalid round token." }
  }
  if (payload.sub !== String(userId)) {
    return { valid: false, reason: "Round token belongs to another user." }
  }
  if (payload.modeId !== modeId) {
    return { valid: false, reason: "Round token was issued for a different mode." }
  }

  if (typeof payload.roundId !== "string" || !payload.roundId) {
    return { valid: false, reason: "Invalid round token." }
  }

  return {
    valid: true,
    seed: Number(payload.seed) >>> 0,
    roundId: payload.roundId,
    issuedAtMs: Number(payload.iat) * 1000,
    challengeId: Number(payload.challengeId) || null,
  }
}
