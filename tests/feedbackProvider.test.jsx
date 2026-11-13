import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { FeedbackPreferencesProvider } from "../src/app/FeedbackPreferencesContext.jsx"
import { useFeedbackPreferences } from "../src/app/useFeedbackPreferences.js"
import { FEEDBACK_PREFERENCES_STORAGE_KEY } from "../src/app/feedbackPreferences.js"

function Probe() {
  const { preferences } = useFeedbackPreferences()
  return <output>{preferences.muted ? "Muted" : "Sound on"}</output>
}

afterEach(() => localStorage.clear())

test("clearing local storage in another tab restores device defaults", () => {
  localStorage.setItem(FEEDBACK_PREFERENCES_STORAGE_KEY, JSON.stringify({ muted: true }))
  render(<FeedbackPreferencesProvider><Probe /></FeedbackPreferencesProvider>)
  expect(screen.getByText("Muted")).not.toBeNull()
  fireEvent(window, new StorageEvent("storage", { key: null, newValue: null }))
  expect(screen.getByText("Sound on")).not.toBeNull()
  expect(document.documentElement.dataset.sound).toBe("on")
})
