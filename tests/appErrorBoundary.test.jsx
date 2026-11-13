import { lazy, Suspense } from "react"
import { render, screen } from "@testing-library/react"
import { expect, test, vi } from "vitest"
import AppErrorBoundary from "../src/components/AppErrorBoundary.jsx"

test("a failed page import leaves a reload control instead of an empty app", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {})
  const FailedPage = lazy(() => Promise.reject(new Error("Page chunk unavailable")))
  render(<AppErrorBoundary><Suspense fallback="Loading"><FailedPage /></Suspense></AppErrorBoundary>)
  expect(await screen.findByRole("alert")).not.toBeNull()
  expect(screen.getByRole("button", { name: "Reload page" })).not.toBeNull()
  expect(screen.getByText(/Saved account progress is kept/)).not.toBeNull()
})
