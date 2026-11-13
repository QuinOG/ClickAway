import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, test, vi } from "vitest"

import LeaderboardPage from "../src/pages/LeaderboardPage.jsx"
import { fetchLeaderboard } from "../src/services/clickAwayHttpApiClient.js"

vi.mock("../src/services/clickAwayHttpApiClient.js", () => ({ fetchLeaderboard: vi.fn() }))

const row = (rank, userId, username) => ({
  rank, userId, username, mmr: 900 - rank * 20, levelXp: 4000, bestScore: 900, bestStreak: 20, accuracyPercent: 90, bestReactionMs: 200,
})
const players = [row(1, 21, "Nova"), row(2, 14, "Orbit"), row(3, 7, "Vector")]

function respondWith({ search = "" } = {}) {
  const matches = players.filter((player) => player.username.toLowerCase().includes(search.toLowerCase()))
  return { rows: matches, page: 1, totalPages: matches.length ? 1 : 0, totalCount: matches.length, selfRank: 3 }
}

function renderLadder() {
  return render(<MemoryRouter><LeaderboardPage isAuthed currentUserId={7} currentUsername="Vector" /></MemoryRouter>)
}

const searchBox = () => screen.getByRole("searchbox", { name: "Search Ladder players" })
const ladderNames = () => Array.from(document.querySelectorAll(".ladderPlates .leaderboardPlayerName"), (el) => el.textContent.replace("YOU", "").trim())

beforeEach(() => {
  fetchLeaderboard.mockReset()
  fetchLeaderboard.mockImplementation(async (params) => respondWith(params))
})

