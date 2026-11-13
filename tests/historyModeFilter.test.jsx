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

const mixedRounds = [
  round("ranked-new", "hard", 303),
  round("casual-new", "normal", 202),
  round("practice-new", "easy", 101),
]

function renderHistory(props = {}) {
  return render(<MemoryRouter><HistoryPage roundHistory={mixedRounds} {...props} /></MemoryRouter>)
}

function logSection() {
  return screen.getByRole("region", { name: "Full match log" })
}

function filter() {
  return within(logSection()).getByRole("group", { name: "Filter match log by mode" })
}

function tableScores() {
  return Array.from(logSection().querySelectorAll("tbody .historyScoreCell"), (cell) => cell.textContent)
}

function cardScores() {
  return Array.from(within(logSection()).getByLabelText("Match cards").querySelectorAll(".historyRoundCardScore"), (cell) => cell.textContent)
}

beforeEach(() => fetchHistoryPage.mockReset())

describe("History match-log mode selection", () => {
  test("finds one mode in the table and cards, then returns to all rounds", async () => {
    const user = userEvent.setup()
    renderHistory()
    expect(tableScores()).toEqual(["303", "202", "101"])
    for (const [mode, score] of [["Ranked", "303"], ["Casual", "202"], ["Practice", "101"]]) {
      await user.click(within(filter()).getByRole("button", { name: mode, exact: true }))
      expect(tableScores()).toEqual([score])
      expect(cardScores()).toEqual([score])
      expect(within(filter()).getByRole("button", { name: mode }).getAttribute("aria-pressed")).toBe("true")
      expect(within(logSection()).getByRole("status").textContent).toContain("1 of 3 loaded rounds")
    }
    await user.click(within(filter()).getByRole("button", { name: "All", exact: true }))
    expect(tableScores()).toEqual(["303", "202", "101"])
    expect(cardScores()).toEqual(["303", "202", "101"])
    expect(fetchHistoryPage).not.toHaveBeenCalled()
  })

  test("keeps the selection while older matching rounds arrive and deduplicates them", async () => {
    const user = userEvent.setup()
    fetchHistoryPage.mockResolvedValue({ entries: [mixedRounds[0], round("casual-old", "normal", 404), round("ranked-old", "hard", 505)], hasMore: false })
    renderHistory({ totalRoundCount: 5 })
    await user.click(within(filter()).getByRole("button", { name: "Ranked", exact: true }))
    await user.click(within(logSection()).getByRole("button", { name: "Load older rounds" }))
    expect(fetchHistoryPage).toHaveBeenCalledWith({ page: 2 })
    expect(tableScores()).toEqual(["303", "505"])
    expect(cardScores()).toEqual(["303", "505"])
    expect(within(filter()).getByRole("button", { name: "Ranked" }).getAttribute("aria-pressed")).toBe("true")
    expect(within(logSection()).getByRole("status").textContent).toContain("2 of 5 loaded rounds")
  })

  test("distinguishes no loaded matches from an empty archive and allows recovery", async () => {
    const user = userEvent.setup()
    fetchHistoryPage.mockResolvedValue({ entries: [round("practice-old", "easy", 606)], hasMore: false })
    renderHistory({ roundHistory: [mixedRounds[0]], totalRoundCount: 2 })
    await user.click(within(filter()).getByRole("button", { name: "Practice", exact: true }))
    expect(within(logSection()).getByText("No Practice rounds in the loaded matches.")).not.toBeNull()
    expect(tableScores()).toEqual([])
    await user.click(within(logSection()).getByRole("button", { name: "Load older rounds" }))
    expect(tableScores()).toEqual(["606"])
    expect(cardScores()).toEqual(["606"])
    expect(within(logSection()).queryByText("No Practice rounds in the loaded matches.")).toBeNull()
    await user.click(within(filter()).getByRole("button", { name: "All", exact: true }))
    expect(tableScores()).toEqual(["303", "606"])
  })

  test("offers All when no matching rounds exist in a fully loaded archive", async () => {
    const user = userEvent.setup()
    renderHistory({ roundHistory: [mixedRounds[0]] })
    await user.click(within(filter()).getByRole("button", { name: "Practice", exact: true }))
    expect(within(logSection()).queryByRole("button", { name: "Load older rounds" })).toBeNull()
    await user.click(within(logSection()).getByRole("button", { name: "Show all rounds" }))
    expect(tableScores()).toEqual(["303"])
  })

  test("retries an older-match failure without losing the chosen mode", async () => {
    const user = userEvent.setup()
    fetchHistoryPage.mockRejectedValueOnce(new Error("Connection lost")).mockResolvedValueOnce({ entries: [round("ranked-old", "hard", 505)], hasMore: false })
    renderHistory({ totalRoundCount: 4 })
    await user.click(within(filter()).getByRole("button", { name: "Ranked", exact: true }))
    await user.click(within(logSection()).getByRole("button", { name: "Load older rounds" }))
    expect(within(logSection()).getByRole("alert").textContent).toBe("Connection lost")
    expect(tableScores()).toEqual(["303"])
    await user.click(within(logSection()).getByRole("button", { name: "Load older rounds" }))
    expect(tableScores()).toEqual(["303", "505"])
    expect(fetchHistoryPage).toHaveBeenNthCalledWith(2, { page: 2 })
    expect(within(logSection()).queryByRole("alert")).toBeNull()
  })

  test("keeps the first-round action and chart selection separate from the log", async () => {
    const user = userEvent.setup()
    const empty = renderHistory({ roundHistory: [] })
    expect(screen.getByRole("link", { name: "Play a Round" }).getAttribute("href")).toBe("/game")
    expect(screen.queryByRole("region", { name: "Full match log" })).toBeNull()
    empty.unmount()
    renderHistory()
    const chart = screen.getByRole("region", { name: /score trajectory across/i })
    const chartBefore = chart.textContent
    await user.click(within(filter()).getByRole("button", { name: "Practice", exact: true }))
    expect(chart.textContent).toBe(chartBefore)
  })
})
