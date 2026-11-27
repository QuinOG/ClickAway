import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import LeaderboardPage from "../src/pages/LeaderboardPage.jsx"
import { fetchLeaderboard } from "../src/services/clickAwayHttpApiClient.js"

vi.mock("../src/services/clickAwayHttpApiClient.js", () => ({ fetchLeaderboard: vi.fn() }))

const result = { rows: [], totalPages: 3, totalCount: 60, selfRank: 17 }
const page = (isAuthed = true) => (
  <MemoryRouter><LeaderboardPage isAuthed={isAuthed} currentUserId={7} currentUsername="Viewer" /></MemoryRouter>
)

beforeEach(() => fetchLeaderboard.mockReset())
afterEach(() => vi.useRealTimers())

test("mount debounce and whitespace edits preserve page 2", async () => {
  vi.useFakeTimers()
  fetchLeaderboard.mockResolvedValue(result)
  await act(async () => { render(page()) })
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Next" })) })
  expect(fetchLeaderboard).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }))
  await act(async () => { vi.advanceTimersByTime(300) })
  expect(fetchLeaderboard).toHaveBeenCalledTimes(2)
  expect(fetchLeaderboard).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }))
  await act(async () => { fireEvent.change(screen.getByRole("searchbox"), { target: { value: "   " } }) })
  await act(async () => { vi.advanceTimersByTime(300) })
  expect(fetchLeaderboard).toHaveBeenCalledTimes(2)
  expect(screen.getByText("Page 2 of 3")).toBeTruthy()
})

test("a rejected board request clears the previous board's standing", async () => {
  fetchLeaderboard.mockResolvedValueOnce(result).mockRejectedValueOnce(new Error("Board offline"))
  render(page())
  const panel = screen.getByRole("region", { name: "Your leaderboard standing" })
  await within(panel).findByText("#17")
  fireEvent.click(screen.getByRole("tab", { name: "Best score" }))
  await screen.findByText("Board offline")
  expect(within(panel).queryByText("#17")).toBeNull()
  expect(within(panel).getAllByText("--").length).toBeGreaterThan(0)
})

test("logging out clears the previous standing", async () => {
  fetchLeaderboard.mockResolvedValue(result)
  const view = render(page())
  const panel = screen.getByRole("region", { name: "Your leaderboard standing" })
  await within(panel).findByText("#17")
  view.rerender(page(false))
  await screen.findByText("You must be logged in to view the leaderboard.")
  expect(within(panel).queryByText("#17")).toBeNull()
})
