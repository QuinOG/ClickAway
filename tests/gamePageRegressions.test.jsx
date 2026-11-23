import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, expect, test, vi } from "vitest"
import GamePage from "../src/pages/GamePage.jsx"
const state = vi.hoisted(() => ({ game: {}, stop: vi.fn(), retry: vi.fn(), cancel: vi.fn() }))
vi.mock("../src/app/useFeedbackPreferences.js", () => ({ useFeedbackPreferences: () => ({ effectivePreferences: {}, stopFeedback: state.stop }) }))
vi.mock("../src/features/game/hooks/useGameScreenController.js", () => ({ useGameScreenController: () => state.game }))
vi.mock("../src/features/game/components/GameArena.jsx", () => ({ default: ({ roundOverlay }) => <div>{roundOverlay}</div> }))
vi.mock("../src/features/game/components/GameHud.jsx", () => ({ default: () => null }))
vi.mock("../src/features/game/components/PowerupTray.jsx", () => ({ default: () => null }))
vi.mock("../src/features/game/components/gameRoundOverlayExports.jsx", () => ({ CountdownOverlay: () => <div role="alert">Countdown error</div>, ReadyOverlay: () => <div>Ready overlay</div>, GameOverFlow: () => null }))
beforeEach(() => { state.game = { phase: "ready", arenaProps: {} } })
const page = () => <MemoryRouter><GamePage /></MemoryRouter>
test("feedback continues through phases and stops on unmount", () => {
  const view = render(page())
  for (const phase of ["countdown", "playing", "game_over"]) {
    state.game = { ...state.game, phase }
    view.rerender(page())
  }
  expect(state.stop).not.toHaveBeenCalled()
  view.unmount()
  expect(state.stop).toHaveBeenCalledOnce()
})
test("duel start failure presents one alert without Ready or countdown", async () => {
  state.game = { ...state.game, duelStartError: "Duel unavailable", entranceOverlayProps: { startStatus: "error", onRetry: state.retry, onCancel: state.cancel } }
  render(<MemoryRouter initialEntries={["/game?replayId=2&challengeId=1"]}><GamePage /></MemoryRouter>)
  expect(screen.getAllByRole("alert")).toHaveLength(1)
  expect(screen.queryByText("Ready overlay")).toBeNull()
  await userEvent.click(screen.getByRole("button", { name: "Retry duel" }))
  expect(state.retry).toHaveBeenCalledOnce()
  await userEvent.click(screen.getByRole("button", { name: "Leave duel" }))
  expect(state.cancel).toHaveBeenCalledOnce()
})
