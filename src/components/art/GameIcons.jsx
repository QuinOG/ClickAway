/*
 * ClickAway illustrated icon set.
 *
 * Chunky, filled, outlined pictograms in one art direction: a dark ink
 * outline, two-tone body, and a soft top highlight. They are drawn on a 48px
 * grid so they stay crisp from 20px (HUD) to 96px (scene emblems).
 */

const INK = "#0a1322"

function Svg({ size = 32, className = "", title, children, viewBox = "0 0 48 48" }) {
  return (
    <svg
      className={`gameIcon ${className}`.trim()}
      width={size}
      height={size}
      viewBox={viewBox}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : "true"}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <g stroke={INK} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round">
        {children}
      </g>
    </svg>
  )
}

export function CoinIcon(props) {
  return (
    <Svg {...props}>
      <ellipse cx="24" cy="27" rx="17" ry="16" fill="#b9761c" />
      <ellipse cx="24" cy="24" rx="17" ry="16" fill="#ffc94a" />
      <ellipse cx="24" cy="24" rx="11.5" ry="10.5" fill="#f5a524" strokeWidth="2" />
      <path d="M24 16.5l2.3 4.8 5.2.7-3.8 3.6.9 5.2L24 28.4l-4.6 2.4.9-5.2-3.8-3.6 5.2-.7Z" fill="#fff1b8" strokeWidth="1.8" />
      <path d="M12 17c2-4 6.5-6.5 11-6.6" fill="none" stroke="#fff6d6" strokeWidth="2.2" />
    </Svg>
  )
}

export function GemIcon(props) {
  return (
    <Svg {...props}>
      <path d="M24 5 39 18 24 43 9 18Z" fill="#2fb6ff" />
      <path d="M9 18h30L24 43Z" fill="#1585d6" />
      <path d="M17 18 24 5l7 13-7 25Z" fill="#7fe0ff" strokeWidth="1.8" />
      <path d="M14 15.5 21 9.5" fill="none" stroke="#e8fbff" strokeWidth="2.2" />
    </Svg>
  )
}

export function CrestIcon({ tone = "gold", ...props }) {
  const fills = {
    gold: ["#ffcf55", "#c98a1c", "#fff0b0"],
    silver: ["#dfe7f1", "#8d9db3", "#ffffff"],
    bronze: ["#e59a62", "#9a5a2c", "#ffd7b5"],
    platinum: ["#7ff0e2", "#2a9d93", "#dcfffa"],
    diamond: ["#9cc0ff", "#4a6fd1", "#e6efff"],
    unranked: ["#9aa8bb", "#5b6779", "#d6dee9"],
  }[tone] ?? ["#ffcf55", "#c98a1c", "#fff0b0"]

  return (
    <Svg {...props}>
      <path d="M24 4 40 10v13c0 10-7 17-16 21C15 40 8 33 8 23V10Z" fill={fills[1]} />
      <path d="M24 7.5 37 12.5v10.5c0 8-5.6 13.8-13 17.2-7.4-3.4-13-9.2-13-17.2V12.5Z" fill={fills[0]} strokeWidth="2" />
      <path d="M24 14.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L24 27.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8Z" fill={fills[2]} strokeWidth="1.8" />
      <path d="M14 13.5 22 10.5" fill="none" stroke="#ffffff" strokeOpacity="0.75" strokeWidth="2" />
    </Svg>
  )
}

export function TargetIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="24" cy="25.5" r="18" fill="#7a1d2c" />
      <circle cx="24" cy="23" r="18" fill="#ff4d5e" />
      <circle cx="24" cy="23" r="12.5" fill="#fff4f0" strokeWidth="2" />
      <circle cx="24" cy="23" r="7" fill="#ff4d5e" strokeWidth="2" />
      <circle cx="24" cy="23" r="2.6" fill="#fff4f0" strokeWidth="1.6" />
      <path d="M11 15c2.5-4 6.5-6.5 11-7" fill="none" stroke="#ffd0d4" strokeWidth="2.2" />
    </Svg>
  )
}

export function ArmoryIcon(props) {
  return (
    <Svg {...props}>
      <path d="M8 34h32l-3 8H11Z" fill="#4a5a72" />
      <path d="M12 26h24a2 2 0 0 1 2 2v6H10v-6a2 2 0 0 1 2-2Z" fill="#8fa3bd" />
      <path d="M17 26v-4h14v4" fill="#6c7f99" />
      <path d="m27.5 6.5 9 9-4 4-9-9Z" fill="#c5d3e4" />
      <path d="M26 12 13 25l3 3 13-13" fill="#a35a2a" />
      <circle cx="35" cy="31" r="2" fill="#5ee8ff" strokeWidth="1.6" />
      <path d="M13 29.5h14" fill="none" stroke="#dbe6f3" strokeWidth="2" />
    </Svg>
  )
}

