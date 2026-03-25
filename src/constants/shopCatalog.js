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
        imageSrc: "/button.png",
        gameImageScale: 120,
        shopImageScale: 105,
        description: "We got button at home.",
      }),
      createButtonSkinItem({
        id: "skin_neon",
        name: "Neon Ring",
        imageSrc: "/neoncircle.avif",
        gameImageScale: 115,
        shopImageScale: 110,
        description: "RGB but make it locked in.",
      }),
      createButtonSkinItem({
        id: "skin_fireball",
        name: "Fireball",
        imageSrc: "/fireball.png",
        gameImageScale: 160,
        shopImageScale: 130,
        description: "Crash out core.",
      }),
      createButtonSkinItem({
        id: "skin_cd",
        name: "CD",
        effectClass: "skin-cd",
        imageSrc: "/cd.png",
        gameImageScale: 100,
        shopImageScale: 90,
        description: "y2k ahh button.",
      }),
      createButtonSkinItem({
        id: "skin_earth",
        name: "Earth",
        imageSrc: "/earth.png",
        gameImageScale: 110,
        shopImageScale: 100,
        description: "Everybody on here weird.",
      }),
      createButtonSkinItem({
        id: "skin_melon",
        name: "Melon",
        imageSrc: "/melon.png",
        gameImageScale: 105,
        shopImageScale: 90,
        description: "Flowkey juicy.",
      }),
      createButtonSkinItem({
        id: "skin_moon",
        name: "Moon",
        imageSrc: "/moon.png",
        gameImageScale: 105,
        shopImageScale: 95,
        description: "Mash the moon away to day.",
      }),
      createButtonSkinItem({
        id: "skin_wheel",
        name: "Wheel",
        imageSrc: "/wheel.png",
        gameImageScale: 115,
        shopImageScale: 105,
        description: "The wheels on the bus go...",
      }),
      createButtonSkinItem({
        id: "skin_xboxbutton",
        name: "Xbox",
        imageSrc: "/xboxbutton.png",
        gameImageScale: 105,
        shopImageScale: 95,
        description: "Button masher.",
      }),
      createButtonSkinItem({
        id: "skin_coin",
        name: "Gold Token",
        imageSrc: "/coin.png",
        gameImageScale: 140,
        shopImageScale: 130,
        description: "Chase dat bag.",
      }),
      createButtonSkinItem({
        id: "skin_donut",
        name: "Gabe's Donut",
        imageSrc: "/donut.png",
        gameImageScale: 140,
        shopImageScale: 120,
        description: "Gabe's sacred donut. To click...",
      }),
      createButtonSkinItem({
        id: "skin_bubble",
        name: "Buuble",
        imageSrc: "/bubble.png",
        gameImageScale: 260,
        shopImageScale: 250,
        description: "Try to pop it!",
      }),
      createButtonSkinItem({
        id: "skin_tennis",
        name: "Tennis Ball",
        imageSrc: "/tennis.png",
        gameImageScale: 120,
        shopImageScale: 120,
        description: "This one got bounce.",
      }),
      createButtonSkinItem({
        id: "skin_eye",
        name: "Eye",
        imageSrc: "/eye.png",
        gameImageScale: 150,
        shopImageScale: 150,
        description: "He's always watching...",
      }),
      createButtonSkinItem({
        id: "skin_disco",
        name: "Disco",
        imageSrc: "/disco.png",
        gameImageScale: 120,
        shopImageScale: 120,
        description: "Serving boogiewoogie.",
      }),
      createButtonSkinItem({
        id: "skin_poolball",
        name: "Lucky 7",
        imageSrc: "/poolball.png",
        gameImageScale: 125,
        shopImageScale: 130,
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
        name: "Identity Gradient",
        cost: 0,
        builtIn: true,
        effectClass: "profile-image-default",
        description: "Dynamic initials tile keyed to your username.",
      }),
      createProfileImageItem({
        id: "profile_racoon",
        name: "Raccoon Scout",
        cost: 100,
        effectClass: "profile-image-racoon",
        imageSrc: "/racoon.png",
        shopImageScale: 96,
        description:
          "A sharp-eyed midnight scavenger portrait.",
      }),
      createProfileImageItem({
        id: "profile_lock",
        name: "Secure Lock",
        cost: 100,
        effectClass: "profile-image-lock",
        imageSrc: "/lock.png",
        shopImageScale: 94,
        description:
          "A no-compromise defense mindset.",
      }),
      createProfileImageItem({
        id: "profile_heart",
        name: "Heart Pulse",
        cost: 100,
        effectClass: "profile-image-heart",
        imageSrc: "/heart.png",
        shopImageScale: 95,
        description:
          "A bright heart icon with warm glow accents.",
      }),
      createProfileImageItem({
        id: "profile_ghost",
        name: "Phantom Drift",
        cost: 100,
        effectClass: "profile-image-ghost",
        imageSrc: "/ghost.png",
        shopImageScale: 95,
        description:
          "A mischievous ghost portrait, haunting arcade style.",
      }),
      createProfileImageItem({
        id: "profile_grape",
        name: "Grape Burst",
        cost: 100,
        effectClass: "profile-image-grape",
        imageSrc: "/grape.png",
        shopImageScale: 93,
        description:
          "A juicy grape cluster badge with bold color depth.",
      }),
      createProfileImageItem({
        id: "profile_flashlight",
        name: "Night Beam",
        cost: 100,
        effectClass: "profile-image-flashlight",
        imageSrc: "/flashlight.png",
        shopImageScale: 94,
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
