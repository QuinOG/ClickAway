import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { FeedbackPreferencesProvider } from "../src/app/FeedbackPreferencesContext.jsx"
import { DIFFICULTIES } from "../src/constants/gameModesConfig.js"
import { GameOverFlow } from "../src/features/game/components/roundOverlays/GameOverFlow.jsx"
import { ReadyOverlay } from "../src/features/game/components/roundOverlays/ReadyOverlay.jsx"
import { getDailyGoals, normalizeDailyGoals } from "../src/utils/dailyGoals.js"

const NOW = Date.UTC(2026, 10, 15, 18, 30)
const dailyGoals = normalizeDailyGoals({
  day: "2026-11-15",
  resetsAt: "2026-11-16T00:00:00.000Z",
  goals: [
    { id: "rounds-3", label: "Play 3 rounds", target: 3, progress: 3, reward: { coins: 40, xp: 80 } },
    { id: "streak-20", label: "Hit a 20 streak", target: 20, progress: 14, reward: { coins: 60, xp: 120 } },
    { id: "hits-100", label: "Land 100 hits", target: 100, progress: 46, reward: { coins: 50, xp: 100 } },
  ],
})

function wrap(node) {
  return render(<MemoryRouter><FeedbackPreferencesProvider>{node}</FeedbackPreferencesProvider></MemoryRouter>)
}

function renderLobby(overrides = {}) {
  return wrap(
    <ReadyOverlay modes={DIFFICULTIES} selectedModeId="normal" onSelectMode={vi.fn()} onStart={vi.fn()} dailyGoals={dailyGoals} {...overrides} />
  )
}

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("Daily goals in the lobby", () => {
  test("lists each goal with progress, reward and the time to new goals", () => {
    renderLobby()
    const goals = screen.getByRole("region", { name: "Daily goals" })
    expect(within(goals).getByText("Daily goals · 1/3")).toBeTruthy()
    expect(within(goals).getByText("New goals in 5h")).toBeTruthy()
    const rows = within(goals).getAllByRole("listitem")
    expect(rows.map((row) => row.querySelector(".lobbyDailyGoalProgress").textContent)).toEqual(["Done", "14/20", "46/100"])
    expect(rows[0].className).toContain("isComplete")
    expect(within(rows[1]).getByText("Reward: 60 coins and 120 XP")).toBeTruthy()
    expect(within(rows[1]).getByText(", 14 of 20")).toBeTruthy()
  })

  test("keeps the reset time with the double-XP note, and the phone line above Start", () => {
    renderLobby({ dailyBonusAvailable: true })
    const goals = screen.getByRole("region", { name: "Daily goals" })
    expect(within(goals).getByText("New goals in 5h")).toBeTruthy()
    expect(within(goals).getByText("Your first round today earns 2× XP.")).toBeTruthy()
    // Hidden on wide screens by CSS (hasDailyGoals); phones still see it above Start.
    expect(screen.getByText("First round today earns double XP").className).toContain("hasDailyGoals")
  })

  test("says Practice doesn't count while Practice is selected", async () => {
    const user = userEvent.setup({ advanceTimers: () => {} })
    renderLobby()
    await user.click(screen.getByRole("button", { name: /Practice/ }))
    const goals = screen.getByRole("region", { name: "Daily goals" })
    expect(within(goals).getByText("Practice rounds don't count toward goals.")).toBeTruthy()
    expect(within(goals).getByText("New goals in 5h")).toBeTruthy()
  })

  test("the phone summary names the next unfinished goal", () => {
    const { container } = renderLobby()
    expect(container.querySelector(".lobbyDailyGoalsSummary").textContent).toBe("Daily goals 1/3Hit a 20 streak · 14/20")
  })

  test("an open lobby moves its countdown and drops goals once their day ends", () => {
    vi.useFakeTimers({ now: Date.UTC(2026, 10, 15, 23, 58), toFake: ["Date", "setInterval", "clearInterval"] })
    const { container } = renderLobby()
    const goals = screen.getByRole("region", { name: "Daily goals" })
    expect(within(goals).getByText("New goals in 2m")).toBeTruthy()
    act(() => vi.advanceTimersByTime(3 * 60000))
    expect(within(screen.getByRole("region", { name: "Daily goals" })).getByText("New goals are ready. They'll show after your next round.")).toBeTruthy()
    expect(screen.queryByText("Hit a 20 streak")).toBeNull()
    expect(container.querySelector(".lobbyDailyGoalsSummary").textContent).toBe("Daily goalsNew goals after your next round")
  })

  test("without goals from the server the lobby is unchanged", () => {
    renderLobby({ dailyGoals: null, dailyBonusAvailable: true })
    expect(screen.queryByRole("region", { name: "Daily goals" })).toBeNull()
    expect(screen.getByText("First round today earns double XP")).toBeTruthy()
  })
})

