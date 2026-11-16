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
  roundSaveStatus: "saved",
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
  test.each(["saving", "failed"])("keeps promotion reveal gated while %s", (roundSaveStatus) => {
    renderOutcome({
      allowsRankProgression: true,
      roundSaveStatus,
      previousRankProgress: { tierLabel: "Bronze III", rankOrder: 2, isPlacement: false },
      projectedRankProgress: { tierLabel: "Silver I", rankOrder: 3, isPlacement: false },
    })
    expect(screen.queryByRole("button", { name: "Reveal Rank" })).toBeNull()
    expect(screen.getByRole("button", { name: "Play Again" })).not.toBeNull()
  })

  test.each(["idle", "failed"])("does not claim rewards or unlocks while save status is %s", (roundSaveStatus) => {
    renderOutcome({ allowsCoinRewards: true, allowsLevelProgression: true, roundSaveStatus, roundXpEarned: 1000 })
    expect(screen.queryByLabelText("Round rewards")).toBeNull()
    expect(screen.queryByLabelText(/Unlocked .*Open Armory/)).toBeNull()
    expect(screen.queryByText(/Level up to/)).toBeNull()
    expect(screen.getByLabelText("Final score 128")).not.toBeNull()
    if (roundSaveStatus === "failed") expect(screen.getByRole("alert").textContent).toContain("couldn't be saved")
  })

  test("shows pending client coins and XP while saving", () => {
    renderOutcome({ allowsCoinRewards: true, allowsLevelProgression: true, roundSaveStatus: "saving" })
    const rewards = screen.getByLabelText("Round rewards")
    expect(rewards.textContent).toContain("+18")
    expect(rewards.textContent).toContain("+42")
    expect(rewards.textContent).toContain("pending")
    expect(screen.getByLabelText("Level 4 progress")).not.toBeNull()
  })

  test.each(["saving", "failed"])("does not claim a practice record when %s", (roundSaveStatus) => {
    renderOutcome({ roundSaveStatus })
    expect(screen.queryByText(/Practice result recorded/)).toBeNull()
    expect(screen.getByText(/Practice round complete/)).not.toBeNull()
  })

  test("locks performance before settling earned balances", async () => {
    const user = userEvent.setup()
    const props = renderOutcome({
      allowsCoinRewards: true,
      allowsLevelProgression: true,
    })

    expect(screen.getByRole("heading", { name: "Round Complete" })).not.toBeNull()
    await user.click(screen.getByText(/Round details/))
    expect(screen.getByText(/24 hits/)).not.toBeNull()
    expect(screen.getByText("+18 over your previous best")).not.toBeNull()
    expect(screen.queryByRole("heading", { name: "Rewards Settled" })).toBeNull()
    expect(screen.getByLabelText("Round rewards").textContent).toContain("+18")
    expect(screen.getByLabelText("Level 4 progress")).not.toBeNull()
    expect(screen.getByRole("button", { name: "Play Again" })).not.toBeNull()

    // Rewards settle on the same screen: balance total and next unlock.
    expect(screen.queryByRole("button", { name: "View Rewards" })).toBeNull()
    await user.click(screen.getByRole("button", { name: "Change Mode" }))
    expect(props.onChooseMode).toHaveBeenCalledOnce()
    await user.click(screen.getByRole("button", { name: "Play Again" }))
    expect(props.onRematch).toHaveBeenCalledOnce()
  })

  test("stages a promotion between the outcome and reward settlement", async () => {
    const user = userEvent.setup()
    // A promotion is only revealed once the server has confirmed the save.
    renderOutcome({
      allowsCoinRewards: true,
      allowsLevelProgression: true,
      allowsRankProgression: true,
      roundSaveStatus: "saved",
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

describe("next-round goal", () => {
  test("a saved near miss names the gap above Play Again", () => {
    renderOutcome({ score: 104, bestScore: 110 , allowsCoinRewards: true, allowsLevelProgression: true })
    expect(screen.getByText(/6 points off your best/)).toBeTruthy()
  })

  test("nothing before the save is confirmed or when the best is far away", () => {
    renderOutcome({ score: 104, bestScore: 110, roundSaveStatus: "saving" , allowsCoinRewards: true, allowsLevelProgression: true })
    expect(screen.queryByText(/off your best/)).toBeNull()
  })

  test("a far miss shows no goal line", () => {
    renderOutcome({ score: 40, bestScore: 110 , allowsCoinRewards: true, allowsLevelProgression: true })
    expect(screen.getByText(/Next round/)).toBeTruthy()
  })
})

test("an unlocked powerup's Equip opens the Armory's powerup keys", () => {
  renderOutcome({ playerLevel: 1, playerXpIntoLevel: 0, playerXpToNextLevel: 100, roundXpEarned: 160, allowsCoinRewards: true, allowsLevelProgression: true })
  const link = screen.getByLabelText(/Unlocked Magnet Center/)
  expect(link.getAttribute("href")).toBe("/armory?step=hotbar&powerSlot=1")
})

function continuityTree(overrides) {
  return <MemoryRouter><FeedbackPreferencesProvider><GameOverFlow {...baseProps} allowsCoinRewards allowsLevelProgression {...overrides} /></FeedbackPreferencesProvider></MemoryRouter>
}

test("pending rewards swap to server totals without remounting score or loot", () => {
  const view = render(continuityTree({ roundSaveStatus: "saving" }))
  const score = screen.getByLabelText("Final score 128")
  const loot = screen.getByLabelText("Round rewards")
  const coins = loot.querySelector(".isCoins")
  view.rerender(continuityTree({ roundSaveStatus: "saved", roundCoinsEarned: 30, roundXpEarned: 90 }))
  expect(screen.getByLabelText("Final score 128")).toBe(score)
  expect(screen.getByLabelText("Round rewards")).toBe(loot)
  expect(loot.querySelector(".isCoins")).toBe(coins)
  expect(coins.textContent).toContain("+30")
  expect(loot.textContent).toContain("+90")
  expect(loot.textContent).not.toContain("pending")
})

test("normal result keeps details collapsed and the replay focused", async () => {
  renderOutcome({ score: 100, allowsCoinRewards: true, allowsLevelProgression: true, loadoutSnapshot: { loadoutName: "Test loadout" } })
  expect(screen.getByText("Personal best 110")).toBeTruthy()
  const details = screen.getByText(/Round details/).closest("details")
  expect(details.open).toBe(false)
  await userEvent.setup().click(screen.getByText(/Round details/))
  expect(details.open).toBe(true)
  expect(screen.getByText(/Test loadout/)).toBeTruthy()
  for (const label of ["Accuracy", "Streak", "Avg speed", "Fastest", "Vs best"]) expect(screen.getByText(label)).toBeTruthy()
  await userEvent.setup().click(screen.getByText(/Round details/))
  expect(details.open).toBe(false)
})

test("rank RR is inline and rank, goal, unlock events are capped at two", () => {
  renderOutcome({ allowsCoinRewards: true, allowsLevelProgression: true, allowsRankProgression: true, roundRankDelta: 18,
    playerLevel: 1, roundXpEarned: 1000,
    previousRankProgress: { rankOrder: 1 }, projectedRankProgress: { rankOrder: 2, tierLabel: "Silver I" },
    roundDailyGoals: { goals: [{ id: "goal", label: "Play 3 rounds", reward: { coins: 40 } }] },
  })
  expect(screen.getByLabelText("Round rewards").textContent).toContain("+18 RR")
  const events = screen.getByLabelText("Round events")
  expect(events.children).toHaveLength(2)
  expect(events.textContent).toContain("Rank up: Silver I")
  expect(events.textContent).toContain("Daily goal done: Play 3 rounds")
  expect(events.textContent).not.toContain("Unlocked:")
  expect(events.textContent).not.toContain("Now affordable")
})

test("logged out round keeps sign-in copy and claims no rewards", () => {
  renderOutcome({ allowsCoinRewards: true, allowsLevelProgression: true, roundSaveStatus: "idle", roundSaveNote: "Sign in to save your progress." })
  expect(screen.getByText("Sign in to save your progress.")).toBeTruthy()
  expect(screen.queryByLabelText("Round rewards")).toBeNull()
  expect(screen.queryByLabelText("Round events")).toBeNull()
})
