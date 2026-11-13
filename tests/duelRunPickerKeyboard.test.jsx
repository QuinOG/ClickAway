import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, test, vi } from "vitest"

import ChallengesPage from "../src/pages/ChallengesPage.jsx"
import { fetchChallenges, fetchUserReplays, sendChallenge } from "../src/services/clickAwayHttpApiClient.js"

vi.mock("../src/services/clickAwayHttpApiClient.js", () => ({
  fetchChallenges: vi.fn(),
  fetchUserReplays: vi.fn(),
  respondToChallenge: vi.fn(),
  sendChallenge: vi.fn(),
}))

const replays = [
  { id: 1, modeId: "hard", score: 910 },
  { id: 2, modeId: "normal", score: 720 },
  { id: 3, modeId: "easy", score: 505 },
]

function renderDuels(path = "/challenges") {
  return render(<MemoryRouter initialEntries={[path]}><ChallengesPage currentUserId={7} currentUsername="Vector" /></MemoryRouter>)
}

const runs = () => screen.getAllByRole("radio")
const checked = () => runs().filter((run) => run.getAttribute("aria-checked") === "true").map((run) => run.textContent)
const tabStops = () => runs().filter((run) => run.tabIndex === 0)

beforeEach(() => {
  vi.clearAllMocks()
  fetchChallenges.mockResolvedValue({ challenges: [] })
  fetchUserReplays.mockResolvedValue({ replays })
  sendChallenge.mockResolvedValue({ challenge: { id: 9 } })
})

describe("Duel run picker keyboard", () => {
  test("the picker is one Tab stop that lands on the first run, then on the chosen run", async () => {
    const user = userEvent.setup()
    renderDuels()
    await waitFor(() => expect(runs()).toHaveLength(3))
    expect(tabStops()).toEqual([runs()[0]])
    await user.click(runs()[1])
    expect(tabStops()).toEqual([runs()[1]])
  })

  test("arrow keys move and select, wrapping at the ends; Home and End jump", async () => {
    const user = userEvent.setup()
    renderDuels()
    await waitFor(() => expect(runs()).toHaveLength(3))
    runs()[0].focus()
    await user.keyboard("{ArrowRight}")
    expect(document.activeElement).toBe(runs()[1])
    expect(checked()[0]).toMatch(/720/)
    await user.keyboard("{ArrowDown}{ArrowDown}")
    expect(document.activeElement).toBe(runs()[0])
    expect(checked()[0]).toMatch(/910/)
    await user.keyboard("{ArrowLeft}")
    expect(document.activeElement).toBe(runs()[2])
    expect(checked()[0]).toMatch(/505/)
    await user.keyboard("{Home}")
    expect(checked()[0]).toMatch(/910/)
    await user.keyboard("{End}")
    expect(document.activeElement).toBe(runs()[2])
    expect(checked()).toHaveLength(1)
  })

  test("a run chosen with the keyboard is the one that is sent", async () => {
    const user = userEvent.setup()
    renderDuels("/challenges?rival=Kestrel")
    await waitFor(() => expect(runs()).toHaveLength(3))
    runs()[0].focus()
    await user.keyboard("{ArrowRight}")
    expect(screen.getByText("720", { selector: ".duelReplayLock strong" })).toBeTruthy()
    await user.click(screen.getByRole("button", { name: /Send duel/ }))
    await waitFor(() => expect(sendChallenge).toHaveBeenCalledWith(expect.objectContaining({ opponentUsername: "Kestrel", replayId: 2 })))
  })

  test("with no runs the Record a run path is unchanged", async () => {
    fetchUserReplays.mockResolvedValue({ replays: [] })
    renderDuels()
    expect(await screen.findByRole("button", { name: /Record a run/ })).toBeTruthy()
    expect(screen.queryAllByRole("radio")).toHaveLength(0)
  })
})
