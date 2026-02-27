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
        id: "skin_button",
        name: "Classic",
        cost: 0,
        builtIn: true,
        imageSrc: "/button.png",
        gameImageScale: 120,
        shopImageScale: 105,
        description: "Clean button finish.",
      }),
      createButtonSkinItem({
        id: "skin_neon",
        name: "Neon Pulse",
        cost: 25,
        imageSrc: "/neoncircle.avif",
        gameImageScale: 115,
        shopImageScale: 100,
        description: "Electric ring core that pops against dark arenas.",
      }),
      createButtonSkinItem({
        id: "skin_fireball",
        name: "Fireball",
        cost: 30,
        imageSrc: "/fireball.png",
        gameImageScale: 160,
        shopImageScale: 130,
        description: "Molten flame orb with high-contrast impact energy.",
      }),
      createButtonSkinItem({
        id: "skin_cd",
        name: "CD",
        cost: 30,
        imageSrc: "/cd.png",
        gameImageScale: 100,
        shopImageScale: 90,
        description: "CD.",
      }),
      createButtonSkinItem({
        id: "skin_earth",
        name: "Earth",
        cost: 30,
        imageSrc: "/earth.png",
        gameImageScale: 110,
        shopImageScale: 100,
        description: "Earf.",
      }),
      createButtonSkinItem({
        id: "skin_melon",
        name: "Melon",
        cost: 30,
        imageSrc: "/melon.png",
        gameImageScale: 105,
        shopImageScale: 90,
        description: "Melon.",
      }),
      createButtonSkinItem({
        id: "skin_moon",
        name: "Moon",
        cost: 30,
        imageSrc: "/moon.png",
        gameImageScale: 105,
        shopImageScale: 95,
        description: "Earf.",
      }),
      createButtonSkinItem({
        id: "skin_wheel",
        name: "Wheel",
        cost: 30,
        imageSrc: "/wheel.png",
        gameImageScale: 115,
        shopImageScale: 105,
        description: "wheel.",
      }),
      createButtonSkinItem({
        id: "skin_xboxbutton",
        name: "Xbox",
        cost: 30,
        imageSrc: "/xboxbutton.png",
        gameImageScale: 105,
        shopImageScale: 95,
        description: "xboxbutton.",
      }),
      createButtonSkinItem({
        id: "skin_coin",
        name: "Gold Token",
        cost: 999,
        imageSrc: "/coin.png",
        gameImageScale: 140,
        shopImageScale: 130,
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
