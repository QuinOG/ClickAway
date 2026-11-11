import { LOADOUT_POWERUPS } from "../../../constants/buildcraft.js"
import { PowerupGlyph } from "../../buildcraft/loadoutBuildcraftGlyphIcons.jsx"

/* Drawn rule cards: each mechanic shown as a tiny scene, not a sentence. */
function HitArt() {
  return (
    <svg viewBox="0 0 160 96" aria-hidden="true">
      <circle cx="70" cy="52" r="30" fill="#2a0f3a" stroke="#d94bff" strokeWidth="5" />
      <circle cx="70" cy="52" r="15" fill="none" stroke="#ff9cf2" strokeWidth="3" />
      <circle cx="70" cy="52" r="4" fill="#fff" />
      <g stroke="#ffd25c" strokeWidth="3" strokeLinecap="round">
        <path d="M70 12v-6M104 22l5-5M36 22l-5-5M112 52h7M28 52h-7" />
      </g>
      <path d="M86 60l18 22 5-9 10 9 5-5-10-9 9-5z" fill="#fff" stroke="#040912" strokeWidth="3" strokeLinejoin="round" />
      <text x="128" y="36" fill="#7dffb1" stroke="#040912" strokeWidth="4" paintOrder="stroke" fontFamily="Russo One" fontSize="22">+1</text>
    </svg>
  )
}

function ComboArt() {
  return (
    <svg viewBox="0 0 160 96" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={10 + i * 20} y={58 - i * 8} width="15" height={20 + i * 8} rx="3" fill={i < 4 ? "#ffb53a" : "#ffe08a"} stroke="#040912" strokeWidth="3" />
      ))}
      <path d="M14 30 Q60 6 106 18" fill="none" stroke="#ffd25c" strokeWidth="3" strokeDasharray="5 5" />
      <rect x="112" y="26" width="42" height="34" rx="6" fill="#ffc94a" stroke="#040912" strokeWidth="3" transform="rotate(-8 133 43)" />
      <text x="117" y="52" fill="#2a1500" fontFamily="Russo One" fontSize="20" transform="rotate(-8 133 43)">x2</text>
    </svg>
  )
}

function MissArt() {
  return (
    <svg viewBox="0 0 160 96" aria-hidden="true">
      <circle cx="104" cy="44" r="22" fill="#2a0f3a" stroke="#d94bff" strokeWidth="4" opacity=".55" />
      <g stroke="#ff5470" strokeWidth="7" strokeLinecap="round">
        <path d="M30 30l26 26M56 30L30 56" />
      </g>
      <g stroke="#040912" strokeWidth="2" opacity=".6"><path d="M43 43l-14 30M43 43l18 26" /></g>
      <text x="58" y="88" fill="#ff8095" stroke="#040912" strokeWidth="4" paintOrder="stroke" fontFamily="Russo One" fontSize="18">STREAK 0</text>
    </svg>
  )
}

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

export function HelpPowerupCards() {
  return (
    <div className="helpPowerupCards">
      {LOADOUT_POWERUPS.map((powerup) => (
        <article key={powerup.id} className="helpPowerupCard">
          <span className="helpPowerupEmblem" aria-hidden="true"><PowerupGlyph powerupId={powerup.id} /></span>
          <div>
            <h3>{powerup.label}</h3>
            <p>{powerup.description}</p>
            <span className="helpPowerupMeta">Charges every {powerup.awardEvery} streak · Lv {powerup.unlockLevel}</span>
          </div>
        </article>
      ))}
    </div>
  )
}
