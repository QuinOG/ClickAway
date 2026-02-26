function createButtonSkinItem({
  id,
  name,
  cost,
  effectClass,
  imageSrc = "",
  gameImageScale = 100,
  shopImageScale = 100,
  description,
  builtIn = false,
}) {
  return {
    id,
    type: "button_skin",
    name,
    cost,
    effectClass,
    imageSrc,
    gameImageScale,
    shopImageScale,
    description,
    builtIn,
  }
}

function createArenaThemeItem({
  id,
  name,
  cost,
  effectClass,
  description,
  builtIn = false,
}) {
  return {
    id,
    type: "arena_theme",
    name,
    cost,
    effectClass,
    description,
    builtIn,
  }
}

export const SHOP_CATEGORIES = [
  {
    id: "button_skins",
    title: "Button Skins",
    description: "Cosmetic styles for the main click target.",
    items: [
      createButtonSkinItem({
        id: "skin_default",
        name: "Classic Mint",
        cost: 0,
        builtIn: true,
        effectClass: "skin-default",
        gameImageScale: 100,
        shopImageScale: 100,
        description: "Clean mint finish with a soft arcade glow.",
      }),
      createButtonSkinItem({
        id: "skin_neon",
        name: "Neon Pulse",
        cost: 25,
        effectClass: "skin-neoncircle",
        imageSrc: "/neoncircle.avif",
        gameImageScale: 115,
        shopImageScale: 90,
        description: "Electric ring core that pops against dark arenas.",
      }),
      createButtonSkinItem({
        id: "skin_fireball",
        name: "Fireball",
        cost: 30,
        effectClass: "skin-fireball",
        imageSrc: "/fireball.png",
        gameImageScale: 190,
        shopImageScale: 125,
        description: "Molten flame orb with high-contrast impact energy.",
      }),
      createButtonSkinItem({
        id: "skin_coin",
        name: "Gold Token",
        cost: 999,
        effectClass: "skin-coin",
        imageSrc: "/coin.png",
        gameImageScale: 140,
        shopImageScale: 120,
        description: "Classic arcade token style with metallic shine.",
      }),
    ],
  },
  {
    id: "arena_themes",
    title: "Arena Themes",
    description: "Background/theme swaps for the game arena.",
    items: [
      createArenaThemeItem({
        id: "theme_default",
        name: "Classic Arena",
        cost: 0,
        builtIn: true,
        effectClass: "theme-default",
        description: "Balanced training arena with subtle focus lighting.",
      }),
      createArenaThemeItem({
        id: "theme_sunset",
        name: "Sunset Grid",
        cost: 40,
        effectClass: "theme-sunset",
        description: "Warm dusk sky over a glowing retro horizon grid.",
      }),
      createArenaThemeItem({
        id: "theme_forest",
        name: "Forest Glow",
        cost: 45,
        effectClass: "theme-forest",
        description: "Misty woodland tones with bioluminescent highlights.",
      }),
      createArenaThemeItem({
        id: "theme_arcade",
        name: "Arcade Night",
        cost: 999,
        effectClass: "theme-arcade",
        description: "Synthwave-inspired night lane with neon lane lines.",
      }),
    ],
  },
]

export const SHOP_ITEMS = SHOP_CATEGORIES.flatMap((category) => category.items)

export const SHOP_ITEMS_BY_ID = Object.fromEntries(
  SHOP_ITEMS.map((item) => [item.id, item])
)
