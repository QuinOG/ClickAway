import test from "node:test"
import assert from "node:assert/strict"
import { isShopItemOwned, canPurchaseShopItem, getShopItemStatus } from "../src/utils/shopUtils.js"

const item = { id: "skin", type: "button_skin", cost: 100 }

test("shop ownership tolerates missing or malformed owned item lists", () => {
  for (const ownedItemIds of [undefined, null, {}, "skin", 42]) {
    assert.equal(isShopItemOwned(item, ownedItemIds), false)
    assert.equal(isShopItemOwned({ ...item, builtIn: true }, ownedItemIds), true)
    assert.equal(canPurchaseShopItem(item, 100, ownedItemIds), true)
    assert.equal(getShopItemStatus({ item, coins: 100, ownedItemIds }).state, "affordable")
  }
  assert.equal(isShopItemOwned(item, [item.id]), true)
  assert.equal(canPurchaseShopItem(item, 100, [item.id]), false)
  assert.equal(canPurchaseShopItem({ ...item, builtIn: true }, 100, []), false)
})

test("missing shop items produce a locked status", () => {
  for (const item of [undefined, null]) {
    assert.equal(canPurchaseShopItem(item, 100, []), false)
    assert.deepEqual(getShopItemStatus({ item, coins: 100 }), {
      isOwned: false, canAfford: false, isAffordable: false, isEquipped: false, state: "locked",
    })
  }
})

test("shop affordability requires finite numeric balances and prices", () => {
  for (const invalid of [undefined, null, "", true, false, NaN, Infinity, -Infinity, "100"]) {
    for (const [candidate, coins] of [[{ ...item, cost: 0 }, invalid], [{ ...item, cost: invalid }, 100]]) {
      assert.equal(canPurchaseShopItem(candidate, coins, []), false)
      const status = getShopItemStatus({ item: candidate, coins, ownedItemIds: [] })
      assert.equal(status.canAfford, false)
      assert.equal(status.state, "locked")
    }
  }
  for (const [coins, expected] of [[99, false], [100, true], [101, true]]) {
    assert.equal(canPurchaseShopItem(item, coins, []), expected)
    assert.equal(getShopItemStatus({ item, coins, ownedItemIds: [] }).canAfford, expected)
  }
  assert.equal(canPurchaseShopItem({ ...item, cost: 0 }, 0, []), true)
})
