import test from "node:test"
import assert from "node:assert/strict"

import { SHOP_ITEMS } from "../src/constants/shopCatalog.js"
import { getNewlyAffordableShopItem } from "../src/utils/shopUtils.js"

const items = [
  { id: "starter", name: "Starter", cost: 0, builtIn: true },
  { id: "free", name: "Free", cost: 0 },
  { id: "bundled", name: "Bundled", cost: 250, builtIn: true },
  { id: "ring", name: "Ring", cost: 300 },
  { id: "comet", name: "Comet", cost: 200 },
  { id: "twin", name: "Twin", cost: 200 },
  { id: "crown", name: "Crown", cost: 900 },
]

function pick(coinsBefore, coinsAfter, ownedItemIds = []) {
  return getNewlyAffordableShopItem(items, { coinsBefore, coinsAfter, ownedItemIds })?.id ?? null
}

test("names the cheapest item the round's coins brought within reach", () => {
  assert.equal(pick(150, 320), "comet")
  assert.equal(pick(850, 1000), "crown")
})

test("equal prices keep catalog order", () => {
  assert.equal(pick(150, 320, ["comet"]), "twin")
  assert.equal(pick(150, 320), "comet")
})

test("items the player could already afford are left out", () => {
  assert.equal(pick(200, 320), "ring")
  assert.equal(pick(300, 320), null)
})

test("owned, built-in and free items are left out", () => {
  assert.equal(pick(150, 320, ["comet", "twin"]), "ring")
  assert.equal(pick(150, 320, ["comet", "twin", "ring"]), null)
  // Bundled costs 250 but is built-in; Free and Starter cost nothing.
  assert.equal(pick(0, 260, ["comet", "twin"]), null)
  assert.equal(pick(-5, 0), null)
})

test("nothing when the new balance is below every price", () => {
  assert.equal(pick(0, 199), null)
  assert.equal(pick(310, 899), null)
})

test("landing exactly on the price counts, and starting on it doesn't", () => {
  assert.equal(pick(199, 200), "comet")
  assert.equal(pick(299, 300), "ring")
  assert.equal(pick(200, 299), null)
})

test("an unknown balance or a round without coins shows nothing", () => {
  assert.equal(pick(null, 320), null)
  assert.equal(pick(150, null), null)
  assert.equal(pick(undefined, 320), null)
  assert.equal(pick(150, 150), null)
  assert.equal(pick(150, Number.NaN), null)
  assert.equal(getNewlyAffordableShopItem(null, { coinsBefore: 0, coinsAfter: 500 }), null)
  assert.equal(getNewlyAffordableShopItem(items), null)
})

test("the real catalog: the first cosmetic a new player can buy", () => {
  const buyable = SHOP_ITEMS.filter((item) => !item.builtIn && item.cost > 0)
  const cheapestCost = Math.min(...buyable.map((item) => item.cost))
  const firstCheapest = buyable.find((item) => item.cost === cheapestCost)
  const picked = getNewlyAffordableShopItem(SHOP_ITEMS, { coinsBefore: cheapestCost - 1, coinsAfter: cheapestCost })
  assert.equal(picked.id, firstCheapest.id)
  assert.equal(getNewlyAffordableShopItem(SHOP_ITEMS, {
    coinsBefore: 0,
    coinsAfter: 1e9,
    ownedItemIds: buyable.map((item) => item.id),
  }), null)
})
