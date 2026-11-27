import { act, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"

import { FeedbackPreferencesContext } from "../src/app/feedbackPreferencesContextValue.js"
import { FEEDBACK_EVENTS } from "../src/constants/feedbackEvents.js"
import { useActionFeedback } from "../src/hooks/useActionFeedback.js"

function FeedbackHarness() {
  const { signalAction } = useActionFeedback()
  return (
    <button
      type="button"
      onClick={(event) => signalAction(event.currentTarget, {
        eventName: FEEDBACK_EVENTS.SELECTION,
        eventId: "test-selection",
      })}
    >
      Select signal
    </button>
  )
}

function ExternalFeedbackHarness({ source }) {
  const { signalAction } = useActionFeedback()
  return <button onClick={() => signalAction(source)}>Signal external source</button>
}

describe("Cohesive action feedback", () => {
  test("unmount clears feedback from a persisting external source before its timer expires", () => {
    vi.useFakeTimers()
    const source = document.createElement("button")
    document.body.append(source)
    const { unmount } = render(<ExternalFeedbackHarness source={source} />)
    try {
      fireEvent.click(screen.getByRole("button", { name: "Signal external source" }))
      expect(source.getAttribute("data-action-feedback")).toBe("confirmed")
      act(() => vi.advanceTimersByTime(100))
      unmount()
      expect(source.isConnected).toBe(true)
      expect(source.hasAttribute("data-action-feedback")).toBe(false)
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      unmount()
      source.remove()
      vi.useRealTimers()
    }
  })

  test("links visible source state to the preference-aware feedback event", async () => {
    const user = userEvent.setup()
    const emitFeedback = vi.fn()
    render(
      <FeedbackPreferencesContext.Provider value={{ emitFeedback }}>
        <FeedbackHarness />
      </FeedbackPreferencesContext.Provider>
    )

    const source = screen.getByRole("button", { name: "Select signal" })
    await user.click(source)

    expect(source.dataset.actionFeedback).toBe("confirmed")
    expect(emitFeedback).toHaveBeenCalledWith(FEEDBACK_EVENTS.SELECTION, expect.objectContaining({
      eventId: "test-selection",
      scope: "interface",
    }))
  })

  test("keeps the visible source cue when no feedback provider is mounted", async () => {
    const user = userEvent.setup()
    render(<FeedbackHarness />)
    const source = screen.getByRole("button", { name: "Select signal" })

    await user.click(source)
    expect(source.dataset.actionFeedback).toBe("confirmed")
  })
})
