import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, useNavigate } from "react-router-dom"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import GamePage from "../src/pages/GamePage.jsx"
import { fetchReplay, requestRoundStart } from "../src/services/clickAwayHttpApiClient.js"
import { DEFAULT_SAVED_LOADOUTS } from "../src/constants/buildcraft.js"
import { ROUND_END_SETTLE_MS } from "../src/constants/gameConstants.js"

vi.mock("../src/services/clickAwayHttpApiClient.js", () => ({ fetchReplay: vi.fn(), requestRoundStart: vi.fn() }))
vi.mock("../src/app/useFeedbackPreferences.js", () => ({
  useFeedbackPreferences: () => ({ effectivePreferences: {}, stopFeedback: vi.fn() }),
}))
vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }) => children,
  motion: { div: ({ children }) => <div>{children}</div> },
}))
vi.mock("../src/features/game/components/gameRoundOverlayExports.jsx", () => ({
  ReadyOverlay: ({ onStart }) => <button onClick={() => onStart()}>Start</button>,
  CountdownOverlay: ({ startStatus }) => <p>{startStatus}</p>,
  GameOverFlow: ({ onPlayAgain, onChooseMode, onRematch }) => <div>
    <button onClick={onPlayAgain}>Play Again</button>
    <button onClick={onChooseMode}>Change Mode</button>
    <button onClick={onRematch}>Rematch</button>
  </div>,
}))
vi.mock("../src/features/game/components/GameHud.jsx", () => ({ default: ({ onEndRound }) => <button onClick={onEndRound}>End round</button> }))
vi.mock("../src/features/game/components/GameArena.jsx", () => ({ default: ({ roundOverlay }) => roundOverlay }))
vi.mock("../src/features/game/components/PowerupTray.jsx", () => ({ default: () => null }))

function renderDuel(path = "/game?challengeId=1&replayId=2") {
  render(<MemoryRouter initialEntries={[path]}><GamePage activeLoadout={DEFAULT_SAVED_LOADOUTS[0]} /></MemoryRouter>)
}

beforeEach(() => {
  fetchReplay.mockReset()
  requestRoundStart.mockReset().mockReturnValue(new Promise(() => {}))
})
afterEach(() => vi.useRealTimers())

test("a pending ghost load shows loading without the Ready Start button", () => {
  fetchReplay.mockReturnValue(new Promise(() => {}))
  renderDuel("/game?challengeId=1&replayId=1")
  expect(screen.getByRole("status").textContent).toBe("Loading your rival's run…")
  expect(screen.queryByRole("button", { name: "Start" })).toBeNull()
})

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

function DuelNavigation() {
  const navigate = useNavigate()
  return <div>
    <button onClick={() => navigate("/game?challengeId=2&replayId=2")}>Duel 2</button>
    <button onClick={() => navigate("/game")}>Clear duel</button>
  </div>
}

async function advance(ms = 20) {
  await act(async () => vi.advanceTimersByTimeAsync(ms))
}

function renderNavigableDuel(onRoundComplete, onPhaseChange, path = "/game?challengeId=1&replayId=1") {
  render(<MemoryRouter initialEntries={[path]}>
    <GamePage activeLoadout={DEFAULT_SAVED_LOADOUTS[0]} onRoundComplete={onRoundComplete} onPhaseChange={onPhaseChange} />
    <DuelNavigation />
  </MemoryRouter>)
}

