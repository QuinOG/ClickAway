import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, test, vi } from "vitest"

import ChallengesPage from "../src/pages/ChallengesPage.jsx"
import LeaderboardPage from "../src/pages/LeaderboardPage.jsx"
import {
  fetchChallenges,
  fetchLeaderboard,
  fetchUserReplays,
  sendChallenge,
} from "../src/services/clickAwayHttpApiClient.js"

vi.mock("../src/services/clickAwayHttpApiClient.js", () => ({
  fetchLeaderboard: vi.fn(),
  fetchChallenges: vi.fn(),
  fetchUserReplays: vi.fn(),
  respondToChallenge: vi.fn(),
  sendChallenge: vi.fn(),
}))

const ladderRow = (rank, userId, username, mmr) => ({
  rank, userId, username, mmr, levelXp: 4000, bestScore: 900, bestStreak: 20, accuracyPercent: 90, bestReactionMs: 200,
})

const replays = [{ id: 41, modeId: "hard", score: 880 }]

function renderApp(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/leaderboard" element={<LeaderboardPage isAuthed currentUserId={7} currentUsername="Vector" />} />
        <Route path="/challenges" element={<ChallengesPage currentUserId={7} currentUsername="Vector" />} />
      </Routes>
    </MemoryRouter>,
  )
}

const rivalInput = () => screen.getByRole("textbox", { name: "Opponent username" })

beforeEach(() => {
  vi.clearAllMocks()
  fetchLeaderboard.mockResolvedValue({
    rows: [ladderRow(3, 9, "Kestrel", 840), ladderRow(4, 7, "Vector", 764), ladderRow(5, 18, "Prism", 720)],
    page: 1, totalPages: 1, totalCount: 3, selfRank: 4,
  })
  fetchChallenges.mockResolvedValue({ challenges: [] })
  fetchUserReplays.mockResolvedValue({ replays })
  sendChallenge.mockResolvedValue({ challenge: { id: 1 } })
})

describe("Challenge a Ladder player", () => {
  test("other players' rows have a named challenge control; your own row does not", async () => {
    renderApp("/leaderboard")
    const ladder = await screen.findByRole("list", { name: /Ladder sorted by/ })
    expect(within(ladder).getByRole("link", { name: "Challenge Kestrel to a ghost duel" })).toBeTruthy()
    expect(within(ladder).getByRole("link", { name: "Challenge Prism to a ghost duel" })).toBeTruthy()
    expect(within(ladder).queryByRole("link", { name: /Challenge Vector/ })).toBeNull()
  })

  test("the challenge control opens Duels with the rival filled in, and the duel goes to them", async () => {
    const user = userEvent.setup()
    renderApp("/leaderboard")
    await user.click(await screen.findByRole("link", { name: "Challenge Kestrel to a ghost duel" }))
    await waitFor(() => expect(rivalInput().value).toBe("Kestrel"))
    expect(screen.getByText("Rival set to Kestrel. Pick a run to stake, or type another name.")).toBeTruthy()
    await waitFor(() => expect(document.activeElement?.className).toBe("duelLadderRivalNote"))

    await user.click(await screen.findByRole("radio", { name: /880/ }))
    await user.click(screen.getByRole("button", { name: /Send duel/ }))
    await waitFor(() => expect(sendChallenge).toHaveBeenCalledWith(expect.objectContaining({ opponentUsername: "Kestrel", replayId: 41 })))
    await waitFor(() => expect(rivalInput().value).toBe(""))
  })

  test("the pre-filled rival can be changed before sending", async () => {
    const user = userEvent.setup()
    renderApp("/challenges?rival=Kestrel")
    await waitFor(() => expect(rivalInput().value).toBe("Kestrel"))
    await user.clear(rivalInput())
    await user.type(rivalInput(), "Prism")
    expect(rivalInput().value).toBe("Prism")
  })

  test("a rival still fills in when the player has no runs yet", async () => {
    fetchUserReplays.mockResolvedValue({ replays: [] })
    renderApp("/challenges?rival=Kestrel")
    await waitFor(() => expect(rivalInput().value).toBe("Kestrel"))
    expect(await screen.findByRole("button", { name: /Record a run/ })).toBeTruthy()
  })

  test.each([
    ["your own name", "Vector"],
    ["an empty name", "%20%20"],
    ["an over-long name", "x".repeat(40)],
  ])("arriving with %s does not fill the rival", async (_label, rival) => {
    renderApp(`/challenges?rival=${rival}`)
    await screen.findByRole("textbox", { name: "Opponent username" })
    await waitFor(() => expect(fetchUserReplays).toHaveBeenCalled())
    expect(rivalInput().value).toBe("")
    expect(screen.queryByText(/Rival set to/)).toBeNull()
  })
})
