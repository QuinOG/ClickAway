import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, test, vi } from "vitest"

import LoginPage from "../src/pages/LoginPage.jsx"
import SignupPage from "../src/pages/SignupPage.jsx"

function renderPage(page) {
  return render(<MemoryRouter>{page}</MemoryRouter>)
}

describe("Branded auth arrival", () => {
  test("keeps the login form primary and labels the arena as a demonstration", () => {
    renderPage(<LoginPage onLogin={vi.fn()} />)

    expect(screen.getByRole("heading", { level: 1, name: "Return to the arena." })).not.toBeNull()
    expect(screen.getByLabelText("Username")).not.toBeNull()
    expect(screen.getByLabelText("Password")).not.toBeNull()
    expect(screen.getByText(/Arena preview · demonstration only/i)).not.toBeNull()
  })

  test("does not submit signup values outside the server validation limits", async () => {
    const user = userEvent.setup()
    const onSignup = vi.fn()
    renderPage(<SignupPage onSignup={onSignup} />)

    await user.type(screen.getByLabelText("Username"), "ab")
    await user.type(screen.getByLabelText("Password"), "short")
    await user.type(screen.getByLabelText("Confirm Password"), "short")
    await user.click(screen.getByRole("button", { name: "Create competitor" }))

    expect(onSignup).not.toHaveBeenCalled()
    expect(screen.getByText("Username must be at least 3 characters.")).not.toBeNull()
    expect(screen.getByText("Password must be at least 8 characters.")).not.toBeNull()
  })

  test("preserves password visibility and announced API errors", async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn().mockResolvedValue({
      ok: false,
      error: "Too many attempts. Wait a moment, then try again.",
    })
    renderPage(<LoginPage onLogin={onLogin} />)

    const password = screen.getByLabelText("Password")
    expect(password.type).toBe("password")
    await user.click(screen.getByRole("button", { name: "Show password" }))
    expect(password.type).toBe("text")

    await user.type(screen.getByLabelText("Username"), "deadeye")
    await user.type(password, "precision123")
    await user.click(screen.getByRole("button", { name: "Enter arena" }))

    expect((await screen.findByRole("alert")).textContent).toContain("Too many attempts")
  })
})
