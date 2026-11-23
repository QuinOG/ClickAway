import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, expect, test, vi } from "vitest"
import LeaderboardPage from "../src/pages/LeaderboardPage.jsx"
import { fetchLeaderboard } from "../src/services/clickAwayHttpApiClient.js"

vi.mock("../src/services/clickAwayHttpApiClient.js", () => ({ fetchLeaderboard: vi.fn() }))
const placed = { mmr: 1600, tierLabel: "Deadeye", isUnranked: false, isPlacement: false }
const season = { id: 1, name: "Season 1", startsAt: "2026-11-01", endsAt: "2027-02-01", stats: { rankedRounds: 83, peakMmr: 1600, rewardTier: 6 } }
const player = { rank: 1, userId: 7, username: "Vector", mmr: 1600, rankedRounds: 80 }
const result = { rows: [player], page: 1, totalPages: 1, totalCount: 1, selfRank: 1, season }
const show = (props = {}) => render(<MemoryRouter><LeaderboardPage isAuthed currentUserId={7} currentUsername="Vector" currentRankProgress={placed} {...props} /></MemoryRouter>)
beforeEach(() => { fetchLeaderboard.mockReset() })

test("unplaced Around Me keeps placement guidance during a search", async () => {
  fetchLeaderboard.mockResolvedValue({ ...result, rows: [], selfRank: null })
  const user = userEvent.setup()
  show({ currentRankProgress: { isUnranked: true, tierLabel: "Unranked" } })
  await screen.findByText("No ranked players yet.")
  await user.type(screen.getByRole("searchbox"), "Nova")
  await screen.findByText(/No players match/)
  await user.click(screen.getByRole("button", { name: "Around Me" }))
  expect(await screen.findByText("You don't have a Ladder spot yet.")).toBeTruthy()
  expect(screen.queryByText(/Around Me found no players/)).toBeNull()
})

test("placed players without a reaction measurement get reaction guidance", async () => {
  fetchLeaderboard.mockImplementation(async ({ board } = {}) => board === "reaction"
    ? { ...result, rows: [], selfRank: null } : result)
  const user = userEvent.setup()
  show()
  await screen.findByRole("list", { name: /Ladder sorted/ })
  await user.click(screen.getByRole("tab", { name: "Reaction" }))
  await screen.findByText("No reaction time recorded")
  const standing = screen.getByRole("region", { name: "Your leaderboard standing" })
  expect(within(standing).queryByText("UNRANKED")).toBeNull()
  expect(within(standing).getAllByText("--").length).toBeGreaterThan(0)
  await user.click(screen.getByRole("button", { name: "Around Me" }))
  await waitFor(() => expect(screen.getAllByText("Record a reaction time to join this board.")).toHaveLength(2))
  expect(screen.queryByText(/Finish your placement matches/)).toBeNull()
})

test("standing summary uses server season rounds rather than loaded history", async () => {
  fetchLeaderboard.mockResolvedValue(result)
  show({ roundHistory: [{ progressionMode: "ranked", modeId: "hard" }] })
  const panel = await screen.findByRole("region", { name: "Your leaderboard standing" })
  await waitFor(() => expect(fetchLeaderboard).toHaveBeenCalled())
  expect(within(panel).getByText("This season")).toBeTruthy()
  expect(within(panel).getByText("83")).toBeTruthy()
})

test("run 5 Deadeye crest and reward appear for top-ranked players", async () => {
  fetchLeaderboard.mockResolvedValue(result)
  show()
  await screen.findByRole("list", { name: /Ladder sorted/ })
  expect(document.querySelector('.leaderboardPodiumCrest img').getAttribute("src")).toBe("/art/ranks/deadeye.png")
  expect(document.querySelector('.ladderPlayerHoverCard .profileHoverRankIcon').getAttribute("src")).toBe("/art/ranks/deadeye.png")
  const panel = screen.getByRole("region", { name: "Your leaderboard standing" })
  expect(within(within(panel).getByText("Reward").closest("article")).getByText("Deadeye")).toBeTruthy()
})

