import assert from "node:assert/strict"
import { test } from "node:test"
import { AUTHENTICATED_ROUTES } from "../src/app/routeMetadata.js"
import { DIFFICULTIES } from "../src/constants/gameModesConfig.js"
import { DIFFICULTY_ROWS, NAVIGATION_ROWS } from "../src/features/help/helpPageStructuredContent.js"

test("Help navigation covers every authenticated destination by its shell label", () => {
  const labels = NAVIGATION_ROWS.map(([label]) => label)
  for (const route of AUTHENTICATED_ROUTES) assert.ok(labels.includes(route.label), route.label)
})

test("Help base mode rules agree with the rules used by live rounds", () => {
  for (const mode of DIFFICULTIES) {
    const row = DIFFICULTY_ROWS.find(([label]) => label === mode.label)
    assert.deepEqual(row, [
      mode.label,
      mode.isTimedRound ? `${mode.durationSeconds}s` : "No limit",
      String(mode.missPenalty),
      mode.allowsCoinRewards ? `${mode.coinMultiplier.toFixed(2)}x` : "Off",
      mode.allowsLevelProgression ? "On" : "Off",
      mode.allowsRankProgression ? "On" : "Off",
    ])
  }
})
