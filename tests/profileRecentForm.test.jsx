import { render } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import ProfilePage, { buildRecentForm } from "../src/pages/ProfilePage.jsx"

const casual = (score) => ({ progressionMode: "non_ranked", score })
const ranked = (score) => ({ progressionMode: "ranked", score })
const practice = (score) => ({ progressionMode: "practice", score })

// History is newest first.
const mixedHistory = [casual(120), practice(900), ranked(40), casual(100)]

describe("Profile recent form", () => {
  test("compares only rounds in the newest round's mode", () => {
    const form = buildRecentForm(mixedHistory)
    expect(form.trendModeLabel).toBe("Casual")
    expect(form.averageScore).toBe(110)
    expect(form.trendPercent).toBe(20)
    expect(form.bars.map((bar) => bar.score)).toEqual([100, 40, 900, 120])
  })

  test("keeps up to 7 same-mode rounds, even past the 7 newest rounds", () => {
    const history = [
      casual(200),
      ...Array.from({ length: 6 }, () => ranked(10)),
      ...Array.from({ length: 6 }, () => casual(100)),
      casual(9000),
    ]
    const form = buildRecentForm(history)
    expect(form.averageScore).toBe(Math.round((200 + 6 * 100) / 7))
    expect(form.bars).toHaveLength(7)
  })

  test("a single round has no trend", () => {
    expect(buildRecentForm([casual(100)]).trendPercent).toBe(0)
  })

  test("an empty history has no average, trend, or mode", () => {
    const form = buildRecentForm([])
    expect(form.averageScore).toBe(0)
    expect(form.trendPercent).toBe(0)
    expect(form.trendModeLabel).toBeNull()
  })

  test.each([
    ["the compared mode beside the trend", mixedHistory, "Casual · +20%"],
    ["Calibrating when the newest mode has one round", [casual(100), ranked(40), ranked(50)], "Casual · Calibrating"],
    ["Calibrating alone with no history", [], "Calibrating"],
  ])("shows %s", (_, history, text) => {
    const { container } = render(<ProfilePage roundHistory={history} />)
    expect(container.querySelector(".profileMiniHeading strong").textContent).toBe(text)
  })
})
