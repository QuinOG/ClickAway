import { act, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { expect, test, vi } from "vitest"
import HistoryPage from "../src/pages/HistoryPage.jsx"
import { fetchHistoryPage } from "../src/services/clickAwayHttpApiClient.js"

vi.mock("../src/services/clickAwayHttpApiClient.js", () => ({ fetchHistoryPage: vi.fn() }))

const rounds = (id) => [{ id, modeId: "normal", score: 200, hits: 2, misses: 0 }]
const page = (id, best = 200) => (
  <MemoryRouter><HistoryPage roundHistory={rounds(id)} totalRoundCount={51} careerBestScore={best} /></MemoryRouter>
)

test("refreshing the first page clears an obsolete pagination error", async () => {
  fetchHistoryPage.mockRejectedValueOnce(new Error("Old page failed"))
  const { rerender } = render(page("first"))
  fireEvent.click(screen.getByRole("button", { name: "Load older rounds" }))
  expect((await screen.findByRole("alert")).textContent).toBe("Old page failed")
  rerender(page("refreshed"))
  expect(screen.queryByRole("alert")).toBeNull()
})

test("older pages use the progress page size and reset after refresh", async () => {
  fetchHistoryPage.mockResolvedValueOnce({ entries: rounds("older"), hasMore: false })
  const { container, rerender } = render(page("first"))
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Load older rounds" })))
  expect(fetchHistoryPage).toHaveBeenLastCalledWith({ page: 2, limit: 50 })
  expect(container.querySelectorAll("tbody tr")).toHaveLength(2)
  rerender(page("refreshed"))
  expect(container.querySelectorAll("tbody tr")).toHaveLength(1)
  expect(screen.getByRole("button", { name: "Load older rounds" })).toBeTruthy()
})

test("personal best requires equality with the saved career record", () => {
  const { rerender } = render(page("first", 100))
  expect(screen.queryByText(/Latest run · Personal best/)).toBeNull()
  rerender(page("first", 200))
  expect(screen.getByText(/Latest run · Personal best/)).toBeTruthy()
  rerender(page("first", 300))
  expect(screen.queryByText(/Latest run · Personal best/)).toBeNull()
})

test("trajectory mode filtering keeps every round in the log", () => {
  const history = [rounds("casual")[0], { ...rounds("ranked")[0], modeId: "hard", score: 300 }]
  const { container } = render(<MemoryRouter><HistoryPage roundHistory={history} /></MemoryRouter>)
  fireEvent.click(screen.getByRole("button", { name: "Ranked" }))
  expect(screen.getByRole("region", { name: /Ranked score trajectory across 1 recent rounds/ })).toBeTruthy()
  expect(container.querySelectorAll("tbody tr")).toHaveLength(2)
  expect(container.querySelectorAll(".historyRoundCard")).toHaveLength(2)
})

test("empty history provides a first-round link", () => {
  render(<MemoryRouter><HistoryPage /></MemoryRouter>)
  expect(screen.getByRole("link", { name: "Play a Round" }).getAttribute("href")).toBe("/game")
  expect(screen.queryByRole("table")).toBeNull()
})