export function ShopIcon(props) {
  return (
    <Svg {...props}>
      <path d="M7 19h34v21a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3Z" fill="#8a4d22" />
      <path d="M5 13h38v8H5Z" fill="#b7672e" />
      <path d="M20 13h8v30h-8Z" fill="#ffc94a" />
      <path d="M5 21h38" fill="none" />
      <path d="M17 13c-3-6 2-9 7-2 5-7 10-4 7 2" fill="#ffd96b" />
      <path d="M9 16.5h8" fill="none" stroke="#e7a36b" strokeWidth="2" />
    </Svg>
  )
}

export function TrophyIcon(props) {
  return (
    <Svg {...props}>
      <path d="M15 37h18l2 6H13Z" fill="#8a5a14" />
      <path d="M20 29h8l1 8h-10Z" fill="#c98a1c" />
      <path d="M13 6h22v9c0 8-5 14-11 14S13 23 13 15Z" fill="#ffc94a" />
      <path d="M13 9H7c0 7 3 10 7 11M35 9h6c0 7-3 10-7 11" fill="none" />
      <path d="M17 10v6c0 3 1.5 6 4 7.5" fill="none" stroke="#fff1b8" strokeWidth="2.2" />
    </Svg>
  )
}

export function SwordsIcon(props) {
  return (
    <Svg {...props}>
      <path d="m8 6 21 21-3 3L5 9V6Z" fill="#dbe6f3" />
      <path d="m40 6-21 21 3 3L43 9V6Z" fill="#b8c7da" />
      <path d="m13 31 4 4M35 31l-4 4" fill="none" strokeWidth="4.5" stroke={INK} />
      <path d="m13 31 4 4M35 31l-4 4" fill="none" strokeWidth="2.2" stroke="#ffc94a" />
      <path d="m9 39 6-6 3 3-6 6ZM39 39l-6-6-3 3 6 6Z" fill="#a35a2a" />
      <path d="M9 9.5 21 21.5" fill="none" stroke="#ffffff" strokeWidth="1.8" />
    </Svg>
  )
}

export function HelmetIcon(props) {
  return (
    <Svg {...props}>
      <path d="M8 26C8 15 15 7 24 7s16 8 16 19v8l-5 6H13l-5-6Z" fill="#5d7391" />
      <path d="M12 23h24v8a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3Z" fill="#11203a" />
      <path d="M15 26h18" fill="none" stroke="#5ee8ff" strokeWidth="3" />
      <path d="M14 15c2.5-3.5 6-5 10-5" fill="none" stroke="#c2d2e6" strokeWidth="2.2" />
    </Svg>
  )
}

export function ScrollIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 8h22v30a4 4 0 0 1-4 4H12Z" fill="#f1dfb6" />
      <path d="M12 8a4 4 0 0 0-4 4v4h8v-4a4 4 0 0 0-4-4ZM30 42a4 4 0 0 0 4-4v-4h6v4a4 4 0 0 1-4 4Z" fill="#c9a66b" />
      <path d="M17 16h12M17 22h12M17 28h8" fill="none" stroke="#8a6a3a" strokeWidth="2.2" />
    </Svg>
  )
}

export function HelpIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="24" cy="25" r="17" fill="#2f6fd1" />
      <circle cx="24" cy="23" r="17" fill="#4f9bff" />
      <path d="M18.5 18.5c0-3.5 2.5-5.5 5.7-5.5 3.3 0 5.6 2.1 5.6 5 0 4.2-5.6 4.4-5.6 8.5" fill="none" stroke="#ffffff" strokeWidth="3.4" />
      <circle cx="24.2" cy="32" r="2.3" fill="#ffffff" stroke="none" />
    </Svg>
  )
}

export function GearIcon(props) {
  return (
    <Svg {...props}>
      <path d="M21 5h6l1 5 4 2 4.5-3 4 4-3 4.5 2 4 5 1v6l-5 1-2 4 3 4.5-4 4-4.5-3-4 2-1 5h-6l-1-5-4-2-4.5 3-4-4 3-4.5-2-4-5-1v-6l5-1 2-4-3-4.5 4-4 4.5 3 4-2Z" fill="#8fa3bd" />
      <circle cx="24" cy="24" r="7" fill="#2a3850" />
    </Svg>
  )
}

