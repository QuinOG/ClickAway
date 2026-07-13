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
    expect(screen.getByLabelText("Rewards: XP + coins · no rank risk")).not.toBeNull()
    expect(screen.getByText("Tempo Control")).not.toBeNull()

    await user.click(within(modeRail).getByRole("button", { name: "Select Ranked" }))
    expect(props.onSelectMode).toHaveBeenCalledWith("hard")
    expect(screen.getAllByText("rank at stake", { exact: false }).length).toBeGreaterThan(0)

    await user.click(screen.getByRole("button", { name: "Start Ranked" }))
    expect(props.onStart).toHaveBeenCalledWith("hard")
  })

  test("distinguishes every mode through duration, stakes, reward, and pressure signals", async () => {
    const user = userEvent.setup()
    renderLobby()

    const modeRail = screen.getByLabelText("Choose a game mode")
    const practice = within(modeRail).getByRole("button", { name: "Select Practice" })
    const casual = within(modeRail).getByRole("button", { name: "Select Casual" })
    const ranked = within(modeRail).getByRole("button", { name: "Select Ranked" })

    expect(practice.querySelector(".lobbyDurationRing.isUntimed")).not.toBeNull()
    expect(casual.querySelector(".lobbyDurationRing.isTimed").textContent).toContain("30")
    expect(ranked.querySelector(".lobbyDurationRing.isTimed").textContent).toContain("15")

    expect(practice.querySelector(".lobbyStakesCue.stakes-0")).not.toBeNull()
    expect(casual.querySelector(".lobbyStakesCue.stakes-1")).not.toBeNull()
    expect(ranked.querySelector(".lobbyStakesCue.stakes-3")).not.toBeNull()
    expect(practice.querySelectorAll(".lobbyRewardPips .isEarned")).toHaveLength(0)
    expect(casual.querySelectorAll(".lobbyRewardPips .isEarned")).toHaveLength(2)
    expect(ranked.querySelectorAll(".lobbyRewardPips .isEarned")).toHaveLength(3)
    expect(practice.querySelector(".lobbyPressureCue.pressure-1")).not.toBeNull()
    expect(casual.querySelector(".lobbyPressureCue.pressure-2")).not.toBeNull()
    expect(ranked.querySelector(".lobbyPressureCue.pressure-3")).not.toBeNull()

    DIFFICULTIES.forEach((mode) => expect(screen.queryByText(mode.description)).toBeNull())

    await user.hover(ranked)
    expect((await screen.findByRole("tooltip")).textContent).toContain("15s. -2 score. Aggressive target pressure")
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