describe("Daily goals on Results", () => {
  const results = {
    score: 128, hits: 24, misses: 3, bestStreak: 21, accuracy: "89%", modeLabel: "Casual", selectedModeId: "normal",
    bestScore: 110, playerLevel: 4, playerCoins: 720, playerXpIntoLevel: 30, playerXpToNextLevel: 900,
    roundXpEarned: 162, roundCoinsEarned: 78, allowsCoinRewards: true, allowsLevelProgression: true,
    onRematch: vi.fn(), onChooseMode: vi.fn(),
  }
  const finished = { goals: [{ id: "streak-20", label: "Hit a 20 streak", reward: { coins: 60, xp: 120 } }], coins: 60, xp: 120 }

  test("shows each goal the round finished, once the round is saved", () => {
    wrap(<GameOverFlow {...results} roundSaveStatus="saved" roundDailyGoals={finished} />)
    const list = screen.getByRole("list", { name: "Daily goals completed" })
    expect(within(list).getByText("Hit a 20 streak")).toBeTruthy()
    expect(within(list).getByText("+60 coins · +120 XP")).toBeTruthy()
  })

  test("points Play Again at a daily goal one more round would finish", () => {
    const nearGoals = normalizeDailyGoals({
      day: "2026-11-15",
      resetsAt: "2026-11-16T00:00:00.000Z",
      goals: getDailyGoals("2026-11-15").map((goal, index) => ({ ...goal, progress: index === 0 ? goal.target - 1 : 0 })),
    })
    const [showUp] = getDailyGoals("2026-11-15")
    const { container } = wrap(<GameOverFlow {...results} bestScore={0} roundSaveStatus="saved" dailyGoals={nearGoals} />)
    expect(container.querySelector(".gameOverNextGoal").textContent)
      .toBe(`One more round like that finishes today's goal: ${showUp.label} (+${showUp.reward.coins} coins).`)
  })

  test("doesn't point Play Again at the goal this round just finished", () => {
    // Goals still one short: the post-save progress read didn't land.
    const staleGoals = normalizeDailyGoals({
      day: "2026-11-15",
      resetsAt: "2026-11-16T00:00:00.000Z",
      goals: getDailyGoals("2026-11-15").map((goal, index) => ({ ...goal, progress: index === 0 ? goal.target - 1 : 0 })),
    })
    const [showUp] = getDailyGoals("2026-11-15")
    const justFinished = { goals: [{ id: showUp.id, label: showUp.label, reward: showUp.reward }], ...showUp.reward }
    const { container } = wrap(<GameOverFlow {...results} bestScore={0} roundSaveStatus="saved" dailyGoals={staleGoals} roundDailyGoals={justFinished} />)
    expect(container.querySelector(".gameOverNextGoal")?.textContent ?? "").not.toContain(showUp.label)
  })

  test("shows nothing while saving or when no goal was finished", () => {
    const { unmount } = wrap(<GameOverFlow {...results} roundSaveStatus="saving" roundDailyGoals={finished} />)
    expect(screen.queryByRole("list", { name: "Daily goals completed" })).toBeNull()
    unmount()
    wrap(<GameOverFlow {...results} roundSaveStatus="saved" roundDailyGoals={null} />)
    expect(screen.queryByRole("list", { name: "Daily goals completed" })).toBeNull()
  })
})
