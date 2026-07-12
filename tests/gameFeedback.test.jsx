import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"

import MovingButton from "../src/components/MovingButton.jsx"
import ClickFeedbackLayer from "../src/features/game/components/ClickFeedbackLayer.jsx"
import PowerupTray from "../src/features/game/components/PowerupTray.jsx"

const powerupSlots = [
  {
    id: "time_boost",
    label: "Time +2s",
    slotKey: "1",
    awardEvery: 5,
    effectType: "time_boost",
    charges: 2,
  },
  {
    id: "combo_surge",
    label: "Combo Surge",
    slotKey: "2",
    awardEvery: 10,
    effectType: "combo_surge",
    charges: 0,
    comboSurgeHitsRemaining: 3,
  },
  {
    id: "guard_charge",
    label: "Guard Charge",
    slotKey: "3",
    awardEvery: 15,
    effectType: "guard_charge",
    charges: 0,
    isGuardActive: false,
  },
]

describe("Phase 3 game feedback", () => {
  test("renders click outcomes as distinct, non-announced locus cues", () => {
    const { container } = render(
      <ClickFeedbackLayer
        clickFeedbackItems={[
          { id: "hit", x: 10, y: 20, value: "+4", type: "hit comboHit" },
          { id: "guard", x: 30, y: 40, value: "Absorbed", type: "guarded" },
          { id: "break", x: 50, y: 60, value: "Streak broken", type: "streakBreak" },
        ]}
      />
    )

    expect(container.querySelector(".clickFeedback.hit.comboHit .clickFeedbackLocus")).not.toBeNull()
    expect(container.querySelector(".clickFeedback.guarded .clickFeedbackLocus")).not.toBeNull()
    expect(container.querySelector(".clickFeedback.streakBreak .clickFeedbackLocus")).not.toBeNull()
    expect(container.querySelector(".clickFeedbackLayer").getAttribute("aria-hidden")).toBe("true")
  })

  test("uses native hotbar buttons with click, Space, shortcuts, and disabled semantics", async () => {
    const user = userEvent.setup()
    const onUsePowerup = vi.fn()
    render(
      <PowerupTray
        powerupSlots={powerupSlots}
        streak={3}
        isPlaying
        onUsePowerup={onUsePowerup}
      />
    )

    const readyButton = screen.getByRole("button", { name: /Time \+2s: Ready, 2 charges. Shortcut 1/ })
    const activeButton = screen.getByRole("button", { name: /Combo Surge: 3 hits left/ })
    expect(readyButton.getAttribute("aria-keyshortcuts")).toBe("1")
    expect(activeButton.disabled).toBe(true)
    expect(screen.getByText(/ready — press 1 or tap its slot/i)).not.toBeNull()

    readyButton.focus()
    await user.keyboard(" ")
    await user.click(readyButton)
    expect(onUsePowerup).toHaveBeenNthCalledWith(1, "time_boost")
    expect(onUsePowerup).toHaveBeenNthCalledWith(2, "time_boost")
  })

  test("falls back to the semantic target treatment when a cosmetic image fails", () => {
    const { container } = render(
      <MovingButton
        style={{ width: "80px", height: "80px" }}
        label="Click"
        labelFontSize={12}
        skinClass="skin-default"
        skinImageSrc="/missing-skin.png"
      />
    )

    fireEvent.error(container.querySelector(".targetSkinProbe"))
    expect(screen.getByRole("button", { name: "Precision target" }).classList.contains("imageFallback")).toBe(true)
  })
})
