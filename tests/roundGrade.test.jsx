import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, test } from "vitest"

import { FeedbackPreferencesProvider } from "../src/app/FeedbackPreferencesContext.jsx"
import {
  GameOverOverlay,
  getGradeForRound,
  getRoundGrade,
} from "../src/features/game/components/roundOverlays/GameOverOverlay.jsx"

const perfectStats = Array.from({ length: 5 }, () => ({ rating: 10 }))
const cleanFirstRound = {
  score: 500,
  misses: 0,
  bestStreak: 20,
  accuracy: "100%",
  avgReactionMs: 200,
  bestReactionMs: 170,
  bestScore: 0,
}

function renderRound(round) {
  return render(<MemoryRouter><FeedbackPreferencesProvider><GameOverOverlay {...round} /></FeedbackPreferencesProvider></MemoryRouter>)
}

describe("Round grade", () => {
  test.each([
    [3, "C"],
    [9, "C"],
    [10, "B"],
    [15, "B"],
    [19, "B"],
    [20, "S"],
    [30, "S"],
  ])("%i hits with perfect stats grades %s", (hits, grade) => {
    expect(getGradeForRound({ stats: perfectStats, hits })).toBe(grade)
  })

  test("the cap never raises a weak grade", () => {
    const weakStats = [{ rating: 1 }]
    expect(getGradeForRound({ stats: weakStats, hits: 3 })).toBe("D")
    expect(getGradeForRound({ stats: weakStats, hits: 30 })).toBe("D")
  })

  test("keeps the letter thresholds", () => {
    expect([9, 7.5, 6, 4, 3.9].map(getRoundGrade)).toEqual(["S", "A", "B", "C", "D"])
  })

  test("no best score gives a neutral Vs best rating of 5", () => {
    // The other four ratings are 10, 10, 10 and 10, so the average is 9 (S)
    // with a Vs best rating of 5, and drops to A with anything lower.
    renderRound({ ...cleanFirstRound, hits: 30 })
    expect(screen.getByLabelText("Round grade S")).toBeTruthy()
  })

  test("a neutral Vs best rating no longer lifts a first round to S", () => {
    // Streak 16 rates 8, so the average is 8.6. The old rating of 10 gave 9.6.
    renderRound({ ...cleanFirstRound, hits: 30, bestStreak: 16 })
    expect(screen.getByLabelText("Round grade A")).toBeTruthy()
  })

  test("a short round shows a capped grade", () => {
    renderRound({ ...cleanFirstRound, hits: 3 })
    expect(screen.getByLabelText("Round grade C")).toBeTruthy()
  })
})
