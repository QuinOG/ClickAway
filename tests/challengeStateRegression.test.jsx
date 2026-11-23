import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, expect, test, vi } from "vitest"
import ChallengesPage from "../src/pages/ChallengesPage.jsx"
import { fetchChallenges, fetchUserReplays, respondToChallenge } from "../src/services/clickAwayHttpApiClient.js"

vi.mock("../src/services/clickAwayHttpApiClient.js", () => ({
  fetchChallenges: vi.fn(), fetchUserReplays: vi.fn(), respondToChallenge: vi.fn(), sendChallenge: vi.fn(),
}))

const challenges = [1, 2].map((id) => ({
  id, challengerUserId: id + 10, opponentUserId: 7, challengerUsername: `Rival${id}`,
  opponentUsername: "Viewer", modeId: "normal", replayScore: 100, status: "pending",
}))
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const show = () => render(<MemoryRouter><ChallengesPage currentUserId={7} currentUsername="Viewer" /></MemoryRouter>)

beforeEach(() => {
  vi.resetAllMocks()
  fetchChallenges.mockResolvedValue({ challenges })
  fetchUserReplays.mockResolvedValue({ replays: [] })
})

test("concurrent responses keep each challenge disabled until its own completion", async () => {
  const first = deferred(), second = deferred()
  respondToChallenge.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
  show()
  const accepts = await screen.findAllByRole("button", { name: "Accept" })
  fireEvent.click(accepts[0])
  fireEvent.click(accepts[1])
  const assertDisabled = (index, disabled) => {
    const card = accepts[index].closest("article")
    expect(within(card).getByRole("button", { name: "Accept" }).disabled).toBe(disabled)
    expect(within(card).getByRole("button", { name: "Decline" }).disabled).toBe(disabled)
  }
  assertDisabled(0, true)
  assertDisabled(1, true)
  await act(async () => { first.resolve() })
  assertDisabled(0, false)
  assertDisabled(1, true)
  expect(respondToChallenge).toHaveBeenCalledTimes(2)
  await act(async () => { second.resolve() })
  assertDisabled(1, false)
})

test("response errors stay inline with the loaded list and clear on another response", async () => {
  const second = deferred()
  respondToChallenge.mockRejectedValueOnce(new Error("Unable to accept this duel"))
    .mockReturnValueOnce(second.promise)
  show()
  const accepts = await screen.findAllByRole("button", { name: "Accept" })
  fireEvent.click(accepts[0])
  expect((await screen.findByRole("alert")).textContent).toBe("Unable to accept this duel")
  expect(screen.queryByText("Rival network unavailable")).toBeNull()
  expect(screen.getAllByRole("article")).toHaveLength(2)
  await waitFor(() => expect(accepts[0].disabled).toBe(false))
  fireEvent.click(accepts[1])
  expect(screen.queryByRole("alert")).toBeNull()
  await act(async () => { second.resolve() })
})

test("filter tabs rove focus and selection and label their inbox panel", async () => {
  show()
  await screen.findAllByRole("button", { name: "Accept" })
  const tabs = screen.getAllByRole("tab")
  const panel = screen.getByRole("tabpanel")
  const assertSelected = (index) => {
    tabs.forEach((tab, i) => {
      expect(tab.tabIndex).toBe(i === index ? 0 : -1)
      expect(tab.getAttribute("aria-selected")).toBe(String(i === index))
      expect(tab.getAttribute("aria-controls")).toBe(panel.id)
    })
    expect(panel.getAttribute("aria-labelledby")).toBe(tabs[index].id)
  }
  assertSelected(0)
  tabs[0].focus()
  const user = userEvent.setup()
  for (const [key, index] of [["{ArrowRight}", 1], ["{End}", 2], ["{ArrowRight}", 0], ["{ArrowLeft}", 2], ["{Home}", 0]]) {
    await user.keyboard(key)
    expect(document.activeElement).toBe(tabs[index])
    assertSelected(index)
  }
})
