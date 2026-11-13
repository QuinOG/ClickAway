import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, test, vi } from "vitest"

import HistoryPage from "../src/pages/HistoryPage.jsx"
import { fetchHistoryPage } from "../src/services/clickAwayHttpApiClient.js"

vi.mock("../src/services/clickAwayHttpApiClient.js", () => ({
  fetchHistoryPage: vi.fn(),
}))

function round(id, modeId, score) {
  return {
    id, modeId, score,
    playedAtIso: "2026-11-10T12:00:00.000Z",
    hits: 9, misses: 1, accuracyPercent: 90, bestStreak: 5,
    coinsEarned: 10, xpEarned: 15, rankDelta: modeId === "hard" ? 8 : 0,
  }
}

// Latest round is Casual, so the chart defaults to Casual.
const mixedRounds = [
  round("casual-new", "normal", 202),
  round("ranked-new", "hard", 303),
  round("ranked-old", "hard", 280),
]

function renderHistory(rounds = mixedRounds) {
  return render(<MemoryRouter><HistoryPage roundHistory={rounds} /></MemoryRouter>)
}

const logScores = () => Array.from(
  screen.getByRole("region", { name: "Full match log" }).querySelectorAll("tbody .historyScoreCell"),
  (cell) => cell.textContent,
)
const chartHeading = () => screen.getByRole("heading", { name: /trajectory$/ }).textContent

beforeEach(() => fetchHistoryPage.mockReset())

describe("History page has one mode choice", () => {
  test("one set of mode buttons, placed before the chart and the log", () => {
    renderHistory()
    expect(screen.getAllByRole("button", { name: "Ranked", exact: true })).toHaveLength(1)
    const group = screen.getByRole("group", { name: /mode/i })
    const chart = document.querySelector(".historyTrajectory")
    const log = screen.getByRole("region", { name: "Full match log" })
    expect(group.compareDocumentPosition(chart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(group.compareDocumentPosition(log) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(group.textContent).toMatch(/trend/i)
    expect(group.textContent).toMatch(/log|matches/i)
  })

  test("choosing a mode changes both the chart and the log, and All restores the log", async () => {
    const user = userEvent.setup()
    renderHistory()
    expect(chartHeading()).toBe("Casual trajectory")
    expect(logScores()).toEqual(["202", "303", "280"])

    await user.click(screen.getByRole("button", { name: "Ranked", exact: true }))
    expect(chartHeading()).toBe("Ranked trajectory")
    expect(logScores()).toEqual(["303", "280"])

    await user.click(screen.getByRole("button", { name: "All", exact: true }))
    expect(logScores()).toEqual(["202", "303", "280"])
    expect(chartHeading()).toBe("Casual trajectory")
    expect(screen.getByText(/score trend shows your latest mode \(Casual\)/i)).toBeTruthy()
  })

  test("a mode with no rounds shows both empty states and a way back", async () => {
    const user = userEvent.setup()
    renderHistory()
    await user.click(screen.getByRole("button", { name: "Practice", exact: true }))
    expect(chartHeading()).toBe("Practice trajectory")
    expect(screen.getByText("No Practice rounds in loaded history")).toBeTruthy()
    expect(screen.getByRole("region", { name: /no Practice rounds in loaded history/ })).toBeTruthy()
    expect(screen.getByText("No Practice rounds in the loaded matches.")).toBeTruthy()
    await user.click(screen.getByRole("button", { name: "Show all rounds" }))
    expect(logScores()).toEqual(["202", "303", "280"])
    expect(screen.getByRole("button", { name: "All", exact: true }).getAttribute("aria-pressed")).toBe("true")
  })

  test("empty history keeps its Play a Round action and shows no mode buttons", () => {
    renderHistory([])
    expect(screen.queryByRole("button", { name: "Ranked", exact: true })).toBeNull()
    expect(screen.getByRole("link", { name: /Play a Round/i })).toBeTruthy()
  })
})