describe("Ladder search with no matches", () => {
  test("says no players match the search, without placement advice, and emptying the box restores the full Ladder", async () => {
    const user = userEvent.setup()
    renderLadder()
    await waitFor(() => expect(ladderNames()).toEqual(["Nova", "Orbit", "Vector"]))

    await user.type(searchBox(), "Zephyr")
    expect(await screen.findByText(/No players match “Zephyr”/)).toBeTruthy()
    expect(screen.queryByText(/No ranked players yet/)).toBeNull()
    expect(screen.queryByText(/Finish your placement matches/)).toBeNull()

    expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull()
    await user.clear(searchBox())
    await waitFor(() => expect(ladderNames()).toEqual(["Nova", "Orbit", "Vector"]))
  })

  test("a new search after no matches finds the player", async () => {
    const user = userEvent.setup()
    renderLadder()
    await user.type(searchBox(), "Zephyr")
    await screen.findByText(/No players match/)
    await user.clear(searchBox())
    await user.type(searchBox(), "orb")
    await waitFor(() => expect(ladderNames()).toEqual(["Orbit"]))
    expect(screen.queryByText(/No players match/)).toBeNull()
  })

  test("an empty Ladder without a search keeps the placement guidance", async () => {
    fetchLeaderboard.mockImplementation(async () => ({ rows: [], page: 1, totalPages: 0, totalCount: 0, selfRank: null }))
    renderLadder()
    expect(await screen.findByText("No ranked players yet.")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull()
  })

  test("a failed load shows the error and Retry, not the no-match message", async () => {
    const user = userEvent.setup()
    renderLadder()
    await waitFor(() => expect(ladderNames()).toHaveLength(3))
    fetchLeaderboard.mockRejectedValue(new Error("Standings are temporarily unavailable."))
    await user.type(searchBox(), "Zephyr")
    expect(await screen.findByText("Standings are temporarily unavailable.")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy()
    expect(screen.queryByText(/No players match/)).toBeNull()
  })

  test("Around Me says the search only covers nearby players and offers a full-Ladder search", async () => {
    const user = userEvent.setup()
    // Around Me with a search only returns matching players near your rank (Vector at #3).
    fetchLeaderboard.mockImplementation(async ({ search = "", view }) => {
      const pool = view === "aroundMe" ? players.filter((player) => player.rank >= 2) : players
      const matches = pool.filter((player) => player.username.toLowerCase().includes(search.toLowerCase()))
      return { rows: matches, page: 1, totalPages: matches.length ? 1 : 0, totalCount: matches.length, selfRank: 3 }
    })
    renderLadder()
    await waitFor(() => expect(ladderNames()).toHaveLength(3))
    await user.click(screen.getByRole("button", { name: "Around Me" }))
    await user.type(searchBox(), "Nova")
    expect(await screen.findByText(/Around Me found no players matching “Nova”/)).toBeTruthy()
    await user.click(screen.getByRole("button", { name: "Search all players" }))
    await waitFor(() => expect(ladderNames()).toEqual(["Nova"]))
    expect(screen.getByRole("button", { name: "Top Players" }).getAttribute("aria-pressed")).toBe("true")
  })

  test("while a corrected search loads, the old no-match message never shows the new name", async () => {
    const user = userEvent.setup()
    renderLadder()
    await user.type(searchBox(), "Zephyr")
    await screen.findByText(/No players match “Zephyr”/)
    let release
    fetchLeaderboard.mockImplementation((params) => new Promise((resolve) => { release = () => resolve(respondWith(params)) }))
    await user.clear(searchBox())
    await user.type(searchBox(), "Nova")
    await waitFor(() => expect(fetchLeaderboard).toHaveBeenLastCalledWith(expect.objectContaining({ search: "Nova" })))
    expect(screen.queryByText(/No players match “Nova”/)).toBeNull()
    release()
    await waitFor(() => expect(ladderNames()).toEqual(["Nova"]))
  })

  test("an empty search doesn't tell a placed player to finish placement or show an empty field", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LeaderboardPage isAuthed currentUserId={99} currentUsername="Ghost" currentRankProgress={{ tierLabel: "Gold II", isPlacement: false, isUnranked: false }} />
      </MemoryRouter>,
    )
    fetchLeaderboard.mockImplementation(async (params) => ({ ...respondWith(params), selfRank: 3 }))
    await waitFor(() => expect(ladderNames()).toHaveLength(3))
    await user.type(searchBox(), "Zephyr")
    await screen.findByText(/No players match “Zephyr”/)
    expect(screen.queryByText(/Complete placement to appear|Finish placement|Outside the placed ladder/)).toBeNull()
    expect(screen.getByText(/out of 3 placed players/)).toBeTruthy()
  })

  test("a slow older search can't replace the results of a newer one", async () => {
    const user = userEvent.setup()
    renderLadder()
    await waitFor(() => expect(ladderNames()).toHaveLength(3))
    const pending = []
    fetchLeaderboard.mockImplementation((params) => new Promise((resolve) => pending.push({ params, resolve })))
    await user.type(searchBox(), "Zephyr")
    await waitFor(() => expect(pending.some((call) => call.params.search === "Zephyr")).toBe(true))
    await user.clear(searchBox())
    await user.type(searchBox(), "Nova")
    await waitFor(() => expect(pending.some((call) => call.params.search === "Nova")).toBe(true))
    pending.find((call) => call.params.search === "Nova").resolve(respondWith({ search: "Nova" }))
    await waitFor(() => expect(ladderNames()).toEqual(["Nova"]))
    pending.find((call) => call.params.search === "Zephyr").resolve(respondWith({ search: "Zephyr" }))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(ladderNames()).toEqual(["Nova"])
    expect(screen.queryByText(/No players match/)).toBeNull()
  })

  // The server ranks everyone on the full Ladder before applying a search, so
  // matches keep their real ranks and your own rank is returned during a search.
  function serverLikeSearch({ search = "", board = "mmr" }) {
    const matches = players.filter((player) => player.username.toLowerCase().includes(search.toLowerCase()))
    const selfRank = board === "mmr" ? 3 : 2
    return { rows: matches, page: 1, totalPages: matches.length ? 1 : 0, totalCount: matches.length, selfRank }
  }
  function renderPlaced() {
    return render(
      <MemoryRouter>
        <LeaderboardPage isAuthed currentUserId={7} currentUsername="Vector" currentRankProgress={{ tierLabel: "Gold II", isPlacement: false, isUnranked: false }} />
      </MemoryRouter>,
    )
  }
  const spot = () => document.querySelector(".leaderboardStandingSpot, [class*='StandingSpot'] strong")?.textContent

  test("a search that ranks you among its matches doesn't replace your real rank", async () => {
    const user = userEvent.setup()
    fetchLeaderboard.mockImplementation(async (params) => serverLikeSearch(params))
    renderPlaced()
    await waitFor(() => expect(ladderNames()).toHaveLength(3))
    await user.type(searchBox(), "r")
    await waitFor(() => expect(ladderNames()).toEqual(["Orbit", "Vector"]))
    expect(screen.getByText(/ranked #3 out of 3 placed players/)).toBeTruthy()
    await user.clear(searchBox())
    await user.type(searchBox(), "zzz")
    await screen.findByText(/No players match “zzz”/)
    expect(screen.getByText(/ranked #3 out of 3 placed players/)).toBeTruthy()
    expect(screen.queryByText(/#2 out of|Outside the placed ladder|Finish placement/)).toBeNull()
  })

  test("switching boards during a search shows your real rank on that board", async () => {
    const user = userEvent.setup()
    fetchLeaderboard.mockImplementation(async (params) => serverLikeSearch(params))
    renderPlaced()
    await waitFor(() => expect(ladderNames()).toHaveLength(3))
    await user.type(searchBox(), "zzz")
    await screen.findByText(/No players match “zzz”/)
    await user.click(screen.getByRole("tab", { name: "Best Score" }))
    await waitFor(() => expect(fetchLeaderboard).toHaveBeenLastCalledWith(expect.objectContaining({ board: "bestScore", search: "zzz" })))
    expect(await screen.findByText(/ranked #2 out of/)).toBeTruthy()
    expect(screen.queryByText("Clear the search to see your rank on this board.")).toBeNull()
    expect(screen.queryByText(/Outside the placed ladder|Finish placement/)).toBeNull()
    await user.clear(searchBox())
    await waitFor(() => expect(ladderNames()).toHaveLength(3))
    expect(screen.queryByText("Clear the search to see your rank on this board.")).toBeNull()
    expect(screen.queryByText(/Outside the placed ladder|Finish placement/)).toBeNull()
  })
})