test("season rewards retain peak after rating drops", async () => {
  fetchLeaderboard.mockResolvedValue(result)
  show({ currentRankProgress: { ...placed, mmr: 10 } })
  await screen.findByRole("list", { name: /Ladder sorted/ })
  const panel = screen.getByRole("region", { name: "Your leaderboard standing" })
  expect(within(within(panel).getByText("Reward").closest("article")).getByText("Deadeye")).toBeTruthy()
})

test("a new season has no reward despite the carried rating", async () => {
  fetchLeaderboard.mockResolvedValue({ ...result, season: { ...season, stats: { rankedRounds: 0, peakMmr: 0, rewardTier: 0 } } })
  show()
  await screen.findByRole("list", { name: /Ladder sorted/ })
  const panel = screen.getByRole("region", { name: "Your leaderboard standing" })
  expect(within(within(panel).getByText("Reward").closest("article")).getByText("None yet")).toBeTruthy()
})


test("Ladder shows a recorded zero reaction time and keeps missing values empty", async () => {
  fetchLeaderboard.mockResolvedValue({ ...result, rows: [
    { ...player, bestReactionMs: 0 },
    { ...player, rank: 2, userId: 8, username: "NoReaction", bestReactionMs: null },
  ] })
  show()
  await screen.findByRole("list", { name: /Ladder sorted/ })
  const rows = document.querySelectorAll(".ladderPlate")
  const reaction = row => Array.from(row.querySelectorAll(".ladderPlateStat"))
    .find(stat => stat.querySelector("dt").textContent === "Reaction").querySelector("dd").textContent
  expect(reaction(rows[0])).toBe("0 ms")
  expect(reaction(rows[1])).toBe("\u2014")
})


test("Ladder explains which records carry across seasons", async () => {
  fetchLeaderboard.mockResolvedValue(result)
  show()
  await screen.findByRole("list", { name: /Ladder sorted/ })
  expect(screen.getByText("Rating carries across seasons. Score, streak, accuracy and reaction records are all-time.")).toBeTruthy()
})

test("failed pagination and logout clear stale page controls", async () => {
  fetchLeaderboard.mockResolvedValueOnce({ ...result, totalPages: 3, totalCount: 60 })
    .mockRejectedValueOnce(new Error("offline"))
  const view = show()
  await screen.findByRole("button", { name: /Next/i })
  await userEvent.click(screen.getByRole("tab", { name: "Reaction" }))
  await screen.findByText("Ladder unavailable")
  expect(screen.queryByRole("button", { name: /Next/i })).toBeNull()
  fetchLeaderboard.mockResolvedValue({ ...result, totalPages: 3, totalCount: 60 })
  await userEvent.click(screen.getByRole("button", { name: "Retry" }))
  await screen.findByRole("button", { name: /Next/i })
  view.rerender(<MemoryRouter><LeaderboardPage isAuthed={false} /></MemoryRouter>)
  await screen.findByText("Ladder unavailable")
  expect(screen.queryByRole("button", { name: /Next/i })).toBeNull()
})

test("board tabs rove focus and selection with arrows, Home and End", async () => {
  fetchLeaderboard.mockResolvedValue({ ...result, rows: [], selfRank: null })
  show()
  await screen.findByText("No ranked players yet.")
  const tabs = screen.getAllByRole("tab")
  const user = userEvent.setup()
  tabs[0].focus()
  for (const [key, index] of [["{ArrowRight}", 1], ["{End}", 4], ["{ArrowRight}", 0], ["{ArrowLeft}", 4], ["{Home}", 0]]) {
    await user.keyboard(key)
    expect(document.activeElement).toBe(tabs[index])
    tabs.forEach((tab, i) => {
      expect(tab.tabIndex).toBe(i === index ? 0 : -1)
      expect(tab.getAttribute("aria-selected")).toBe(String(i === index))
    })
  }
})
