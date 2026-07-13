import { expect } from "@playwright/test"

import {
  LOADOUT_POWERUPS,
  PASSIVE_LOADOUT_MODULES,
} from "../../src/constants/buildcraft.js"
import { SHOP_CATEGORIES } from "../../src/constants/shopCatalog.js"

export const AUTHENTICATED_ROUTES = [
  { id: "play", path: "/game", heading: "Enter the arena" },
  { id: "armory", path: "/armory", heading: "Armory" },
  { id: "shop", path: "/shop", heading: "Cosmetic shop" },
  { id: "profile", path: "/profile", heading: "Vector" },
  { id: "ladder", path: "/leaderboard", heading: "Climb the field" },
  { id: "duels", path: "/challenges", heading: "Duel command" },
  { id: "history", path: "/history", heading: "Match history" },
  { id: "help", path: "/help", heading: "Learn by sight" },
]

const FIXED_NOW = "2026-07-12T16:00:00.000Z"

const rounds = Array.from({ length: 8 }, (_, index) => {
  const ranked = index % 3 === 0
  const modeId = ranked ? "hard" : index % 2 === 0 ? "easy" : "normal"
  const hits = 34 - index
  const misses = 2 + (index % 3)

  return {
    id: `round-${index + 1}`,
    playedAtIso: new Date(Date.parse(FIXED_NOW) - ((index + 1) * 86_400_000)).toISOString(),
    score: 920 - (index * 47),
    hits,
    misses,
    bestStreak: 18 - index,
    accuracyPercent: Math.round((hits / (hits + misses)) * 100),
    avgReactionMs: 286 + (index * 9),
    bestReactionMs: 219 + (index * 5),
    coinsEarned: ranked ? 75 : 40,
    xpEarned: ranked ? 125 : 70,
    modeId,
    progressionMode: ranked ? "ranked" : modeId === "easy" ? "practice" : "casual",
    rankDelta: ranked ? (index === 3 ? -8 : 14) : 0,
    loadoutSnapshot: {
      loadoutId: "loadout_1",
      loadoutName: "Tempo Control",
      moduleIds: {
        tempoCoreId: "tempo_balanced",
        streakLensId: "streak_momentum",
        powerRigId: "power_surge",
      },
      powerupIds: ["guard", "combo_surge", "second_wind"],
    },
  }
})

export const sessionFixture = {
  user: { id: 7, username: "Vector" },
  progress: {
    coins: 1850,
    levelXp: 4400,
    rankMmr: 764,
    rankedState: {
      rankSystemVersion: 4,
      placementMatchesPlayed: 5,
      placementScoreTotal: 0,
      demotionProtectionRounds: 1,
      consecutiveRankedWins: 2,
    },
    ownedItemIds: ["skin_button", "skin_neon", "theme_default", "profile_default"],
    equippedButtonSkinId: "skin_neon",
    equippedArenaThemeId: "theme_default",
    equippedProfileImageId: "profile_default",
    roundHistory: rounds,
    totalRoundCount: 32,
    lifetimeStats: {
      totalRounds: 32,
      rankedRounds: 11,
      bestStreak: 21,
      bestSingleScore: 1040,
      bestRankedStreak: 18,
      bestSingleRoundAccuracy: 100,
      cleanRounds: 4,
      totalCoinsEarned: 3100,
      totalHits: 864,
      totalMisses: 71,
      maxConsecutiveRankedWins: 4,
      currentConsecutiveRankedWins: 2,
      reactionRounds: 28,
      totalReactionMs: 7896,
      bestReactionMs: 196,
    },
    loadoutStats: [{
      loadoutId: "loadout_1",
      loadoutName: "Tempo Control",
      totalRounds: 24,
      rankedRounds: 9,
      rankedWins: 6,
      bestScore: 1040,
      bestStreak: 21,
      totalHits: 690,
      totalMisses: 52,
    }],
    unlockedAchievementIds: [],
    buildWalkthrough: { status: "dismissed" },
    seenUnlockPartIds: [
      ...PASSIVE_LOADOUT_MODULES.map((part) => part.id),
      ...LOADOUT_POWERUPS.map((part) => part.id),
    ],
  },
}