test.each(["requesting", "countdown", "playing"].flatMap((stage) =>
  ["Duel 2", "Clear duel"].map((destination) => [stage, destination])
))("navigating to %s / %s aborts the previous duel", async (stage, destination) => {
  vi.useFakeTimers()
  let resolveFirstStart
  let resolveSecondReplay
  fetchReplay.mockImplementation((id) => id === 1
    ? Promise.resolve({ replay: { id: 1, modeId: "normal", seed: 1 } })
    : new Promise((resolve) => { resolveSecondReplay = resolve }))
  requestRoundStart.mockImplementationOnce(() => new Promise((resolve) => { resolveFirstStart = resolve }))
    .mockResolvedValue({ replayId: 2, seed: 2, roundToken: "duel-2-token" })
  const onRoundComplete = vi.fn(async () => ({ ok: true }))
  const onPhaseChange = vi.fn()
  renderNavigableDuel(onRoundComplete, onPhaseChange)
  await advance()
  await advance()
  expect(requestRoundStart).toHaveBeenCalledExactlyOnceWith("normal", { challengeId: 1 })
  if (stage !== "requesting") {
    await act(async () => resolveFirstStart({ replayId: 1, seed: 1, roundToken: "duel-1-token" }))
    expect(screen.getByText("countdown")).toBeTruthy()
    if (stage === "playing") await advance(3000)
  }
  fireEvent.click(screen.getByRole("button", { name: destination }))
  expect(onPhaseChange.mock.lastCall).toEqual(["ready"])
  if (stage === "requesting") {
    await act(async () => resolveFirstStart({ replayId: 1, seed: 1, roundToken: "duel-1-token" }))
  }
  await advance(90000)
  expect(onPhaseChange.mock.lastCall).toEqual(["ready"])
  expect(onRoundComplete).not.toHaveBeenCalled()
  expect(screen.queryByText("countdown")).toBeNull()

  if (destination === "Duel 2") {
    await act(async () => resolveSecondReplay({ replay: { id: 2, modeId: "normal", seed: 2 } }))
    await advance()
    expect(requestRoundStart).toHaveBeenLastCalledWith("normal", { challengeId: 2 })
    await advance(3000)
    expect(onPhaseChange.mock.lastCall).toEqual(["playing"])
    fireEvent.click(screen.getByRole("button", { name: "End round" }))
    await advance(ROUND_END_SETTLE_MS + 20)
    await advance()
    expect(onRoundComplete).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      challengeId: 2, roundToken: "duel-2-token",
    }))
  }
})

test.each(["Play Again", "Change Mode", "Rematch"])("%s after a finished duel can complete an ordinary round", async (action) => {
  vi.useFakeTimers()
  fetchReplay.mockResolvedValue({ replay: { id: 1, modeId: "normal", seed: 1 } })
  requestRoundStart.mockResolvedValueOnce({ replayId: 1, seed: 1, roundToken: "duel-1-token" })
    .mockResolvedValue({ seed: 2, roundToken: "ordinary-token" })
  const onRoundComplete = vi.fn(async () => ({ ok: true }))
  const onPhaseChange = vi.fn()
  renderNavigableDuel(onRoundComplete, onPhaseChange)
  await advance()
  await advance()
  await advance(3000)
  fireEvent.click(screen.getByRole("button", { name: "End round" }))
  await advance(ROUND_END_SETTLE_MS + 20)
  await advance()
  expect(onRoundComplete).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ challengeId: 1 }))
  fireEvent.click(screen.getByRole("button", { name: action }))
  if (action !== "Rematch") fireEvent.click(screen.getByRole("button", { name: "Start" }))
  await advance()
  expect(requestRoundStart).toHaveBeenLastCalledWith("normal")
  await advance(3000)
  expect(onPhaseChange.mock.lastCall).toEqual(["playing"])
  fireEvent.click(screen.getByRole("button", { name: "End round" }))
  await advance(ROUND_END_SETTLE_MS + 20)
  await advance()
  expect(onRoundComplete).toHaveBeenCalledTimes(2)
  expect(onRoundComplete).toHaveBeenLastCalledWith(expect.objectContaining({ challengeId: null, roundToken: "ordinary-token" }))
})

test.each(["requesting", "countdown", "playing"])("entering a duel invalidates an ordinary round during %s", async (stage) => {
  vi.useFakeTimers()
  let resolveOrdinaryStart
  requestRoundStart.mockReturnValue(new Promise((resolve) => { resolveOrdinaryStart = resolve }))
  fetchReplay.mockReturnValue(new Promise(() => {}))
  const onRoundComplete = vi.fn()
  const onPhaseChange = vi.fn()
  renderNavigableDuel(onRoundComplete, onPhaseChange, "/game")
  fireEvent.click(screen.getByRole("button", { name: "Start" }))
  if (stage !== "requesting") {
    await act(async () => resolveOrdinaryStart({ seed: 1, roundToken: "ordinary-token" }))
    expect(screen.getByText("countdown")).toBeTruthy()
    if (stage === "playing") await advance(3000)
  }
  fireEvent.click(screen.getByRole("button", { name: "Duel 2" }))
  if (stage === "requesting") {
    await act(async () => resolveOrdinaryStart({ seed: 1, roundToken: "ordinary-token" }))
  }
  await advance(90000)
  expect(onPhaseChange.mock.lastCall).toEqual(["ready"])
  expect(onRoundComplete).not.toHaveBeenCalled()
  expect(screen.queryByText("countdown")).toBeNull()
})
