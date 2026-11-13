import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { FeedbackPreferencesProvider } from "../src/app/FeedbackPreferencesContext.jsx"
import { GameOverFlow } from "../src/features/game/components/roundOverlays/GameOverFlow.jsx"

const baseProps = {
  score: 128,
  hits: 24,
  misses: 3,
  bestStreak: 11,
  accuracy: "89%",
  modeLabel: "Casual",
  selectedModeId: "normal",
  bestScore: 110,
  avgReactionMs: 248,
  bestReactionMs: 174,
  playerLevel: 4,
  playerCoins: 720,
  playerXpIntoLevel: 30,
  playerXpToNextLevel: 70,
  roundXpEarned: 42,
  roundCoinsEarned: 18,
  onRematch: vi.fn(),
  onChooseMode: vi.fn(),
}

function renderOutcome(overrides = {}) {
  const props = { ...baseProps, ...overrides }
  render(
    <MemoryRouter>
      <FeedbackPreferencesProvider>
        <GameOverFlow {...props} />
      </FeedbackPreferencesProvider>
    </MemoryRouter>
  )
  return props
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe("B3 outcome and reward continuity", () => {
  test("locks performance before settling earned balances", async () => {
    const user = userEvent.setup()
    const props = renderOutcome({
      allowsCoinRewards: true,
      allowsLevelProgression: true,
    })

    expect(screen.getByRole("heading", { name: "Round Complete" })).not.toBeNull()
    expect(screen.getByText("24 hits · 3 misses")).not.toBeNull()
    expect(screen.getByLabelText("Personal best comparison").textContent).toContain("New best by 18")
    expect(screen.queryByRole("heading", { name: "Rewards Settled" })).toBeNull()
    expect(screen.getByLabelText("Round rewards").textContent).toContain("+18")
    expect(screen.getByLabelText("Level 4 progress")).not.toBeNull()
    expect(screen.getByRole("button", { name: "Play Again" })).not.toBeNull()

    // Rewards settle on the same screen: balance total and next unlock.
    expect(screen.getByLabelText("Round rewards").textContent).toContain("738 total")
    expect(screen.queryByRole("button", { name: "View Rewards" })).toBeNull()
    await user.click(screen.getByRole("button", { name: "Change Mode" }))
    expect(props.onChooseMode).toHaveBeenCalledOnce()
    await user.click(screen.getByRole("button", { name: "Play Again" }))
    expect(props.onRematch).toHaveBeenCalledOnce()
  })

  test("stages a promotion between the outcome and reward settlement", async () => {
    const user = userEvent.setup()
    renderOutcome({
      allowsCoinRewards: true,
      allowsLevelProgression: true,
      allowsRankProgression: true,
      roundRankDelta: 24,
      previousRankProgress: {
        tierLabel: "Bronze III",
        rankOrder: 2,
        rr: 88,
        rrMax: 100,
        isPlacement: false,
      },
      projectedRankProgress: {
        tierLabel: "Silver I",
        rankOrder: 3,
        rr: 12,
        rrMax: 100,
        isPlacement: false,
      },
    })

    await user.click(screen.getByRole("button", { name: "Reveal Rank" }))
    expect(screen.getByRole("heading", { name: "Promotion Secured" })).not.toBeNull()

    expect(screen.getByRole("button", { name: "Play Again" })).not.toBeNull()
    await user.click(screen.getByRole("button", { name: "View Rewards" }))
    expect(screen.getByLabelText(/Rank movement: Bronze III to Silver I/)).not.toBeNull()
    expect(screen.getByRole("button", { name: "Play Again" })).not.toBeNull()
  })

  test("provides a complete static practice outcome without inventing rewards", async () => {
    const user = userEvent.setup()
    const props = renderOutcome({
      modeLabel: "Practice",
      selectedModeId: "easy",
      allowsCoinRewards: false,
      allowsLevelProgression: false,
      allowsRankProgression: false,
      roundXpEarned: 0,
      roundCoinsEarned: 0,
    })

    expect(screen.getByText("Practice result recorded. No economy or rank was changed.")).not.toBeNull()
    expect(screen.queryByText("Rewards Settled")).toBeNull()
    await user.click(screen.getByRole("button", { name: "Play Again" }))
    expect(props.onRematch).toHaveBeenCalledOnce()
  })
})
