import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, expect, test, vi } from "vitest"
import LeaderboardPage from "../src/pages/LeaderboardPage.jsx"
import { fetchLeaderboard } from "../src/services/clickAwayHttpApiClient.js"

vi.mock("../src/services/clickAwayHttpApiClient.js", () => ({ fetchLeaderboard: vi.fn() }))
const placed = { mmr: 1600, tierLabel: "Deadeye", isUnranked: false, isPlacement: false }
const season = { id: 1, name: "Season 1", startsAt: "2026-11-01", endsAt: "2027-02-01" }
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
