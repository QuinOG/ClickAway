import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"

import { FeedbackPreferencesProvider } from "../src/app/FeedbackPreferencesContext.jsx"
import GameArena from "../src/features/game/components/GameArena.jsx"
import { CountdownOverlay } from "../src/features/game/components/roundOverlays/CountdownOverlay.jsx"

function renderEntrance(props) {
  return render(
    <FeedbackPreferencesProvider>
      <CountdownOverlay {...props} />
    </FeedbackPreferencesProvider>
  )
}

describe("Arena entrance", () => {
  test("announces only the active countdown cue and presents the arena briefing", () => {
    renderEntrance({
      countdownValue: 3,
      modeId: "hard",
      modeLabel: "Ranked",
      loadoutName: "Tempo Control",
    })

    expect(screen.getByRole("status").textContent).toContain("3")
    expect(screen.getByText("Ranked arena")).not.toBeNull()
    expect(screen.getByText("Tempo Control")).not.toBeNull()
    expect(screen.getByText(/Input locked/i)).not.toBeNull()
  })

  test("shows Ranked token waiting and recoverable failure states", () => {
    const onCancel = vi.fn()
    const onRetry = vi.fn()
    const { rerender } = renderEntrance({
      modeId: "hard",
      modeLabel: "Ranked",
      startStatus: "requesting",
      onCancel,
    })

    expect(screen.getByText("Securing your round")).not.toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onCancel).toHaveBeenCalledOnce()

    rerender(
      <FeedbackPreferencesProvider>
        <CountdownOverlay
          modeId="hard"
          modeLabel="Ranked"
          startStatus="error"
          startError="Ranked service unavailable."
          onRetry={onRetry}
          onCancel={onCancel}
        />
      </FeedbackPreferencesProvider>
    )

    expect(screen.getByRole("alert").textContent).toContain("Ranked service unavailable.")
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  test("keeps the target hidden until play activates", () => {
    const arenaProps = {
      arenaRef: { current: null },
      arenaThemeClass: "theme-default",
      onArenaClick: vi.fn(),
      buttonStyle: { width: "100px", height: "100px", left: "0", top: "0" },
      onButtonClick: vi.fn(),
      isButtonDisabled: true,
      buttonLabel: "Click",
      buttonLabelFontSize: 16,
      buttonSkinClass: "skin-default",
      buttonSkinImageSrc: "",
      buttonSkinImageScale: 100,
      clickFeedbackItems: [],
    }
    const { rerender } = render(<GameArena {...arenaProps} isTargetVisible={false} />)

    expect(screen.queryByRole("button")).toBeNull()

    rerender(<GameArena {...arenaProps} isTargetVisible />)
    expect(screen.getByRole("button").disabled).toBe(true)
  })
})
