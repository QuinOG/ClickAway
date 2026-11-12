import test from "node:test"
import assert from "node:assert/strict"

import { SHOP_ITEMS } from "../src/constants/shopCatalog.js"
import {
  CATEGORY_CONFIGS,
  DEFAULT_PLAYER_STATE,
  getCatalogItemById,
  getCategoryConfigByType,
  getDefaultItemIdForType,
  getFrontendItemIdByDbItemId,
  getMappedShopItemById,
} from "../server/serverShopCatalogIdMappings.js"

const COSMETIC_TYPES = ["button_skin", "arena_theme", "profile_image"]

test("every catalog item has a database mapping with matching metadata", () => {
  for (const item of SHOP_ITEMS) {
    const mapped = getMappedShopItemById(item.id)

    assert.ok(mapped, `missing database mapping for ${item.id}`)
    assert.equal(mapped.frontendItemId, item.id)
    assert.equal(mapped.type, item.type)
    assert.equal(mapped.builtIn, Boolean(item.builtIn))
    assert.equal(mapped.cost, Number(item.cost) || 0)
  }
})

test("database item ids resolve back to frontend ids for type and collection keys", () => {
  for (const item of SHOP_ITEMS) {
    const mapped = getMappedShopItemById(item.id)

    assert.ok(mapped, `missing database mapping for ${item.id}`)
    assert.equal(getFrontendItemIdByDbItemId(mapped.type, mapped.dbItemId), item.id)
    assert.equal(
      getFrontendItemIdByDbItemId(mapped.collectionType, mapped.dbItemId),
      item.id
    )
  }
})

test("database item ids are unique within each collection type", () => {
  const frontendIdByCollectionKey = new Map()

  for (const item of SHOP_ITEMS) {
    const mapped = getMappedShopItemById(item.id)
    assert.ok(mapped, `missing database mapping for ${item.id}`)

    const collectionKey = `${mapped.collectionType}:${mapped.dbItemId}`
    assert.equal(
      frontendIdByCollectionKey.has(collectionKey),
      false,
      `${collectionKey} is shared by ${frontendIdByCollectionKey.get(collectionKey)} and ${item.id}`
    )
    frontendIdByCollectionKey.set(collectionKey, item.id)
  }
})

test("each cosmetic category exposes a built-in default used by player state", () => {
  assert.deepEqual(
    CATEGORY_CONFIGS.map((config) => config.type).sort(),
    [...COSMETIC_TYPES].sort()
  )

  for (const config of CATEGORY_CONFIGS) {
    assert.equal(getDefaultItemIdForType(config.type), config.defaultItemId)

    const mappedDefault = getMappedShopItemById(config.defaultItemId)
    assert.ok(mappedDefault, `missing database mapping for ${config.defaultItemId}`)
    assert.equal(mappedDefault.builtIn, true)
    assert.equal(mappedDefault.type, config.type)
    assert.equal(DEFAULT_PLAYER_STATE[config.responseKey], config.defaultItemId)
  }
})

test("unknown catalog and database ids return empty results", () => {
  assert.equal(getCatalogItemById("missing_item"), null)
  assert.equal(getMappedShopItemById("missing_item"), null)
  assert.equal(getCategoryConfigByType("missing_type"), null)
  assert.equal(getDefaultItemIdForType("missing_type"), "")
  assert.equal(getFrontendItemIdByDbItemId("button_skin", 9999), "")
  assert.equal(getFrontendItemIdByDbItemId("missing_type", 1), "")
})

test("numeric database ids are normalized before lookup", () => {
  assert.equal(getFrontendItemIdByDbItemId("button_skin", "2"), "skin_neon")
  assert.equal(getFrontendItemIdByDbItemId("button_skin", 2.0), "skin_neon")
})
