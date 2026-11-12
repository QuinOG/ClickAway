import { LOADOUT_POWERUPS } from "../../../constants/buildcraft.js"
import { PowerupGlyph } from "../../buildcraft/loadoutBuildcraftGlyphIcons.jsx"

// Illustrations for the rule cards and the round strip (generated art in public/art/help-strip).
const stripArt = (name) => function StripArt() {
  return <img className="helpStripArt" src={`/art/help-strip/${name}.png`} alt="" width="240" height="240" decoding="async" />
}
const HitArt = stripArt("hit")
const ComboArt = stripArt("combo")
const MissArt = stripArt("miss")
const PickArt = stripArt("pick")
const CountArt = stripArt("count")
const ChaseArt = stripArt("chase")
const CashArt = stripArt("cash")
const XpArt = stripArt("xp")
const CoinShopArt = stripArt("coin-shop")
const RankArt = stripArt("rank")
const ProfileArt = stripArt("profile")
const TicketArt = stripArt("ticket")
const PlatesArt = stripArt("plates")

const RULES = [
  { id: "hit", tone: "hit", title: "Hit", art: HitArt, text: "Click the target. Every hit scores and the target shrinks a little." },
  { id: "combo", tone: "combo", title: "Chain", art: ComboArt, text: "Keep hitting without missing. Every few hits your multiplier climbs: x2, x3, x4…" },
  { id: "miss", tone: "miss", title: "Miss", art: MissArt, text: "Click empty arena and your streak breaks back to zero. Casual costs 1 point, Ranked 2." },
]

export function HelpRuleCards() {
  return (
    <div className="helpRuleCards">
      {RULES.map(({ id, tone, title, art, text }) => (
        <article key={id} className="helpRuleCard" data-tone={tone}>
          <div className="helpRuleArt">{art()}</div>
          <h3>{title}</h3>
          <p>{text}</p>
        </article>
      ))}
    </div>
  )
}

const MODES = [
  { id: "practice", name: "Practice", time: "∞", miss: "0", stakes: "No stakes", note: "Free aim. Drills and personal bests, no rewards." },
  { id: "casual", name: "Casual", time: "30s", miss: "-1", stakes: "XP + coins", note: "The standard round. Push your best score." },
  { id: "ranked", name: "Ranked", time: "15s", miss: "-2", stakes: "Rank at stake", note: "Short, sharp, and it moves your division." },
]

export function HelpModeCards() {
  return (
    <div className="helpModeCards">
      {MODES.map((mode) => (
        <article key={mode.id} className="helpModeCard" data-mode={mode.id}>
          <h3>{mode.name}</h3>
          <div className="helpModeStats">
            <span><b>{mode.time}</b><small>Time</small></span>
            <span><b>{mode.miss}</b><small>Miss</small></span>
          </div>
          <span className="helpModeStakes">{mode.stakes}</span>
          <p>{mode.note}</p>
        </article>
      ))}
    </div>
  )
}

// Illustrated power pictures (generated art in public/art/powers).
const POWERUP_ART = {
  time_boost: "time",
  size_boost: "grow",
  freeze_movement: "freeze",
  magnet_center: "magnet",
  combo_surge: "combo",
  guard_charge: "guard",
  second_wind: "second-wind",
  size_lock: "steady",
  overclock: "overclock",
}

export function HelpPowerupCards() {
  return (
    <div className="helpPowerupCards">
      {LOADOUT_POWERUPS.map((powerup) => (
        <article key={powerup.id} className="helpPowerupCard">
          <span className="helpPowerupEmblem" aria-hidden="true">
            {POWERUP_ART[powerup.id]
              ? <img className="helpPowerupArt" src={`/art/powers/${POWERUP_ART[powerup.id]}.png`} alt="" width="256" height="256" decoding="async" />
              : <PowerupGlyph powerupId={powerup.id} />}
          </span>
          <div>
            <h3>{powerup.label}</h3>
            <p>{powerup.description}</p>
            <span className="helpPowerupMeta">Charges every {powerup.awardEvery} streak <span className="helpPowerupMetaLevel">· Lv {powerup.unlockLevel}</span></span>
          </div>
        </article>
      ))}
    </div>
  )
}

const ROUND_STRIP = [
  { id: "pick", title: "Pick a mode", art: PickArt, text: "Practice to learn, Casual for XP and coins, Ranked to climb." },
  { id: "count", title: "Count in", art: CountArt, text: "Hit Start. A 3-second countdown lets you center up." },
  { id: "chase", title: "Hit and chain", art: ChaseArt, text: "Click the target as it jumps. Keys 1, 2, 3 fire your powers." },
  { id: "cash", title: "Cash in", art: CashArt, text: "Score, grade and rewards land. Play again or switch modes." },
]

export function HelpRoundStrip() {
  return (
    <ol className="helpRoundStrip" aria-label="How a round goes">
      {ROUND_STRIP.map(({ id, title, art, text }, index) => (
        <li key={id} className="helpRoundPanel" data-step={id}>
          <span className="helpRoundNumber" aria-hidden="true">{index + 1}</span>
          <div className="helpRoundArt">{art()}</div>
          <h3>{title}</h3>
          <p>{text}</p>
        </li>
      ))}
    </ol>
  )
}

const PROGRESSION_CARDS = [
  { id: "xp", tone: "combo", title: "Earn XP", art: XpArt, text: "Every round pays XP. Levels unlock powers and Armory parts." },
  { id: "coins", tone: "hit", title: "Spend coins", art: CoinShopArt, text: "Casual and Ranked pay coins. Spend them on skins in the Shop." },
  { id: "rank", tone: "hit", title: "Climb ranks", art: RankArt, text: "Ranked wins add RR. Fill the bar to move up a division." },
]

const ACCOUNT_CARDS = [
  { id: "profile", tone: "hit", title: "Profile", art: ProfileArt, text: "Your competitor card: division, attributes and trophies." },
  { id: "history", tone: "combo", title: "History", art: TicketArt, text: "Every round kept as a ticket with its score and RR change." },
  { id: "ladder", tone: "hit", title: "Ladder", art: PlatesArt, text: "Season standings. Your plate is lit so you can find yourself." },
]

function HelpArtCards({ cards }) {
  return (
    <div className="helpRuleCards">
      {cards.map(({ id, tone, title, art, text }) => (
        <article key={id} className="helpRuleCard" data-tone={tone}>
          <div className="helpRuleArt">{art()}</div>
          <h3>{title}</h3>
          <p>{text}</p>
        </article>
      ))}
    </div>
  )
}

export function HelpProgressionCards() {
  return <HelpArtCards cards={PROGRESSION_CARDS} />
}

export function HelpAccountCards() {
  return <HelpArtCards cards={ACCOUNT_CARDS} />
}
