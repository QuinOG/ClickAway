import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, expect, test, vi } from "vitest"

import App from "../src/App.jsx"
import { FeedbackPreferencesProvider } from "../src/app/FeedbackPreferencesContext.jsx"

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))

vi.mock("axios", () => ({
  default: { create: () => ({ get, post }) },
}))

afterEach(() => localStorage.clear())

test("logging out of all devices posts to logout-all and opens the login page", async () => {
  get.mockImplementation(async (path) => ({
    data: path === "/auth/me" ? { user: { id: 42, username: "Player" }, progress: {} } : {},
  }))
  post.mockResolvedValue({ status: 204 })
  render(
    <MemoryRouter initialEntries={["/profile"]}>
      <FeedbackPreferencesProvider>
        <App />
      </FeedbackPreferencesProvider>
    </MemoryRouter>
  )

  fireEvent.click(await screen.findByRole("button", { name: "Log out of all devices" }))

  expect(post).toHaveBeenCalledExactlyOnceWith("/auth/logout-all")
  expect(await screen.findByRole("heading", { name: "Return to the arena." })).toBeTruthy()
})