const leaderboardRows = [
  [1, 21, "Nova", 980, 6100, 1280, 25, 98, 188],
  [2, 14, "Orbit", 910, 5600, 1160, 22, 96, 201],
  [3, 9, "Kestrel", 840, 5100, 1090, 20, 95, 208],
  [4, 7, "Vector", 764, 4400, 1040, 21, 92, 196],
  [5, 18, "Prism", 720, 3900, 970, 17, 91, 224],
].map(([rank, userId, username, mmr, levelXp, bestScore, bestStreak, accuracyPercent, bestReactionMs]) => ({
  rank,
  userId,
  username,
  mmr,
  levelXp,
  bestScore,
  bestStreak,
  accuracyPercent,
  bestReactionMs,
  rankedRounds: 12,
  coins: 900,
}))

const challenges = [{
  id: 41,
  challengerUserId: "21",
  challengerUsername: "Nova",
  opponentUserId: "7",
  opponentUsername: "Vector",
  replayId: 101,
  replayScore: 920,
  modeId: "normal",
  message: "Catch this line.",
  status: "pending",
  createdAt: "2026-07-11T16:00:00.000Z",
}]

const replays = rounds.slice(0, 3).map((round, index) => ({
  id: 101 + index,
  username: "Vector",
  modeId: round.modeId,
  score: round.score,
  seed: 4000 + index,
  events: [{ type: "hit", t: 500 }, { type: "hit", t: 1100 }],
  createdAt: round.playedAtIso,
}))

function json(route, body, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) })
}

