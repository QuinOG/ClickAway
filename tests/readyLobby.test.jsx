import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, test, vi } from "vitest"

import { FeedbackPreferencesProvider } from "../src/app/FeedbackPreferencesContext.jsx"
import { TRAINING_DRILLS } from "../src/constants/drillConfig.js"
import { DIFFICULTIES } from "../src/constants/gameModesConfig.js"
import { ReadyOverlay } from "../src/features/game/components/roundOverlays/ReadyOverlay.jsx"
import {
  buildDefaultRankedState,
  buildRankedPreflight,
  getRankProgress,
  PLACEMENT_MATCH_COUNT,
} from "../src/utils/rankUtils.js"

function renderLobby(overrides = {}) {
  const props = {
    modes: DIFFICULTIES,
    selectedModeId: "normal",
    onSelectMode: vi.fn(),
    onStart: vi.fn(),
    activeLoadoutName: "Tempo Control",
    playerBestScore: 42,
    ...overrides,
  }

  render(
    <MemoryRouter>
      <FeedbackPreferencesProvider>
        <ReadyOverlay {...props} />
      </FeedbackPreferencesProvider>
    </MemoryRouter>
  )

  return props
}

describe("Arena lobby", () => {
  test("shows all modes and starts a directly selected mode", async () => {
    const user = userEvent.setup()
    const props = renderLobby()

    const modeRail = screen.getByLabelText("Choose a game mode")
    expect(within(modeRail).getByRole("button", { name: "Select Practice" })).not.toBeNull()
    expect(within(modeRail).getByRole("button", { name: "Select Casual" })).not.toBeNull()
    expect(within(modeRail).getByRole("button", { name: "Select Ranked" })).not.toBeNull()
    expect(screen.getAllByText("XP + coins · no rank risk").length).toBeGreaterThan(0)
    expect(screen.getByText("Tempo Control")).not.toBeNull()

    await user.click(within(modeRail).getByRole("button", { name: "Select Ranked" }))
    expect(props.onSelectMode).toHaveBeenCalledWith("hard")
    expect(screen.getAllByText("rank at stake", { exact: false }).length).toBeGreaterThan(0)

    await user.click(screen.getByRole("button", { name: "Start Ranked" }))
    expect(props.onStart).toHaveBeenCalledWith("hard")
  })

  test("supports arrow selection and Enter from the focused lobby", () => {
    const props = renderLobby()
    const lobby = screen.getByRole("heading", { name: "Enter the arena" }).closest("section")

    lobby.focus()
    fireEvent.keyDown(lobby, { key: "ArrowRight" })
    expect(props.onSelectMode).toHaveBeenCalledWith("hard")

    fireEvent.keyDown(lobby, { key: "Enter" })
    expect(props.onStart).toHaveBeenCalledWith("hard")
  })

  test("keeps drills in the Practice drawer and preserves drill selection", async () => {
    const user = userEvent.setup()
    const onSelectDrill = vi.fn()
    renderLobby({
      selectedModeId: "easy",
      showTrainingSuite: true,
      trainingDrills: TRAINING_DRILLS,
      onSelectDrill,
    })

    expect(screen.queryByRole("button", { name: /Accuracy Shooter/i })).toBeNull()
    await user.click(screen.getByRole("button", { name: /Free Practice selected/i }))
    await user.click(screen.getByRole("button", { name: /Accuracy Shooter/i }))

    expect(onSelectDrill).toHaveBeenCalledWith("accuracy_shooter")
  })

  test("shows protected Ranked stakes and launches a recommended warm-up", async () => {
    const user = userEvent.setup()
    const onStartRankedWarmup = vi.fn()
    const rankProgress = getRankProgress(385)
    const rankedState = {
      ...buildDefaultRankedState(),
      placementMatchesPlayed: PLACEMENT_MATCH_COUNT,
      demotionProtectionRounds: 2,
    }

    renderLobby({
      selectedModeId: "hard",
      rankProgress,
      rankedPreflight: buildRankedPreflight({ rankProgress, rankedState }),
      warmupSuggestion: {
        id: "accuracy_shooter",
        label: "Accuracy Shooter",
        description: "Slow down and land clean hits.",
      },
      onStartRankedWarmup,
    })

    expect(screen.getByText("Division protected")).not.toBeNull()
    expect(screen.getByText(/2 matches of demotion protection remain/i)).not.toBeNull()
    expect(screen.getByText(/No fixed change is guaranteed/i)).not.toBeNull()

    await user.click(screen.getByRole("button", { name: "Warm up in Practice" }))
    expect(onStartRankedWarmup).toHaveBeenCalledOnce()
  })
})