export function DummyIcon(props) {
  return (
    <Svg {...props}>
      <path d="M22 30h4v12h-4Z" fill="#8a5a2c" />
      <path d="M14 43h20" fill="none" strokeWidth="3.4" />
      <circle cx="24" cy="18" r="13" fill="#3ccf9e" />
      <circle cx="24" cy="18" r="8" fill="#e9fff6" strokeWidth="2" />
      <circle cx="24" cy="18" r="3.2" fill="#3ccf9e" strokeWidth="1.8" />
      <path d="M15 11c2-2.5 4.5-3.6 7.5-3.8" fill="none" stroke="#c8fbe6" strokeWidth="2" />
    </Svg>
  )
}

export function BoltIcon(props) {
  return (
    <Svg {...props}>
      <path d="M28 4 10 27h12l-4 17 20-25H26Z" fill="#45d4ff" />
      <path d="M27 9.5 15.5 24.5" fill="none" stroke="#dff8ff" strokeWidth="2.2" />
    </Svg>
  )
}

export function CrownIcon(props) {
  return (
    <Svg {...props}>
      <path d="M8 38h32v5H8Z" fill="#c98a1c" />
      <path d="M8 36 5 14l11 9 8-15 8 15 11-9-3 22Z" fill="#ffc94a" />
      <circle cx="24" cy="27" r="3.4" fill="#ff4d5e" strokeWidth="2" />
      <circle cx="14.5" cy="29.5" r="2.4" fill="#45d4ff" strokeWidth="1.8" />
      <circle cx="33.5" cy="29.5" r="2.4" fill="#45d4ff" strokeWidth="1.8" />
      <path d="M10 21 12 33" fill="none" stroke="#fff1b8" strokeWidth="2" />
    </Svg>
  )
}

export function StopwatchIcon(props) {
  return (
    <Svg {...props}>
      <path d="M20 4h8v5h-8Z" fill="#8fa3bd" />
      <circle cx="24" cy="27" r="16" fill="#45d4ff" />
      <circle cx="24" cy="27" r="11.5" fill="#eafaff" strokeWidth="2" />
      <path d="M24 20v7l5 3" fill="none" strokeWidth="3" />
    </Svg>
  )
}

export function GrowIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="24" cy="24" r="10" fill="#3ccf9e" />
      <path d="M5 13V5h8M43 13V5h-8M5 35v8h8M43 35v8h-8" fill="none" strokeWidth="3.4" />
      <path d="M5 13V5h8M43 13V5h-8M5 35v8h8M43 35v8h-8" fill="none" stroke="#c8fbe6" strokeWidth="1.4" />
      <path d="M19 20c1.3-2 3-3 5-3.2" fill="none" stroke="#e9fff6" strokeWidth="2" />
    </Svg>
  )
}

export function SnowflakeIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="24" cy="24" r="19" fill="#b9e8ff" />
      <path d="M24 9v30M11 16.5l26 15M11 31.5l26-15" fill="none" stroke="#1b6fb3" strokeWidth="3" />
      <path d="m20 11 4 4 4-4M20 37l4-4 4 4" fill="none" stroke="#1b6fb3" strokeWidth="2.4" />
    </Svg>
  )
}


export function MagnetIcon(props) {
  return (
    <Svg {...props}>
      <path d="M10 8h9v16a5 5 0 0 0 10 0V8h9v16a14 14 0 0 1-28 0Z" fill="#ff4d5e" />
      <path d="M10 8h9v7h-9ZM29 8h9v7h-9Z" fill="#dbe6f3" />
      <path d="M14 20v4a10 10 0 0 0 3 7" fill="none" stroke="#ffd0d4" strokeWidth="2" />
    </Svg>
  )
}

export function FlameIcon(props) {
  return (
    <Svg {...props}>
      <path d="M24 4c3 7 12 11 12 23a12 12 0 0 1-24 0c0-6 3-9 5-12 1 4 3 6 5 6-2-6-1-12 2-17Z" fill="#ff8a2a" />
      <path d="M24 22c2 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 2 3 3 3-1-2-1-5 0-7Z" fill="#ffd34d" strokeWidth="2" />
    </Svg>
  )
}

export function ShieldIcon(props) {
  return (
    <Svg {...props}>
      <path d="M24 4 40 10v12c0 11-7 18-16 22C15 40 8 33 8 22V10Z" fill="#2fb6ff" />
      <path d="M24 4v40C15 40 8 33 8 22V10Z" fill="#1585d6" />
      <path d="M16 23l6 6 10-11" fill="none" stroke="#ffffff" strokeWidth="3.4" />
    </Svg>
  )
}

