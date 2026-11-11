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

/* One round, told as a four-panel strip: pick → count in → hit → cash in. */
function PickArt() {
  const chips = [["#3ee59a", "PRACTICE"], ["#4fb8ff", "CASUAL"], ["#ffc94a", "RANKED"]]
  return (
    <svg viewBox="0 0 200 120" aria-hidden="true">
      {chips.map(([color, label], i) => (
        <g key={label} transform={`translate(${20 + i * 56} ${i === 1 ? 18 : 30}) rotate(${(i - 1) * 6} 26 36)`}>
          <rect width="52" height="72" rx="7" fill="#13233a" stroke="#040912" strokeWidth="3" />
          <rect x="4" y="4" width="44" height="40" rx="4" fill={color} opacity={i === 1 ? 1 : 0.55} />
          <circle cx="26" cy="24" r="10" fill="none" stroke="#040912" strokeWidth="3" />
          <text x="26" y="60" textAnchor="middle" fill="#fff" fontFamily="Russo One" fontSize="8">{label}</text>
        </g>
      ))}
      <path d="M118 96l14 18 4-8 9 8 4-4-9-8 8-4z" fill="#fff" stroke="#040912" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  )
}

function CountArt() {
  return (
    <svg viewBox="0 0 200 120" aria-hidden="true">
      <circle cx="100" cy="60" r="46" fill="#0b1424" stroke="#040912" strokeWidth="4" />
      <circle cx="100" cy="60" r="38" fill="none" stroke="#4fb8ff" strokeWidth="7" strokeDasharray="160 239" transform="rotate(-90 100 60)" strokeLinecap="round" />
      <text x="100" y="80" textAnchor="middle" fill="#fff" stroke="#040912" strokeWidth="5" paintOrder="stroke" fontFamily="Russo One" fontSize="56">3</text>
      <text x="30" y="44" textAnchor="middle" fill="#8fd4ff" opacity=".5" fontFamily="Russo One" fontSize="24">2</text>
      <text x="170" y="44" textAnchor="middle" fill="#8fd4ff" opacity=".3" fontFamily="Russo One" fontSize="20">1</text>
    </svg>
  )
}

function ChaseArt() {
  return (
    <svg viewBox="0 0 200 120" aria-hidden="true">
      {[[40, 80, 0.25], [76, 48, 0.45]].map(([x, y, o]) => (
        <circle key={x} cx={x} cy={y} r="16" fill="none" stroke="#d94bff" strokeWidth="4" opacity={o} />
      ))}
      <path d="M40 80Q60 52 76 48T120 58" fill="none" stroke="#ffd25c" strokeWidth="3" strokeDasharray="5 6" />
      <circle cx="124" cy="60" r="24" fill="#2a0f3a" stroke="#d94bff" strokeWidth="5" />
      <circle cx="124" cy="60" r="5" fill="#fff" />
      <path d="M134 68l16 20 4-8 9 8 4-4-9-8 8-4z" fill="#fff" stroke="#040912" strokeWidth="3" strokeLinejoin="round" />
      <rect x="150" y="16" width="40" height="28" rx="6" fill="#ffc94a" stroke="#040912" strokeWidth="3" transform="rotate(8 170 30)" />
      <text x="170" y="37" textAnchor="middle" fill="#2a1500" fontFamily="Russo One" fontSize="18" transform="rotate(8 170 30)">x4</text>
    </svg>
  )
}

function CashArt() {
  return (
    <svg viewBox="0 0 200 120" aria-hidden="true">
      <g fill="none" stroke="#ffd25c" strokeWidth="3" strokeLinecap="round" opacity=".7">
        <path d="M100 8v10M58 22l7 7M142 22l-7 7M44 58h10M156 58h-10" />
      </g>
      <circle cx="100" cy="58" r="30" fill="#ffc94a" stroke="#040912" strokeWidth="4" />
      <circle cx="100" cy="58" r="21" fill="none" stroke="#c98a24" strokeWidth="4" />
      <path d="M100 42l5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2z" fill="#fff6d6" stroke="#040912" strokeWidth="2" />
      {[[52, 98], [72, 104], [128, 104], [148, 98]].map(([x, y]) => (
        <g key={x}>
          <ellipse cx={x} cy={y} rx="11" ry="7" fill="#e89a24" stroke="#040912" strokeWidth="3" />
          <ellipse cx={x} cy={y - 2} rx="7" ry="3" fill="#ffd25c" />
        </g>
      ))}
    </svg>
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