export async function installApiMocks(page, {
  authenticated = true,
  dataState = "rich",
  authDelayMs = 0,
} = {}) {
  let currentProgress = structuredClone(sessionFixture.progress)
  let currentChallenges = structuredClone(challenges)

  await page.route("**/api/**", async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace(/^\/api/, "")

    if (path === "/auth/me") {
      if (authDelayMs) await new Promise((resolve) => setTimeout(resolve, authDelayMs))
      return authenticated
        ? json(route, { ...sessionFixture, progress: currentProgress })
        : json(route, { error: "Your session has expired." }, 401)
    }

    if (path === "/auth/logout") return json(route, { ok: true })
    if (path === "/auth/login" || path === "/auth/signup") {
      return json(route, { ...sessionFixture, progress: currentProgress })
    }
    if (path === "/progress") {
      if (request.method() === "PUT") {
        currentProgress = { ...currentProgress, ...request.postDataJSON() }
      }
      return json(route, { progress: currentProgress })
    }
    if (path === "/round/start") return json(route, { roundToken: "e3-round-token", seed: 424242 })

    if (path === "/leaderboard") {
      if (dataState === "error") return json(route, { error: "Standings are temporarily unavailable." }, 503)
      const rows = dataState === "empty" ? [] : dataState === "sparse" ? leaderboardRows.slice(0, 2) : leaderboardRows
      return json(route, {
        rows,
        page: 1,
        totalPages: rows.length ? 1 : 0,
        totalCount: rows.length,
        selfRank: dataState === "empty" ? null : 4,
        board: url.searchParams.get("board") || "mmr",
        view: url.searchParams.get("view") || "top",
        season: {
          id: 3,
          slug: "vector-season",
          name: "Vector Season",
          status: "active",
          startsAt: "2026-06-01T00:00:00.000Z",
          endsAt: "2026-09-01T00:00:00.000Z",
        },
      })
    }

    if (path === "/challenges") {
      if (request.method() === "POST") {
        const payload = request.postDataJSON()
        const challenge = {
          ...challenges[0],
          id: 42,
          challengerUserId: "7",
          challengerUsername: "Vector",
          opponentUserId: "22",
          opponentUsername: payload.opponentUsername,
          replayId: payload.replayId,
          message: payload.message,
        }
        currentChallenges = [...currentChallenges, challenge]
        return json(route, { challenge })
      }
      if (dataState === "error") return json(route, { error: "Duel channel is offline." }, 503)
      return json(route, { challenges: dataState === "empty" ? [] : currentChallenges })
    }
    if (/^\/challenges\/\d+\/respond$/.test(path)) {
      const challengeId = Number(path.split("/")[2])
      const action = request.postDataJSON().action
      currentChallenges = currentChallenges.map((challenge) => (
        challenge.id === challengeId
          ? { ...challenge, status: action === "accept" ? "accepted" : "declined" }
          : challenge
      ))
      return json(route, { challenge: currentChallenges.find((challenge) => challenge.id === challengeId) })
    }
    if (path === "/replays") return json(route, { replays: dataState === "empty" ? [] : replays })
    if (/^\/replays\/\d+$/.test(path)) return json(route, { replay: replays[0] })
    if (path === "/history") return json(route, { entries: [], hasMore: false, page: 2 })
    if (path === "/shop/purchase") {
      const itemId = request.postDataJSON().itemId
      const item = SHOP_CATEGORIES.flatMap((category) => category.items)
        .find((candidate) => candidate.id === itemId)
      currentProgress = {
        ...currentProgress,
        coins: Math.max(0, currentProgress.coins - (item?.cost ?? 0)),
        ownedItemIds: Array.from(new Set([...currentProgress.ownedItemIds, itemId])),
      }
      return json(route, { progress: currentProgress })
    }
    if (path === "/shop/equip") {
      const itemId = request.postDataJSON().itemId
      const item = SHOP_CATEGORIES.flatMap((category) => category.items)
        .find((candidate) => candidate.id === itemId)
      const equippedKeyByType = {
        button_skin: "equippedButtonSkinId",
        arena_theme: "equippedArenaThemeId",
        profile_image: "equippedProfileImageId",
      }
      const equippedKey = equippedKeyByType[item?.type]
      currentProgress = equippedKey
        ? { ...currentProgress, [equippedKey]: itemId }
        : currentProgress
      return json(route, { progress: currentProgress })
    }

    return json(route, {})
  })
}

export async function prepareDeterministicPage(page, options = {}) {
  await page.clock.setFixedTime(new Date(FIXED_NOW))
  await installApiMocks(page, options)
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" })
  await page.addInitScript(() => {
    localStorage.setItem("clickaway.feedback-preferences.v1", JSON.stringify({
      masterVolume: 0.7,
      sfxVolume: 0.75,
      muted: true,
      reduceMotion: true,
      screenShake: false,
      flashes: false,
      haptics: false,
      feedbackIntensity: "standard",
    }))
  })
}

export async function gotoRoute(page, route) {
  await page.goto(route.path)
  await expect(page.locator(".sessionArrival")).toHaveCount(0)
  await expect(page.locator(".routeFallback")).toHaveCount(0)
  await expect(page.getByRole("heading", { name: route.heading, exact: true }).first()).toBeVisible()
  await page.evaluate(async () => document.fonts?.ready)
  await expect(page.locator("body")).not.toHaveAttribute("data-loading", "true")
}

export async function getOverflowReport(page) {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth
    const offenders = Array.from(document.querySelectorAll("body *"))
      .filter((element) => {
        const style = getComputedStyle(element)
        if (style.position === "fixed" && style.visibility === "hidden") return false
        if (style.display === "none" || style.visibility === "hidden") return false
        const rect = element.getBoundingClientRect()
        return rect.width > 0 && (rect.left < -1 || rect.right > viewportWidth + 1)
      })
      .slice(0, 12)
      .map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          tag: element.tagName.toLowerCase(),
          className: String(element.className || "").slice(0, 120),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        }
      })

    return {
      viewportWidth,
      scrollWidth: document.documentElement.scrollWidth,
      offenders,
    }
  })
}
