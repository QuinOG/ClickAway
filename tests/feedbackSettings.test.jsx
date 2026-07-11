import { useRef, useState } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, test, vi } from "vitest"

import { FeedbackPreferencesProvider } from "../src/app/FeedbackPreferencesContext.jsx"
import { FEEDBACK_PREFERENCES_STORAGE_KEY } from "../src/app/feedbackPreferences.js"
import FeedbackSettingsSheet from "../src/components/FeedbackSettingsSheet.jsx"

function SettingsHarness() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)

  return (
    <FeedbackPreferencesProvider>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
        Open feedback settings
      </button>
      <FeedbackSettingsSheet
        open={open}
        onOpenChange={setOpen}
        triggerRef={triggerRef}
      />
    </FeedbackPreferencesProvider>
  )
}

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  delete document.documentElement.dataset.motionReduced
  delete document.documentElement.dataset.flashes
  delete document.documentElement.dataset.feedbackIntensity
})

describe("Feedback settings", () => {
  test("keeps a draft local until Apply and previews an unapplied mute", async () => {
    const user = userEvent.setup()
    render(<SettingsHarness />)

    await user.click(screen.getByRole("button", { name: "Open feedback settings" }))
    const mute = screen.getByRole("checkbox", { name: /Mute all sound/i })
    const masterVolume = screen.getByRole("slider", { name: /Master volume/ })
    const highIntensity = screen.getByRole("radio", { name: "High" })

    fireEvent.change(masterVolume, { target: { value: "35" } })
    await user.click(highIntensity)
    await user.click(mute)
    expect(localStorage.getItem(FEEDBACK_PREFERENCES_STORAGE_KEY)).toBeNull()

    await user.click(screen.getByRole("button", { name: "Test cue" }))
    expect(await screen.findByText("Sound is muted.")).not.toBeNull()

    await user.click(screen.getByRole("button", { name: "Apply" }))
    const stored = JSON.parse(localStorage.getItem(FEEDBACK_PREFERENCES_STORAGE_KEY))
    expect(stored.muted).toBe(true)
    expect(stored.masterVolume).toBe(0.35)
    expect(stored.feedbackIntensity).toBe("high")
    expect(screen.getByText("Preferences are saved.")).not.toBeNull()
  })

  test("announces persistence failure instead of claiming settings were saved", async () => {
    const user = userEvent.setup()
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage full", "QuotaExceededError")
    })
    render(<SettingsHarness />)

    await user.click(screen.getByRole("button", { name: "Open feedback settings" }))
    await user.click(screen.getByRole("checkbox", { name: /Mute all sound/i }))
    await user.click(screen.getByRole("button", { name: "Apply" }))

    expect(await screen.findByText("Could not save preferences.")).not.toBeNull()
  })

  test("shows unavailable haptics and honors the OS reduced-motion override", async () => {
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
    const user = userEvent.setup()
    render(<SettingsHarness />)

    await user.click(screen.getByRole("button", { name: "Open feedback settings" }))
    expect(screen.getByRole("checkbox", { name: /Touch vibration/i }).disabled).toBe(true)
    expect(screen.getByText("Vibration is not available in this browser.")).not.toBeNull()
    expect(screen.getByRole("checkbox", { name: /Screen shake/i }).disabled).toBe(true)
    expect(screen.getByRole("checkbox", { name: /Celebration effects/i }).disabled).toBe(true)
    expect(screen.getByText("Your system setting disables screen shake.")).not.toBeNull()
  })

  test("Escape closes the sheet and restores the invoking control", async () => {
    const user = userEvent.setup()
    render(<SettingsHarness />)

    const trigger = screen.getByRole("button", { name: "Open feedback settings" })
    await user.click(trigger)
    expect(screen.getByRole("dialog", { name: "Feedback settings" })).not.toBeNull()

    await user.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })
})
