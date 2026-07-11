// Deterministic PRNG (mulberry32). The same seed always yields the same
// sequence, which is what lets a server-issued seed reproduce a round's
// button geometry for future replay/verification work.
export function createSeededRng(seed) {
  let state = (Number(seed) >>> 0) || 1

  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createRandomSeed() {
  return Math.floor(Math.random() * 0xffffffff) >>> 0
}
