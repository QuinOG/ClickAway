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

function createProfileImageItem({
  id,
  name,
  cost,
  effectClass,
  imageSrc = "",
  shopImageScale = 100,
  description,
  builtIn = false,
}) {
  return {
    id,
    type: "profile_image",
    name,
    cost,
    effectClass,
    imageSrc,
    shopImageScale,
    description,
    builtIn,
  }
}

function applyIncrementalCosts(items = [], maxCost = 1500) {
  if (!Array.isArray(items) || items.length <= 1) return items

  const lastIndex = items.length - 1

  return items.map((item, index) => ({
    ...item,
    cost: Math.round((maxCost * index) / lastIndex),
  }))
}

export const SHOP_CATEGORIES = [
  {
    id: "button_skins",
    title: "Button Skins",
    description: "Cosmetic styles for the main click target.",
    items: applyIncrementalCosts([
      createButtonSkinItem({
        id: "skin_button",
        name: "Classic",
        builtIn: true,
        imageSrc: "/skins/button.png",
        gameImageScale: 100,
        shopImageScale: 100,
        description: "We got button at home.",
      }),
      createButtonSkinItem({
        id: "skin_neon",
        name: "Neon Ring",
        imageSrc: "/skins/neoncircle.png",
        gameImageScale: 100,
        shopImageScale: 100,
        description: "RGB but make it locked in.",
      }),
      createButtonSkinItem({
        id: "skin_fireball",
        name: "Fireball",
        imageSrc: "/skins/fireball.png",
        gameImageScale: 100,
        shopImageScale: 100,
        description: "Crash out core.",
      }),
      createButtonSkinItem({
        id: "skin_cd",
        name: "CD",
        effectClass: "skin-cd",
        imageSrc: "/skins/cd.png",
        gameImageScale: 100,
        shopImageScale: 100,
        description: "y2k ahh button.",
      }),
      createButtonSkinItem({
        id: "skin_earth",
        name: "Earth",
        imageSrc: "/skins/earth.png",
        gameImageScale: 100,
        shopImageScale: 100,
        description: "Everybody on here weird.",
      }),
      createButtonSkinItem({
        id: "skin_melon",
        name: "Melon",
        imageSrc: "/skins/melon.png",
        gameImageScale: 100,
        shopImageScale: 100,
        description: "Flowkey juicy.",
      }),
      createButtonSkinItem({
        id: "skin_moon",
        name: "Moon",
        imageSrc: "/skins/moon.png",
        gameImageScale: 100,
        shopImageScale: 100,
        description: "Mash the moon away to day.",
      }),
      createButtonSkinItem({
        id: "skin_wheel",
        name: "Wheel",
        imageSrc: "/skins/wheel.png",
        gameImageScale: 100,
        shopImageScale: 100,
        description: "The wheels on the bus go...",
      }),
      createButtonSkinItem({
        id: "skin_xboxbutton",
        name: "Xbox",
        imageSrc: "/skins/xboxbutton.png",
        gameImageScale: 100,
        shopImageScale: 100,
        description: "Button masher.",
      }),
      createButtonSkinItem({
        id: "skin_coin",
        name: "Gold Token",
        imageSrc: "/skins/coin.png",
        gameImageScale: 100,
        shopImageScale: 100,
        description: "Chase dat bag.",
      }),
      createButtonSkinItem({
        id: "skin_donut",
        name: "Gabe's Donut",
        imageSrc: "/skins/donut.png",
        gameImageScale: 100,
        shopImageScale: 100,
        description: "Gabe's sacred donut. To click...",
      }),
      createButtonSkinItem({
        id: "skin_bubble",
        name: "Buuble",
        imageSrc: "/skins/bubble.png",
        gameImageScale: 100,
        shopImageScale: 100,
        description: "Try to pop it",
      }),
      createButtonSkinItem({
        id: "skin_tennis",
        name: "Tennis Ball",
        imageSrc: "/skins/tennis.png",
        gameImageScale: 100,
        shopImageScale: 100,
        description: "This one got bounce.",
      }),
      createButtonSkinItem({
        id: "skin_eye",
        name: "Eye",
        imageSrc: "/skins/eye.png",
        gameImageScale: 100,
        shopImageScale: 100,
        description: "He's always watching...",
      }),
      createButtonSkinItem({
        id: "skin_disco",
        name: "Disco",
        imageSrc: "/skins/disco.png",
        gameImageScale: 100,
        shopImageScale: 100,
        description: "Serving boogiewoogie.",
      }),
      createButtonSkinItem({
        id: "skin_poolball",
        name: "Lucky 7",
        imageSrc: "/skins/poolball.png",
        gameImageScale: 100,
        shopImageScale: 100,
        description: "8 ball’s loud cousin.",
      }),
    ]),
  },
  {
    id: "arena_themes",
    title: "Arena Themes",
    description: "Background/theme swaps for the game arena.",
    items: applyIncrementalCosts([
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
        effectClass: "theme-sunset",
        description: "Warm dusk sky over a glowing retro horizon grid.",
      }),
      createArenaThemeItem({
        id: "theme_forest",
        name: "Forest Glow",
        effectClass: "theme-forest",
        description: "Misty woodland tones with bioluminescent highlights.",
      }),
      createArenaThemeItem({
        id: "theme_arcade",
        name: "Arcade Night",
        effectClass: "theme-arcade",
        description: "Synthwave-inspired night lane with neon lane lines.",
      }),
    ]),
  },
  {
    id: "profile_images",
    title: "Profile Images",
    description: "Equip portraits for your player profile card.",
    items: [
      createProfileImageItem({
        id: "profile_default",
        name: "Pilot Portrait",
        cost: 0,
        builtIn: true,
        effectClass: "profile-image-default",
        description: "Illustrated arena pilot, styled from your username.",
      }),
      createProfileImageItem({
        id: "profile_racoon",
        name: "Raccoon Scout",
        cost: 100,
        effectClass: "profile-image-racoon",
        imageSrc: "/skins/racoon.png",
        shopImageScale: 100,
        description:
          "A sharp-eyed midnight scavenger portrait.",
      }),
      createProfileImageItem({
        id: "profile_lock",
        name: "Secure Lock",
        cost: 100,
        effectClass: "profile-image-lock",
        imageSrc: "/skins/lock.png",
        shopImageScale: 100,
        description:
          "A no-compromise defense mindset.",
      }),
      createProfileImageItem({
        id: "profile_heart",
        name: "Heart Pulse",
        cost: 100,
        effectClass: "profile-image-heart",
        imageSrc: "/skins/heart.png",
        shopImageScale: 100,
        description:
          "A bright heart icon with warm glow accents.",
      }),
      createProfileImageItem({
        id: "profile_ghost",
        name: "Phantom Drift",
        cost: 100,
        effectClass: "profile-image-ghost",
        imageSrc: "/skins/ghost.png",
        shopImageScale: 100,
        description:
          "A mischievous ghost portrait, haunting arcade style.",
      }),
      createProfileImageItem({
        id: "profile_grape",
        name: "Grape Burst",
        cost: 100,
        effectClass: "profile-image-grape",
        imageSrc: "/skins/grape.png",
        shopImageScale: 100,
        description:
          "A juicy grape cluster badge with bold color depth.",
      }),
      createProfileImageItem({
        id: "profile_flashlight",
        name: "Night Beam",
        cost: 100,
        effectClass: "profile-image-flashlight",
        imageSrc: "/skins/flashlight.png",
        shopImageScale: 100,
        description:
          "A tactical flashlight portrait casting a focused beam.",
      }),
    ],
  },
]

export const SHOP_ITEMS = SHOP_CATEGORIES.flatMap((category) => category.items)

export const SHOP_ITEMS_BY_ID = Object.fromEntries(
  SHOP_ITEMS.map((item) => [item.id, item])
)
