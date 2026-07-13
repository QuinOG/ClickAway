import {
  ArrowsLeftRight,
  Check,
  CheckCircle,
  Eye,
  LockKey,
  Package,
} from "@phosphor-icons/react"

const STATE_COPY = {
  available: "Available",
  installed: "Installed",
  locked: "Locked",
  owned: "Collected",
  preview: "Previewing",
  racked: "Racked",
  ready: "Range ready",
}

function ArmoryStateIcon({ state }) {
  if (state === "installed") return <Check weight="bold" aria-hidden="true" />
  if (state === "locked") return <LockKey weight="fill" aria-hidden="true" />
  if (state === "preview") return <Eye weight="bold" aria-hidden="true" />
  if (state === "racked") return <ArrowsLeftRight weight="bold" aria-hidden="true" />
  if (state === "ready") return <CheckCircle weight="fill" aria-hidden="true" />
  return <Package weight="fill" aria-hidden="true" />
}

/**
 * Shape-and-icon state contract shared by every Armory collection surface.
 * Text remains visible for precision, but the silhouette and fixed placement
 * make locked, collected, previewed, installed, and ready states glanceable.
 */
export default function ArmoryStateEmblem({ state = "available", label = "", compact = false }) {
  const displayLabel = label || STATE_COPY[state] || STATE_COPY.available

  return (
    <span
      className={`armoryStateEmblem is-${state}${compact ? " isCompact" : ""}`}
      data-armory-state={state}
    >
      <span className="armoryStateEmblemIcon">
        <ArmoryStateIcon state={state} />
      </span>
      <span className="armoryStateEmblemLabel">{displayLabel}</span>
    </span>
  )
}
