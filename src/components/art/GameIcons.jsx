/*
 * ClickAway illustrated icon set.
 *
 * Static art is generated raster images in public/art (see
 * .claude/skills/clickaway-rsi/art-brief.md).
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

const RANK_TONES = new Set(["unranked", "bronze", "silver", "gold", "platinum", "diamond"])

export function CrestIcon({ tone = "gold", ...props }) {
  // Deadeye, the top rank, has its own emblem outside the crest set.
  if (tone === "deadeye") return <Art src="/ranks/deadeye.svg" {...props} />
  const rank = RANK_TONES.has(tone) ? tone : "gold"
  return <Art src={`/art/ranks/${rank}.png`} {...props} />
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
