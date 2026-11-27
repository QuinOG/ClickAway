import { lazy, Suspense } from "react"
import { render, screen } from "@testing-library/react"
import { expect, test, vi } from "vitest"
import AppErrorBoundary from "../src/components/AppErrorBoundary.jsx"

test("a failed page import leaves a reload control instead of an empty app", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {})
  const FailedPage = lazy(() => Promise.reject(new Error("Page chunk unavailable")))
  render(<AppErrorBoundary><Suspense fallback="Loading"><FailedPage /></Suspense></AppErrorBoundary>)
  expect(await screen.findByRole("alert")).not.toBeNull()
  expect(screen.getByRole("main").contains(screen.getByRole("alert"))).toBe(true)
  expect(screen.getByRole("main")).not.toBe(screen.getByRole("alert"))
  expect(screen.getByRole("button", { name: "Reload page" })).not.toBeNull()
  expect(screen.getByText(/Saved account progress is kept/)).not.toBeNull()
})

test("a render error is logged with the thrown error", () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {})
  const crash = new Error("Render exploded")
  function BrokenPage() {
    throw crash
  }
  render(<AppErrorBoundary><BrokenPage /></AppErrorBoundary>)
  expect(screen.getByRole("alert")).not.toBeNull()
  const logged = spy.mock.calls.find((call) => call[0] === "ClickAway crashed while rendering:")
  expect(logged).toBeDefined()
  expect(logged[1]).toBe(crash)
  spy.mockRestore()
})
