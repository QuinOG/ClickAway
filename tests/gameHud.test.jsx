import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"

import GameHud from "../src/features/game/components/GameHud.jsx"

const baseProps = {
  score: 1240,
  timeLeft: 18,
  roundDurationSeconds: 30,
  modeLabel: "Casual",
  rankLabel: "Silver II",
  loadoutName: "Tempo Control",
  streak: 7,
  comboMultiplier: 2,
  bestStreak: 12,
  isPlaying: true,
}

describe("Competitive game HUD", () => {
  test("prioritizes score, timer, momentum, identity, and PB delta", () => {
    render(
      <GameHud
        {...baseProps}
        pbPaceStatus="ahead"
        pbPaceDelta={34}
        playerBestScore={2200}
      />
    )

    expect(screen.getByRole("banner", { name: "Round status" })).not.toBeNull()
    expect(screen.getByLabelText("Score 1,240")).not.toBeNull()
    expect(screen.getByLabelText("18 seconds remaining")).not.toBeNull()
    expect(screen.getByLabelText("Ahead of PB pace +34")).not.toBeNull()
    expect(screen.getByLabelText("Casual, Silver II, Tempo Control")).not.toBeNull()
    expect(screen.getByLabelText("Streak 7, combo times 2, best streak 12")).not.toBeNull()
  })

  test("shows an accurate ghost delta and target without replacing live score", () => {
    render(
      <GameHud
        {...baseProps}
        score={90}
        isGhostDuel
        ghostScore={74}
        ghostTargetScore={180}
        ghostUsername="Rival"
      />
    )

    const duel = screen.getByLabelText("Ghost duel against Rival")
    expect(duel.textContent).toContain("You 90")
    expect(duel.textContent).toContain("Ghost 74")
    expect(duel.textContent).toContain("Target 180")
    expect(duel.textContent).toContain("Ahead +16")
  })

  test("supports untimed drills and the compact Practice end action", async () => {
    const user = userEvent.setup()
    const onEndRound = vi.fn()
    render(
      <GameHud
        {...baseProps}
        isTimedRound={false}
        modeLabel="Practice"
        onEndRound={onEndRound}
        drillGoal={{
          label: "Accuracy Shooter",
          progressLabel: "92% / 90%",
          isComplete: true,
        }}
      />
    )

    expect(screen.getByLabelText("No time limit")).not.toBeNull()
    expect(screen.getByText("Goal complete")).not.toBeNull()
    await user.click(screen.getByRole("button", { name: "End Practice" }))
    expect(onEndRound).toHaveBeenCalledOnce()
  })

  test("announces streak milestones without making every score update live", () => {
    const { rerender } = render(<GameHud {...baseProps} streak={9} />)
    const liveRegion = screen.getByRole("status")
    expect(liveRegion.textContent).toBe("")

    rerender(<GameHud {...baseProps} streak={10} comboMultiplier={3} />)
    expect(liveRegion.textContent).toBe("10 hit streak, combo times 3")
    expect(screen.getByLabelText("Score 1,240").getAttribute("aria-live")).toBeNull()
  })
})
