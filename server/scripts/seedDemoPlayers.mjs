import { randomBytes } from "node:crypto"
import { pathToFileURL } from "node:url"
import { buildDemoPlan, DEMO_PLAYER_USERNAMES, removeDemoPlayers, summarizeDemoPlan } from "./demoPlayerData.js"

export function parseArgs(args) {
  const options = { count: 24, days: 21, dryRun: false, remove: false, duelsTo: null }
  const seen = new Set()
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (seen.has(arg)) throw new Error(`Duplicate option: ${arg}`)
    seen.add(arg)
    if (arg === "--dry-run") options.dryRun = true
    else if (arg === "--remove") options.remove = true
    else if (["--count", "--days", "--duels-to"].includes(arg)) {
      const value = args[++i]
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}`)
      if (arg === "--duels-to") options.duelsTo = value.trim()
      else options[arg.slice(2)] = /^\d+$/.test(value) ? Number(value) : NaN
    } else throw new Error(`Unknown option: ${arg}`)
  }
  if (!Number.isInteger(options.count) || options.count < 1 || options.count > DEMO_PLAYER_USERNAMES.length) throw new Error("Count must be between 1 and 30.")
  if (!Number.isInteger(options.days) || options.days < 1 || options.days > 365) throw new Error("Days must be between 1 and 365.")
  if (options.remove && (options.duelsTo || seen.has("--count") || seen.has("--days"))) throw new Error("--remove always targets the full fixed demo list; do not combine it with seed options.")
  return options
}

export async function writeDemoPlan(plan, db, store) {
  const users = new Map()
  const created = new Set()
  let rounds = 0, duels = 0
  // Resolve the real opponent before any writes, so a typo cannot leave a partial seed.
  for (const duel of plan.duels.filter((d) => !d.completed)) {
    if (users.has(duel.opponent)) continue
    const opponent = await db.findUserByUsername(duel.opponent)
    if (!opponent) throw new Error(`Duel opponent does not exist: ${duel.opponent}`)
    users.set(duel.opponent, opponent)
  }
  const bcrypt = (await import("bcryptjs")).default
  const { validatePassword } = await import("../validation.js")
  if (process.env.DEMO_PASSWORD && validatePassword(process.env.DEMO_PASSWORD)) throw new Error("DEMO_PASSWORD must satisfy signup password rules.")

  async function saveReplay(user, round) {
    return db.insertRoundReplay({ userId: user.id, username: user.username, ...round })
  }

  for (const player of plan.players) {
    const existing = await db.findUserByUsername(player.username)
    if (existing) {
      users.set(player.username, existing)
      continue
    }
    const password = process.env.DEMO_PASSWORD || randomBytes(24).toString("base64url")
    const user = await db.createUser({ username: player.username, passwordHash: await bcrypt.hash(password, 12), role: "player" })
    users.set(player.username, user)
    created.add(player.username)
    await store.ensurePlayerUser(user)
    let progress = await db.createDefaultUserProgress(user.id)
    for (const round of player.rounds) {
      const { earnedCoins, earnedXp, progressionMode, baseRankDelta, placementMatchScore, allowsRankProgression } = round.rewards
      const hasRankedHistory = (progress.lifetimeStats?.rankedRounds ?? 0) > 0
      const result = await db.completeUserRound({
        userId: user.id, earnedCoins, earnedXp, maxCoins: 10_000_000, maxXp: 10_000_000, maxMmr: 100_000,
        roundTokenId: null, countsTowardStats: true,
        rankInputs: { hasRankedHistory, baseRankDelta, placementMatchScore, allowsRankProgression },
        fallbackRankState: { currentMmr: progress.rankMmr, currentRankedState: progress.rankedState },
        historyEntry: { score: round.score, hits: round.hits, misses: round.misses, bestStreak: round.bestStreak,
          avgReactionMs: round.avgReactionMs, bestReactionMs: round.bestReactionMs,
          coinsEarned: earnedCoins, xpEarned: earnedXp, rankDelta: round.rankDelta,
          modeId: round.modeId, progressionMode, drillId: null, loadoutSnapshot: null, playedAtIso: round.playedAtIso },
      })
      if (!result.historyEntry?.id) throw new Error("Saved round did not return a history id.")
      // completeUserRound deliberately uses transaction now(), ignoring playedAtIso.
      // Backdate only this returned row. Daily bonus/goals keep their insertion-day effects.
      await db.default.execute("UPDATE round_history SET played_at = ? WHERE id = ? AND user_id = ?", [new Date(round.playedAtIso), result.historyEntry.id, user.id])
      await saveReplay(user, { ...round, roundHistoryId: result.historyEntry.id })
      if (progressionMode === "ranked") {
        await db.applyUserSeasonProgress(user.id, { rankMmr: result.rankOutcome.nextMmr, isRankedRound: true,
          isPlaced: !result.rankOutcome.nextRankProgress?.isPlacement, playedAt: round.playedAtIso })
      }
      progress = await db.findUserProgressByUserId(user.id)
      rounds++
    }
    // Spend only earned coins, using the same catalog and transactions as the shop.
    const { getMappedShopItemById } = await import("../serverShopCatalogIdMappings.js")
    const cosmeticSets = [["skin_neon", "profile_racoon"], ["theme_sunset", "profile_heart"], ["skin_moon", "profile_ghost"], []]
    for (const itemId of cosmeticSets[plan.players.indexOf(player) % cosmeticSets.length]) {
      const item = getMappedShopItemById(itemId)
      if (Number(progress.coins) < item.cost) continue
      await store.purchaseItem({ user, itemId })
      await store.equipItem({ user, itemId })
      progress = await db.findUserProgressByUserId(user.id)
    }
  }
  for (const duel of plan.duels) {
    // Existing accounts (including partially seeded ones) are untouched on reruns.
    if (!created.has(duel.challenger) || (duel.completed && !created.has(duel.opponent))) continue
    const challenger = users.get(duel.challenger), opponent = users.get(duel.opponent)
    const replay = await saveReplay(challenger, duel.round)
    const challenge = await db.createChallenge({ challengerUserId: challenger.id, challengerUsername: challenger.username,
      opponentUserId: opponent.id, opponentUsername: opponent.username, replayId: replay.id, modeId: duel.round.modeId,
      message: "Demo duel: race this ghost!" })
    if (duel.completed) {
      const response = await db.respondToChallenge({ challengeId: challenge.id, userId: opponent.id, action: "accept" })
      if (!response.ok) throw new Error(response.reason)
      const opponentReplay = await saveReplay(opponent, duel.opponentRound)
      const completion = await db.completeChallenge({ challengeId: challenge.id, userId: opponent.id, opponentReplayId: opponentReplay.id })
      if (!completion.ok) throw new Error(completion.reason)
    }
    duels++
  }
  return { created: created.size, skipped: plan.players.length - created.size, rounds, duels }
}

export async function main(args = process.argv.slice(2), output = console) {
  const options = parseArgs(args)
  if (options.remove && options.dryRun) {
    output.table(DEMO_PLAYER_USERNAMES.map((username) => ({ player: username, action: "delete if present" })))
    output.log(`DRY RUN: removal restricted to ${DEMO_PLAYER_USERNAMES.length} fixed demo usernames; database not loaded.`)
    return
  }
  const plan = options.remove ? null : buildDemoPlan(options)
  if (plan) {
    output.table(summarizeDemoPlan(plan))
    output.log(`${options.dryRun ? "DRY RUN: " : "Planned: "}${plan.players.length} players, ${plan.players.reduce((n, p) => n + p.rounds.length, 0)} rounds, ${plan.duels.length} duels (${plan.duels.filter((d) => !d.completed).length} pending).`)
  }
  if (options.dryRun) return // No dotenv, pg, or database-module import on this path.
  const db = await import("../playerMysqlDatabase.js")
  try {
    await db.verifySchema() // Read only: never initialize/migrate an owner's database.
    if (options.remove) {
      const removed = await removeDemoPlayers(async (username) => {
        const [result] = await db.default.execute("DELETE FROM users WHERE username = ? AND role = 'player'", [username])
        return result.affectedRows
      })
      output.log(`Removed ${removed} demo players (admin accounts are preserved).`)
    } else {
      const { createPlayerStateStore } = await import("../playerStateStore.js")
      output.log(`Seed complete: ${JSON.stringify(await writeDemoPlan(plan, db, createPlayerStateStore()))}`)
    }
  } finally {
    await db.default.end()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(`Demo seed failed: ${error.message}`); process.exitCode = 1 })
}
