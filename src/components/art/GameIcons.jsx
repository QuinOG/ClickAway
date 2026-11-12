/*
 * ClickAway illustrated icon set.
 *
 * Static art is generated raster images in public/art (see
 * .claude/skills/clickaway-rsi/art-brief.md). Only the rank crest stays as
 * SVG, because its colours change with the player's tier.
 */

function Art({ src, size = 32, className = "", title }) {
  return (
    <img
      className={`gameIcon gameArt ${className}`.trim()}
      src={src}
      width={size}
      height={size}
      alt={title ?? ""}
      aria-hidden={title ? undefined : "true"}
      decoding="async"
      draggable="false"
    />
  )
}

const art = (path) => function ArtIcon(props) { return <Art src={`/art/${path}.png`} {...props} /> }

export const CoinIcon = art("icons/coin")
export const GemIcon = art("icons/gem")
export const TargetIcon = art("icons/play")
export const ArmoryIcon = art("icons/armory")
export const ShopIcon = art("icons/shop")
export const TrophyIcon = art("icons/ladder")
export const SwordsIcon = art("icons/duels")
export const HelmetIcon = art("icons/profile")
export const ScrollIcon = art("icons/history")
export const HelpIcon = art("icons/help")
export const GearIcon = art("icons/settings")
export const DummyIcon = art("icons/practice")
export const BoltIcon = art("icons/casual")
export const CrownIcon = art("icons/ranked")

export const StopwatchIcon = art("powers/time")
export const GrowIcon = art("powers/grow")
export const SnowflakeIcon = art("powers/freeze")
export const MagnetIcon = art("powers/magnet")
export const FlameIcon = art("powers/combo")
export const ShieldIcon = art("powers/guard")
export const HeartIcon = art("powers/second-wind")
export const LockIcon = art("powers/steady")
export const OverclockIcon = art("powers/overclock")

export const TempoCoreIcon = art("parts/slot-tempo")
export const StreakLensIcon = art("parts/slot-streak")
export const PowerRigIcon = art("parts/slot-power")
export const AnchorIcon = art("parts/tempo_anchor")
export const VaultIcon = art("parts/power_vault")
export const RapidfireIcon = art("parts/streak_rapidfire")
export const IronNerveIcon = art("parts/streak_ironnerve")
export const SurgeIcon = art("parts/power_surge")
export const FlashpointIcon = art("parts/tempo_flashpoint")

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
      <path d="M34 14v9c0 6-4 11-10 14" fill="none" stroke={INK} strokeOpacity=".3" strokeWidth="1.8" /><path d="M14 17v5M17 13l3-1" fill="none" stroke={fills[2]} strokeWidth="1.4" />
    </Svg>
  )
}

const MODULE_ICONS = { tempoCore: TempoCoreIcon, streakLens: StreakLensIcon, powerRig: PowerRigIcon }

export function ModuleEmblem({ slotId, ...props }) {
  const Icon = MODULE_ICONS[slotId] ?? TempoCoreIcon
  return <Icon {...props} />
}

const PART_IDS = new Set([
  "tempo_anchor", "tempo_overdrive", "tempo_bastion", "tempo_flashpoint",
  "streak_momentum", "streak_stabilizer", "streak_rapidfire", "streak_ironnerve",
  "power_surge", "power_reserve", "power_overcharge", "power_vault",
])

export function PartEmblem({ partId, slotId, ...props }) {
  if (PART_IDS.has(partId)) return <Art src={`/art/parts/${partId}.png`} {...props} />
  return <ModuleEmblem slotId={slotId} {...props} />
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
