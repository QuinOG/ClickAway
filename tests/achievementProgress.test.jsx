import { render, screen } from "@testing-library/react"
import { expect, test } from "vitest"
import AchievementTile from "../src/components/achievements/AchievementTile.jsx"
import { evaluateAchievements } from "../src/game/achievements/evaluateAchievements.js"

test("persisted medals retain their full progress ring and bar without current metrics", () => {
  const achievement = evaluateAchievements({}, { persistedUnlockedIds: ["easy-rounds-1"] })
    .find((item) => item.id === "easy-rounds-1")
  const { container } = render(<AchievementTile achievement={achievement} />)
  expect(screen.queryByText("N/A")).toBeNull()
  expect(container.querySelector(".achievementProgressFill").style.width).toBe("100%")
  expect(screen.getByRole("article").getAttribute("aria-label")).toContain("Unlocked")
})
