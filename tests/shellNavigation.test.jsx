import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, useNavigate } from "react-router-dom"
import { describe, expect, test } from "vitest"

import Navbar from "../src/components/Navbar.jsx"

function renderShell(pathname = "/game", props = {}) {
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <Navbar
        isAuthed
        playerUsername="Player"
        rankProgress={{ tierLabel: "Unranked", isUnranked: true }}
        {...props}
      />
      <button type="button">Outside shell</button>
    </MemoryRouter>
  )
}

describe("Application shell navigation", () => {
  test("closes the keyboard identity popover when focus leaves its scope", async () => {
    const user = userEvent.setup()
    renderShell()

    const identityTrigger = document.querySelector(".shellIdentityButton")
    await user.click(identityTrigger)
    const playerDialog = screen.getByRole("dialog", { name: "Player player details" })
    expect(playerDialog).not.toBeNull()

    await user.tab()
    expect(document.activeElement).toBe(within(playerDialog).getByRole("link", {
      name: "Open full profile",
    }))
    await user.tab()
    await waitFor(() => expect(screen.queryByRole("dialog", {
      name: "Player player details",
    })).toBeNull())
  })

  test("keeps a More-only deep link named and current inside the mobile sheet", async () => {
    const user = userEvent.setup()
    renderShell("/history")

    const moreTrigger = screen.getByRole("button", { name: "History" })
    expect(moreTrigger.getAttribute("aria-current")).toBe("page")
    await user.click(moreTrigger)

    const moreSheet = screen.getByRole("dialog", { name: "More" })
    const historyLink = within(moreSheet).getByRole("link", { name: "History" })
    expect(historyLink.getAttribute("aria-current")).toBe("page")
  })
})

function NavigationControls() {
  const navigate = useNavigate()
  return <>
    <button onClick={() => navigate("/help")}>Navigate away</button>
    <button onClick={() => navigate(-1)}>Go back</button>
  </>
}

test("returning to a route does not reopen its old More menu", async () => {
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={["/game"]}>
    <Navbar isAuthed />
    <NavigationControls />
  </MemoryRouter>)
  await user.click(screen.getByRole("button", { name: "More" }))
  expect(screen.getByRole("dialog", { name: "More" })).not.toBeNull()
  fireEvent.click(screen.getByText("Navigate away"))
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "More" })).toBeNull())
  fireEvent.click(screen.getByText("Go back"))
  expect(screen.queryByRole("dialog", { name: "More" })).toBeNull()
})

test("a live round dismisses More without reopening it afterward", async () => {
  const user = userEvent.setup()
  const shell = (collapsed) => <MemoryRouter><Navbar isAuthed isCollapsed={collapsed} /></MemoryRouter>
  const { rerender } = render(shell(false))
  await user.click(screen.getByRole("button", { name: "More" }))
  expect(screen.getByRole("dialog", { name: "More" })).not.toBeNull()
  rerender(shell(true))
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "More" })).toBeNull())
  rerender(shell(false))
  expect(screen.queryByRole("dialog", { name: "More" })).toBeNull()
})