export function HeartIcon(props) {
  return (
    <Svg {...props}>
      <path d="M24 42S6 31 6 18a9 9 0 0 1 18-3 9 9 0 0 1 18 3c0 13-18 24-18 24Z" fill="#ff4d7a" />
      <path d="M12 15c1-3 3-4.5 6-4.5" fill="none" stroke="#ffd1de" strokeWidth="2.2" />
      <path d="M20 23h8M24 19v8" fill="none" stroke="#ffffff" strokeWidth="3" />
    </Svg>
  )
}

export function LockIcon(props) {
  return (
    <Svg {...props}>
      <path d="M15 20v-6a9 9 0 0 1 18 0v6" fill="none" strokeWidth="4.5" />
      <path d="M15 20v-6a9 9 0 0 1 18 0v6" fill="none" stroke="#8fa3bd" strokeWidth="2" />
      <rect x="9" y="20" width="30" height="22" rx="4" fill="#ffc94a" />
      <circle cx="24" cy="30" r="3" fill={INK} stroke="none" />
      <path d="M24 31v5" fill="none" strokeWidth="3" />
    </Svg>
  )
}

export function OverclockIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="24" cy="26" r="17" fill="#a96bff" />
      <path d="M12 30a12 12 0 1 1 24 0" fill="none" stroke="#efe2ff" strokeWidth="3" />
      <path d="M24 30 32 18" fill="none" strokeWidth="3.4" />
      <circle cx="24" cy="30" r="3" fill="#ffffff" />
    </Svg>
  )
}


export function TempoCoreIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="24" cy="25" r="18" fill="#1a6f8f" />
      <circle cx="24" cy="23" r="18" fill="#3fd0ff" />
      <circle cx="24" cy="23" r="12" fill="#0f2a44" strokeWidth="2" />
      <path d="M24 23 31 16" fill="none" stroke="#ffe27a" strokeWidth="3" />
      <circle cx="24" cy="23" r="3" fill="#ffe27a" strokeWidth="1.8" />
      <path d="M16 15.5 18 17.5M32 15.5 30 17.5M14 23h3M34 23h-3" fill="none" stroke="#9fe9ff" strokeWidth="2" />
    </Svg>
  )
}

export function StreakLensIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 24c5-9 12-14 20-14s15 5 20 14c-5 9-12 14-20 14S9 33 4 24Z" fill="#c9a2ff" />
      <circle cx="24" cy="24" r="9" fill="#5b2bb5" strokeWidth="2" />
      <circle cx="24" cy="24" r="4" fill="#f3e9ff" strokeWidth="1.8" />
      <path d="M11 20c3-4 7-6 11-6.5" fill="none" stroke="#f3e9ff" strokeWidth="2" />
    </Svg>
  )
}

export function PowerRigIcon(props) {
  return (
    <Svg {...props}>
      <rect x="6" y="13" width="32" height="22" rx="4" fill="#ffb03a" />
      <path d="M38 19h4v10h-4Z" fill="#c97a12" />
      <path d="M25 16 17 26h6l-2 7 9-11h-6Z" fill="#fff6d6" strokeWidth="2" />
      <path d="M10 17h8" fill="none" stroke="#ffe3a8" strokeWidth="2" />
    </Svg>
  )
}

const MODULE_ICONS = { tempoCore: TempoCoreIcon, streakLens: StreakLensIcon, powerRig: PowerRigIcon }

export function ModuleEmblem({ slotId, ...props }) {
  const Icon = MODULE_ICONS[slotId] ?? TempoCoreIcon
  return <Icon {...props} />
}

const ROUTE_ICONS = {
  play: TargetIcon,
  armory: ArmoryIcon,
  shop: ShopIcon,
  profile: HelmetIcon,
  ladder: TrophyIcon,
  duels: SwordsIcon,
  history: ScrollIcon,
  help: HelpIcon,
  settings: GearIcon,
}

export function RouteEmblem({ routeKey, ...props }) {
  const Icon = ROUTE_ICONS[routeKey] ?? TargetIcon
  return <Icon {...props} />
}

const MODE_ICONS = { practice: DummyIcon, casual: BoltIcon, ranked: CrownIcon }

export function ModeEmblem({ tone = "casual", ...props }) {
  const Icon = MODE_ICONS[tone] ?? BoltIcon
  return <Icon {...props} />
}

const POWER_ICONS = {
  time_boost: StopwatchIcon,
  size_boost: GrowIcon,
  freeze_movement: SnowflakeIcon,
  magnet_center: MagnetIcon,
  combo_surge: FlameIcon,
  guard_charge: ShieldIcon,
  guard: ShieldIcon,
  second_wind: HeartIcon,
  size_lock: LockIcon,
  overclock: OverclockIcon,
}

export function PowerEmblem({ powerupId, ...props }) {
  const Icon = POWER_ICONS[powerupId] ?? BoltIcon
  return <Icon {...props} />
}
