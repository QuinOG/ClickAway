import path from "node:path"
import { test, expect } from "@playwright/test"
import { prepareDeterministicPage, sessionFixture } from "./fixtures.js"

const out = "C:/Users/quinl/AppData/Local/Temp/claude/8f5fc2fbe33c61b7/52a8d379-0918-4105-90fd-d3f7d1db2f63/scratchpad/councilT1/rc"
for (const [width, height] of [[1440, 900], [390, 844]]) {
  for (const personalBest of [false, true]) {
    test(`council rc ${personalBest ? "pb" : "normal"} ${width}`, async ({ page }) => {
      test.setTimeout(120_000)
      page.on("pageerror", (error) => console.log(error.message))
      await page.setViewportSize({ width, height })
      await prepareDeterministicPage(page, { progressOverrides: personalBest ? {
        lifetimeStats: { ...sessionFixture.progress.lifetimeStats, bestSingleScore: 1 },
        roundHistory: [], loadoutStats: [],
      } : {} })
      await page.clock.install({ time: new Date("2026-07-12T16:00:00.000Z") })
      await page.goto("/game")
      await expect(page.getByRole("button", { name: /^Start / }).last()).toBeVisible({ timeout: 60_000 })
      await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)))
      await page.getByRole("button", { name: /^Start / }).last().click()
      await page.clock.runFor(4000)
      for (let hit = 0; hit < 12; hit += 1) {
        await page.locator(".arena .bigCircleButton").first().click({ force: true })
        await page.clock.runFor(110)
      }
      await page.clock.fastForward(70000)
      await page.clock.resume()
      await expect(page.locator(".gameOverReward.isCoins")).toContainText("+16")
      await expect(page.locator(".gameOverReward.isXp")).toContainText("+160")
      await expect(page.getByText(/Saving round/)).toHaveCount(0)
      // Pin the full visual fixture after the real save; animation-frame timing
      // can otherwise change hits and grades under different machine load.
      await page.evaluate(async ({ personalBest }) => {
        const { default: React } = await import("/node_modules/.vite/deps/react.js")
        const { default: { createRoot } } = await import("/node_modules/.vite/deps/react-dom_client.js")
        const overlaySource = await (await fetch("/src/features/game/components/roundOverlays/GameOverOverlay.jsx")).text()
        const { MemoryRouter } = await import(overlaySource.match(/"([^"]*react-router-dom.js[^"]*)"/)[1])
        const { FeedbackPreferencesProvider } = await import("/src/app/FeedbackPreferencesContext.jsx")
        const { GameOverOverlay } = await import("/src/features/game/components/roundOverlays/GameOverOverlay.jsx")
        const { getLevelProgress } = await import("/src/utils/progressionUtils.js")
        const { level, xpIntoLevel } = getLevelProgress(4400)
        const original = document.querySelector(".gameOverCard")
        const rect = original.parentElement.getBoundingClientRect()
        original.remove()
        const parent = document.createElement("div")
        Object.assign(parent.style, { position: "fixed", top: `${rect.top}px`, left: `${rect.left}px`, width: `${rect.width}px`, height: `${rect.height}px`, display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: "100" })
        document.body.appendChild(parent)
        createRoot(parent).render(React.createElement(MemoryRouter, null,
          React.createElement(FeedbackPreferencesProvider, null,
            React.createElement(GameOverOverlay, {
              score: 128, hits: 24, misses: 3, bestStreak: 21, accuracy: "89%",
              avgReactionMs: 286, bestReactionMs: 219,
              modeLabel: "Casual", selectedModeId: "normal", bestScore: personalBest ? 1 : 1040,
              allowsCoinRewards: true, allowsLevelProgression: true,
              playerLevel: level, playerXpIntoLevel: xpIntoLevel, playerCoins: 1850,
              roundCoinsEarned: 16, roundXpEarned: 160, roundSaveStatus: "saved",
              primaryActionLabel: "Play Again", onPrimaryAction() {},
              secondaryActionLabel: "Change Mode", onSecondaryAction() {},
            }))))
      }, { personalBest })
      await expect(page.locator(".gameOverScorePanel")).toHaveAttribute("aria-label", "Final score 128")
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(650)
      const play = await page.getByRole("button", { name: "Play Again", exact: true }).boundingBox()
      expect(play.y + play.height).toBeLessThanOrEqual(height === 844 ? 780 : height)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
      await page.screenshot({ path: path.join(out, `${process.env.COUNCIL_PHASE || "before"}-${personalBest ? "pb" : "normal"}-${width === 390 ? "phone" : "desktop"}.png`), animations: "disabled" })
    })
  }
}