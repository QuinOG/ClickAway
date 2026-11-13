import {
  BoltIcon,
  CrestIcon,
  ModuleEmblem,
  PowerEmblem,
  PowerRigIcon,
  TargetIcon,
} from "../../components/art/GameIcons.jsx"
import "./buildcraft-art.css"

const IDENTITY_ART = { control: TargetIcon, pressure: BoltIcon, utility: PowerRigIcon }

export function BuildIdentityGlyph({ identity = "Balanced", className = "" }) {
  const Icon = IDENTITY_ART[String(identity || "Balanced").toLowerCase()] ?? CrestIcon
  return <Icon className={`buildIdentityArt ${className}`.trim()} size={120} />
}

export function ModuleSlotGlyph({ slotId = "tempoCore", className = "" }) {
  return <ModuleEmblem slotId={slotId} className={className} size={24} />
}

export function PowerupGlyph({ powerupId = "", className = "" }) {
  return <PowerEmblem powerupId={powerupId} className={className} size={24} />
}
