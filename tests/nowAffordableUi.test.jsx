import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { FeedbackPreferencesProvider } from "../src/app/FeedbackPreferencesContext.jsx"
import { SHOP_ITEMS } from "../src/constants/shopCatalog.js"
import { GameOverFlow } from "../src/features/game/components/roundOverlays/GameOverFlow.jsx"

// Read from the catalog so a price change doesn't break these.
const buyable = SHOP_ITEMS.filter((item) => !item.builtIn && item.cost > 0)
const cheapestCost = Math.min(...buyable.map((item) => item.cost))
const [cheapest, nextAtSamePrice] = buyable.filter((item) => item.cost === cheapestCost)

const results = {
  score: 128, hits: 24, misses: 3, bestStreak: 21, accuracy: "89%", modeLabel: "Casual", selectedModeId: "normal",
  bestScore: 110, playerLevel: 4, playerXpIntoLevel: 30, playerXpToNextLevel: 900,
  roundXpEarned: 162, allowsCoinRewards: true, allowsLevelProgression: true,
  // This round's coins take the balance from just under the cheapest price to it.
  playerCoins: cheapestCost - 10, roundCoinsEarned: 10,
  onRematch: vi.fn(), onChooseMode: vi.fn(),
}

function renderResults(overrides = {}) {
  return render(
    <MemoryRouter>
      <FeedbackPreferencesProvider>
        <GameOverFlow {...results} roundSaveStatus="saved" {...overrides} />
      </FeedbackPreferencesProvider>
    </MemoryRouter>
  )
}

function queryRow(container) {
  return container.querySelector(".gameOverNowAffordable")
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("Now affordable on Results", () => {
  test("names the cosmetic and a link to the Shop once the round is saved", () => {
    const { container } = renderResults()
    const row = queryRow(container)
    expect(row.closest(".resultEvents")).toBeTruthy()
    expect(row.textContent).toContain(`Now affordable: ${cheapest.name}`)
    const link = within(row).getByRole("link", { name: `Open Shop to buy ${cheapest.name}` })
    expect(link.textContent).toBe("Shop")
    expect(link.getAttribute("href")).toBe("/shop")
  })

  test("skips a cosmetic the player already owns", () => {
    const { container } = renderResults({ ownedItemIds: [cheapest.id] })
    if (nextAtSamePrice) {
      expect(queryRow(container).textContent.includes(nextAtSamePrice.name)).toBeTruthy()
    } else {
      expect(queryRow(container)).toBeNull()
    }
  })

  test("absent while the round is still saving or when the save failed", () => {
    const saving = renderResults({ roundSaveStatus: "saving" })
    expect(queryRow(saving.container)).toBeNull()
    saving.unmount()
    const failed = renderResults({ roundSaveStatus: "failed" })
    expect(queryRow(failed.container)).toBeNull()
  })

  test("absent in Practice, which awards no coins", () => {
    const { container } = renderResults({ allowsCoinRewards: false, allowsLevelProgression: false })
    expect(queryRow(container)).toBeNull()
    expect(screen.queryByRole("link", { name: /Open Shop/ })).toBeNull()
  })

  test("absent when the starting balance is unknown", () => {
    const { container } = renderResults({ playerCoins: null })
    expect(queryRow(container)).toBeNull()
  })

  test("absent when the round's coins crossed no price", () => {
    // Still short of the cheapest cosmetic.
    const short = renderResults({ playerCoins: 0, roundCoinsEarned: cheapestCost - 1 })
    expect(queryRow(short.container)).toBeNull()
    short.unmount()
    // Could already afford everything before the round.
    const rich = renderResults({ playerCoins: 1e7, roundCoinsEarned: 78 })
    expect(queryRow(rich.container)).toBeNull()
  })
})
