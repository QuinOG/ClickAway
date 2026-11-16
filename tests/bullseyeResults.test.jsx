import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { FeedbackPreferencesProvider } from "../src/app/FeedbackPreferencesContext.jsx"
import { GameOverFlow } from "../src/features/game/components/roundOverlays/GameOverFlow.jsx"

// Rendered through GameOverFlow (the real path from the game), which passes
// props on one by one; a count it forgot never reached Results.
const results = {
  score: 128, hits: 8, misses: 0, bestStreak: 8, accuracy: "100%", modeLabel: "Casual", selectedModeId: "normal",
  bestScore: 200, playerLevel: 4, playerCoins: 720, playerXpIntoLevel: 30, playerXpToNextLevel: 900,
  roundXpEarned: 60, roundCoinsEarned: 8, allowsCoinRewards: true, allowsLevelProgression: true, roundSaveStatus: "saved",
  onRematch: vi.fn(), onChooseMode: vi.fn(),
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
})
afterEach(() => vi.unstubAllGlobals())

function renderResults(props) {
  return render(<MemoryRouter><FeedbackPreferencesProvider><GameOverFlow {...results} {...props} /></FeedbackPreferencesProvider></MemoryRouter>)
}

test("Results counts the round's bullseyes in the score tally", () => {
  renderResults({ bullseyes: 4 })
  expect(screen.getByText("8 hits · 0 misses · 4 bullseyes")).toBeTruthy()
})

test("a round without bullseyes keeps the plain tally", () => {
  renderResults({ bullseyes: 0 })
  expect(screen.getByText("8 hits · 0 misses")).toBeTruthy()
})


test("Results forwards gold through GameOverFlow and omits an empty gold count", () => {
  renderResults({ bullseyes: 4, goldHits: 2 })
  expect(screen.getByText("8 hits \u00b7 0 misses \u00b7 4 bullseyes \u00b7 2 gold")).toBeTruthy()
})

test("a count of one is singular in the tally", () => {
  renderResults({ hits: 1, misses: 1, bullseyes: 1, goldHits: 1 })
  expect(screen.getByText("1 hit · 1 miss · 1 bullseye · 1 gold")).toBeTruthy()
})

test("the tally says 1 hit, 1 miss and 1 bullseye in the singular", () => {
  renderResults({ hits: 1, misses: 1, bullseyes: 1 })
  expect(screen.getByText("1 hit \u00b7 1 miss \u00b7 1 bullseye")).toBeTruthy()
})
