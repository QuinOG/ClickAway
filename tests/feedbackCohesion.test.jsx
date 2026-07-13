import { render, screen } from "@testing-library/react"
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

describe("Cohesive action feedback", () => {
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
