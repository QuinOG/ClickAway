import { SHOP_CATEGORIES, SHOP_ITEMS_BY_ID } from "../src/constants/shopCatalog.js"

const CATEGORY_CONFIG_BY_TYPE = {
  button_skin: {
    type: "button_skin",
    collectionType: "button_skin",
    currentUserColumn: "current_button_skin_id",
    defaultItemId: "skin_button",
    responseKey: "equippedButtonSkinId",
  },
  arena_theme: {
    type: "arena_theme",
    collectionType: "arena_theme",
    currentUserColumn: "current_arena_theme_id",
    defaultItemId: "theme_default",
    responseKey: "equippedArenaThemeId",
  },
  profile_image: {
    type: "profile_image",
    collectionType: "profile_theme",
    currentUserColumn: "current_profile_theme_id",
    defaultItemId: "profile_default",
    responseKey: "equippedProfileImageId",
  },
}

const MYSQL_ITEM_IDS_BY_FRONTEND_ID = {
  skin_button: 1,
  skin_neon: 2,
  skin_fireball: 3,
  skin_cd: 4,
  skin_earth: 5,
  skin_melon: 6,
  skin_coin: 7,
  skin_moon: 8,
  skin_wheel: 9,
  skin_xboxbutton: 10,
  skin_donut: 11,
  skin_bubble: 12,
  skin_tennis: 13,
  skin_eye: 14,
  skin_disco: 15,
  skin_poolball: 16,
  theme_default: 1,
  theme_sunset: 2,
  theme_forest: 3,
  theme_arcade: 4,
  profile_default: 1,
  profile_racoon: 2,
  profile_lock: 3,
  profile_heart: 4,
  profile_ghost: 5,
  profile_grape: 6,
  profile_flashlight: 7,
}

const SHOP_ITEM_DB_MAP = Object.fromEntries(
  SHOP_CATEGORIES.flatMap((category) =>
    category.items.map((item) => {
      const categoryConfig = CATEGORY_CONFIG_BY_TYPE[item.type]
      const dbItemId = MYSQL_ITEM_IDS_BY_FRONTEND_ID[item.id]

      if (!categoryConfig) {
        throw new Error(`Missing category config for "${item.type}".`)
      }

      if (!dbItemId) {
        throw new Error(`Missing MySQL item mapping for frontend item "${item.id}".`)
      }

      return [
        item.id,
        {
          frontendItemId: item.id,
          dbItemId,
          type: item.type,
          collectionType: categoryConfig.collectionType,
          currentUserColumn: categoryConfig.currentUserColumn,
          responseKey: categoryConfig.responseKey,
          defaultItemId: categoryConfig.defaultItemId,
          builtIn: Boolean(item.builtIn),
          cost: Number(item.cost) || 0,
        },
      ]
    })
  )
)

const FRONTEND_ITEM_ID_BY_DB_KEY = Object.fromEntries(
  Object.values(SHOP_ITEM_DB_MAP).flatMap((item) => [
    [`${item.type}:${item.dbItemId}`, item.frontendItemId],
    [`${item.collectionType}:${item.dbItemId}`, item.frontendItemId],
  ])
)

export const DEFAULT_PLAYER_STATE = {
  coins: 0,
  ownedItemIds: [],
  equippedButtonSkinId: CATEGORY_CONFIG_BY_TYPE.button_skin.defaultItemId,
  equippedArenaThemeId: CATEGORY_CONFIG_BY_TYPE.arena_theme.defaultItemId,
  equippedProfileImageId: CATEGORY_CONFIG_BY_TYPE.profile_image.defaultItemId,
}

export const CATEGORY_CONFIGS = Object.values(CATEGORY_CONFIG_BY_TYPE)

export function getCatalogItemById(itemId) {
  return SHOP_ITEMS_BY_ID[itemId] ?? null
}

export function getCategoryConfigByType(type) {
  return CATEGORY_CONFIG_BY_TYPE[type] ?? null
}

export function getDefaultItemIdForType(type) {
  return CATEGORY_CONFIG_BY_TYPE[type]?.defaultItemId || ""
}

export function getMappedShopItemById(itemId) {
  return SHOP_ITEM_DB_MAP[itemId] ?? null
}

export function getFrontendItemIdByDbItemId(type, dbItemId) {
  return FRONTEND_ITEM_ID_BY_DB_KEY[`${type}:${Number(dbItemId)}`] || ""
}
