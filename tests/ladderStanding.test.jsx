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
  expect(document.querySelector('.leaderboardPodiumCrest img').getAttribute("src")).toBe("/ranks/deadeye.svg")
  expect(document.querySelector('.ladderPlayerHoverCard .profileHoverRankIcon').getAttribute("src")).toBe("/ranks/deadeye.svg")
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
