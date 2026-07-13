import { render, screen, within } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"

import ProfilePage from "../src/pages/ProfilePage.jsx"

const lifetimeStats = {
  totalRounds: 24,
  rankedRounds: 8,
  totalHits: 180,
  totalMisses: 20,
  bestSingleScore: 860,
  bestStreak: 14,
  reactionRounds: 8,
  totalReactionMs: 2480,
  bestReactionMs: 244,
}

const roundHistory = [
  { playedAtIso: new Date().toISOString(), progressionMode: "ranked", score: 810, rankDelta: 14 },
  { playedAtIso: new Date().toISOString(), progressionMode: "ranked", score: 720, rankDelta: -5 },
  { playedAtIso: new Date().toISOString(), progressionMode: "casual", score: 690, rankDelta: 0 },
]

function renderProfile() {
  return render(
    <ProfilePage
      onLogout={vi.fn()}
      playerName="vector"
      coins={740}
      levelProgress={{ level: 12, progressPercent: 64, xpToNextLevel: 360 }}
      rankProgress={{
        tierLabel: "Gold II",
        rr: 64,
        rrMax: 100,
        mmrToNextTier: 36,
        nextTierLabel: "Gold I",
      }}
      roundHistory={roundHistory}
      lifetimeStats={lifetimeStats}
      loadoutStats={[{
        loadoutId: "tempo",
        loadoutName: "Tempo Control",
        totalRounds: 18,
        totalHits: 144,
        totalMisses: 16,
        bestScore: 820,
      }]}
      achievementStats={{
        level: 12,
        currentCoins: 740,
        totalRounds: 24,
        rankedRounds: 8,
        bestStreak: 14,
        totalCoinsEarned: 2100,
        cleanRounds: 3,
        bestSingleRoundAccuracy: 96,
        bestRankedStreak: 10,
        bestSingleScore: 860,
        maxConsecutiveRankedWins: 4,
      }}
    />
  )
}

describe("Player identity cockpit", () => {
  test("shows identity, progression, strength, form, build, and nearest goal in one composition", () => {
    const { container } = renderProfile()

    expect(screen.getByRole("heading", { name: "Vector" })).not.toBeNull()
    expect(screen.getByLabelText("Gold II rank, level 12")).not.toBeNull()
    expect(screen.getByText(/Signature strength/)).not.toBeNull()
    expect(screen.getByRole("heading", { name: "Last 3 rounds" })).not.toBeNull()
    expect(screen.getByRole("heading", { name: "Tempo Control" })).not.toBeNull()

    const nearestGoal = container.querySelector(".profileNearestGoal")
    expect(nearestGoal).not.toBeNull()
    expect(within(nearestGoal).getByText("Nearest achievement")).not.toBeNull()
    expect(nearestGoal.querySelector(".profileGoalTrack span")).not.toBeNull()
  })

  test("keeps the achievement constellation browsable below the cockpit", () => {
    renderProfile()

    expect(screen.getByRole("heading", { name: "Achievement constellation" })).not.toBeNull()
    expect(screen.getByRole("tablist", { name: "Achievement categories" })).not.toBeNull()
    expect(screen.getByRole("link", { name: "View milestones" }).getAttribute("href"))
      .toBe("#achievement-constellation")
  })
})
