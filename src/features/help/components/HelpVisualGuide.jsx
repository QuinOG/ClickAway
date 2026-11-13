import { LOADOUT_POWERUPS } from "../../../constants/buildcraft.js"
import { PowerupGlyph } from "../../buildcraft/loadoutBuildcraftGlyphIcons.jsx"
import "./help-art-rework.css"

const ART_LABELS = { hit: "+1", combo: "x2", miss: "STREAK 0", pick: "PRACTICE / CASUAL / RANKED", count: "3  2  1", chase: "x4", xp: "LV+", rank: "RR", ticket: "826" }

function SceneArt({ name }) {
  return (
    <div className="helpSceneArt">
      <img src={`/art/help-strip/${name}.png`} alt="" decoding="async" />
      {ART_LABELS[name] && <span className="helpSceneLabel">{ART_LABELS[name]}</span>}
    </div>
  )
}

const RULES = [
  { id: "hit", tone: "hit", title: "Hit", art: "hit", text: "Click the target. Every hit scores and the target shrinks a little." },
  { id: "combo", tone: "combo", title: "Chain", art: "combo", text: "Keep hitting without missing. Every few hits your multiplier climbs: x2, x3, x4…" },
  { id: "miss", tone: "miss", title: "Miss", art: "miss", text: "Click empty arena and your streak breaks back to zero. Casual costs 1 point, Ranked 2." },
]

export function HelpRuleCards() {
  return (
    <div className="helpRuleCards">
      {RULES.map(({ id, tone, title, art, text }) => (
        <article key={id} className="helpRuleCard" data-tone={tone}>
          <div className="helpRuleArt"><SceneArt name={art} /></div>
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
  { id: "pick", title: "Pick a mode", art: "pick", text: "Practice to learn, Casual for XP and coins, Ranked to climb." },
  { id: "count", title: "Count in", art: "count", text: "Hit Start. A 3-second countdown lets you center up." },
  { id: "chase", title: "Hit and chain", art: "chase", text: "Click the target as it jumps. Keys 1, 2, 3 fire your powers." },
  { id: "cash", title: "Cash in", art: "cash", text: "Score, grade and rewards land. Play again or switch modes." },
]

export function HelpRoundStrip() {
  return (
    <ol className="helpRoundStrip" aria-label="How a round goes">
      {ROUND_STRIP.map(({ id, title, art, text }, index) => (
        <li key={id} className="helpRoundPanel" data-step={id}>
          <span className="helpRoundNumber" aria-hidden="true">{index + 1}</span>
          <div className="helpRoundArt"><SceneArt name={art} /></div>
          <h3>{title}</h3>
          <p>{text}</p>
        </li>
      ))}
    </ol>
  )
}

const PROGRESSION_CARDS = [
  { id: "xp", tone: "combo", title: "Earn XP", art: "xp", text: "Casual and Ranked rounds pay XP. Levels unlock powers and Armory parts." },
  { id: "coins", tone: "hit", title: "Spend coins", art: "coin-shop", text: "Casual and Ranked pay coins. Spend them on skins in the Shop." },
  { id: "rank", tone: "hit", title: "Climb ranks", art: "rank", text: "Ranked wins add RR. Fill the bar to move up a division." },
]

const ACCOUNT_CARDS = [
  { id: "profile", tone: "hit", title: "Profile", art: "profile", text: "Your competitor card: division, attributes and trophies." },
  { id: "history", tone: "combo", title: "History", art: "ticket", text: "Every round kept as a ticket with its score and RR change." },
  { id: "ladder", tone: "hit", title: "Ladder", art: "plates", text: "Season standings. Your plate is lit so you can find yourself." },
]

function HelpArtCards({ cards }) {
  return (
    <div className="helpRuleCards">
      {cards.map(({ id, tone, title, art, text }) => (
        <article key={id} className="helpRuleCard" data-tone={tone}>
          <div className="helpRuleArt"><SceneArt name={art} /></div>
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
