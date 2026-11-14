import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { expect, test, vi } from "vitest"
import GamePage from "../src/pages/GamePage.jsx"
import { fetchReplay } from "../src/services/clickAwayHttpApiClient.js"

vi.mock("../src/services/clickAwayHttpApiClient.js", () => ({ fetchReplay: vi.fn() }))
vi.mock("../src/app/useFeedbackPreferences.js", () => ({
  useFeedbackPreferences: () => ({ effectivePreferences: {}, stopFeedback: vi.fn() }),
}))
vi.mock("../src/features/game/hooks/useGameScreenController.js", () => ({
  useGameScreenController: () => ({ phase: "playing" }),
}))
vi.mock("../src/features/game/components/GameHud.jsx", () => ({ default: () => null }))
vi.mock("../src/features/game/components/GameArena.jsx", () => ({ default: () => null }))
vi.mock("../src/features/game/components/PowerupTray.jsx", () => ({ default: () => null }))

function renderDuel(path = "/game?challengeId=1&replayId=2") {
  render(<MemoryRouter initialEntries={[path]}><GamePage /></MemoryRouter>)
}

test("a failed ghost load can retry the same replay", async () => {
  fetchReplay.mockRejectedValueOnce(new Error("Ghost unavailable"))
    .mockResolvedValueOnce({ replay: { id: 2, modeId: "normal", seed: 42 } })
  renderDuel()
  expect(await screen.findByText("Ghost unavailable")).toBeTruthy()
  await userEvent.click(screen.getByRole("button", { name: "Retry ghost" }))
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull())
  expect(fetchReplay.mock.calls.map(([id]) => id)).toEqual([2, 2])
})

test("a failed ghost load can leave the duel", async () => {
  fetchReplay.mockRejectedValue(new Error("Ghost unavailable"))
  renderDuel()
  await userEvent.click(await screen.findByRole("button", { name: "Leave duel" }))
  expect(screen.queryByRole("alert")).toBeNull()
  expect(screen.queryByText(/Loading your rival/)).toBeNull()
})

test("an incomplete duel link explains the problem and offers an exit", async () => {
  renderDuel("/game?challengeId=1")
  expect(screen.getByRole("alert").textContent).toContain("This duel link is missing its rival run")
  await userEvent.click(screen.getByRole("button", { name: "Leave duel" }))
  expect(screen.queryByRole("alert")).toBeNull()
})
