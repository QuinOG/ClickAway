import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { expect, test, vi } from "vitest"
import ChallengesPage from "../src/pages/ChallengesPage.jsx"
import { fetchChallenges, fetchUserReplays } from "../src/services/clickAwayHttpApiClient.js"
vi.mock("../src/services/clickAwayHttpApiClient.js", () => ({ fetchChallenges: vi.fn(), fetchUserReplays: vi.fn(), respondToChallenge: vi.fn(), sendChallenge: vi.fn() }))

test("string viewer IDs orient numeric incoming, sent and completed duels", async () => {
  const base = { challengerUserId: 8, opponentUserId: 7, challengerUsername: "Rival", opponentUsername: "Viewer", modeId: "normal", replayScore: 100 }
  fetchChallenges.mockResolvedValue({ challenges: [
    { ...base, id: 1, status: "pending" },
    { ...base, id: 2, status: "accepted" },
    { ...base, id: 3, status: "completed", opponentReplayScore: 200, challengerWon: false },
    { ...base, id: 4, status: "completed", challengerUserId: 7, opponentUserId: 8, challengerUsername: "Viewer", opponentUsername: "SentRival", opponentReplayScore: 200, challengerWon: false },
  ] })
  fetchUserReplays.mockResolvedValue({ replays: [] })
  render(<MemoryRouter><ChallengesPage currentUserId=" 7 " currentUsername="Viewer" /></MemoryRouter>)
  expect(await screen.findByRole("button", { name: "Accept" })).toBeTruthy()
  expect(screen.getByRole("button", { name: "Decline" })).toBeTruthy()
  expect(screen.getByRole("button", { name: "Race Ghost" })).toBeTruthy()
  const results = screen.getAllByRole("article")
  expect(within(results[2]).getByText("200 - 100")).toBeTruthy()
  expect(within(results[2]).getByText("You won")).toBeTruthy()
  expect(within(results[3]).getByText("100 - 200")).toBeTruthy()
  expect(within(results[3]).getByText("You lost")).toBeTruthy()
  await userEvent.click(screen.getByRole("tab", { name: /Incoming.*1/ }))
  expect(screen.getAllByRole("article")).toHaveLength(3)
  await userEvent.click(screen.getByRole("tab", { name: "Sent" }))
  expect(screen.getAllByRole("article")).toHaveLength(1)
  expect(screen.getByText("SentRival")).toBeTruthy()
})
