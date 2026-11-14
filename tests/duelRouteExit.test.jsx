import { act, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, useLocation } from "react-router-dom"
import { afterEach, expect, test, vi } from "vitest"
import { DEFAULT_SAVED_LOADOUTS } from "../src/constants/buildcraft.js"
import GamePage from "../src/pages/GamePage.jsx"
import { requestRoundStart } from "../src/services/clickAwayHttpApiClient.js"

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }) => children,
  motion: { div: ({ children }) => <div>{children}</div> },
}))

vi.mock("../src/services/clickAwayHttpApiClient.js", () => ({
  fetchReplay: vi.fn(async () => ({ replay: { id: 2, modeId: "normal", seed: 0 } })),
  requestRoundStart: vi.fn(async () => ({ replayId: 3, seed: 0, roundToken: "token" })),
}))
vi.mock("../src/app/useFeedbackPreferences.js", () => ({
  useFeedbackPreferences: () => ({ effectivePreferences: {}, stopFeedback: vi.fn() }),
}))
vi.mock("../src/features/game/components/GameHud.jsx", () => ({ default: () => null }))
vi.mock("../src/features/game/components/GameArena.jsx", () => ({ default: ({ roundOverlay }) => roundOverlay }))
vi.mock("../src/features/game/components/PowerupTray.jsx", () => ({ default: () => null }))
vi.mock("../src/features/game/components/gameRoundOverlayExports.jsx", () => ({
  CountdownOverlay: ({ startError, onCancel }) => <div><p data-testid="start-overlay">{startError}</p><button onClick={onCancel}>Cancel</button></div>,
  ReadyOverlay: () => <p>Ready to play</p>,
  GameOverFlow: () => null,
}))

afterEach(() => vi.useRealTimers())

test("leaving a mismatched duel clears the failed start overlay", async () => {
  vi.useFakeTimers()
  render(<MemoryRouter initialEntries={["/game?challengeId=1&replayId=2"]}><GamePage savedLoadouts={DEFAULT_SAVED_LOADOUTS} activeLoadout={DEFAULT_SAVED_LOADOUTS[0]} /></MemoryRouter>)
  await act(async () => vi.advanceTimersByTimeAsync(20))
  await act(async () => vi.advanceTimersByTimeAsync(20))
  expect(screen.getByTestId("start-overlay").textContent).toContain("doesn't match")
  fireEvent.click(screen.getByRole("button", { name: "Leave duel" }))
  await act(async () => vi.advanceTimersByTimeAsync(1000))
  expect(screen.queryByTestId("start-overlay")).toBeNull()
  expect(screen.getByText("Ready to play")).toBeTruthy()
})

function RouteLocation() {
  return <p data-testid="route-search">{useLocation().search}</p>
}

test("cancelling a failed duel start leaves the duel route", async () => {
  vi.useFakeTimers()
  requestRoundStart.mockRejectedValueOnce(new Error("Duel unavailable"))
  render(<MemoryRouter initialEntries={["/game?challengeId=1&replayId=2"]}>
    <GamePage savedLoadouts={DEFAULT_SAVED_LOADOUTS} activeLoadout={DEFAULT_SAVED_LOADOUTS[0]} />
    <RouteLocation />
  </MemoryRouter>)
  await act(async () => vi.advanceTimersByTimeAsync(20))
  await act(async () => vi.advanceTimersByTimeAsync(20))
  expect(screen.getByTestId("start-overlay").textContent).toContain("Duel unavailable")
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
  expect(screen.getByTestId("route-search").textContent).toBe("")
  expect(screen.queryByTestId("start-overlay")).toBeNull()
  expect(screen.getByText("Ready to play")).toBeTruthy()
})
