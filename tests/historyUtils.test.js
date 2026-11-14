import assert from "node:assert/strict"
import { test } from "node:test"

import { buildCareerReactionStats, createHistoryEntry, normalizeHistoryEntry } from "../src/utils/historyUtils.js"

test("no-hit history entries discard legacy reaction values", () => {
  for (const reaction of [0, 120, null, undefined]) {
    const entry = normalizeHistoryEntry({ hits: 0, avgReactionMs: reaction, bestReactionMs: reaction })
    assert.equal(entry.avgReactionMs, null)
    assert.equal(entry.bestReactionMs, null)
  }
  assert.equal(createHistoryEntry({ hits: 0, avgReactionMs: 0 }).avgReactionMs, null)
  assert.equal(normalizeHistoryEntry({ hits: 1, avgReactionMs: 210 }).avgReactionMs, 210)
})

test("career reaction stats exclude legacy no-hit rounds", () => {
  assert.deepEqual(buildCareerReactionStats([
    { hits: 0, avgReactionMs: 0, bestReactionMs: 0 },
    { hits: 2, avgReactionMs: 200, bestReactionMs: 180 },
  ]), { avgReactionMs: 200, bestReactionMs: 180 })
})
