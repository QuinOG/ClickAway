import { useId } from "react"

/*
 * Deterministic illustrated pilot portraits.
 *
 * Every player gets a helmeted arena pilot whose palette, visor and crest are
 * derived from their username, so identities read as characters rather than
 * initial-letter tiles. Same ink-outline art direction as GameIcons.
 */

const INK = "#0a1322"

const BACKDROPS = [
  ["#2a6fd1", "#123a7a"],
  ["#1fa58a", "#0c4f44"],
  ["#c0472f", "#5e1d14"],
  ["#7a4bd1", "#36206a"],
  ["#d18a1f", "#6a420c"],
  ["#2f9fd1", "#0f4766"],
  ["#c43a78", "#5a1736"],
  ["#4a8f2f", "#1f4414"],
]

const HELMETS = ["#dbe6f3", "#ffc94a", "#3fd0ff", "#ff6b6b", "#9ff0c9", "#c9a2ff", "#ffffff", "#ff9a4a"]
const VISORS = ["#4fd8ff", "#ffe27a", "#ff4d7a", "#7dffb5", "#b98bff"]

function hashName(name = "") {
  let hash = 2166136261
  for (const char of String(name).toLowerCase()) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function getPortraitTraits(name = "") {
  const hash = hashName(name)
  return {
    backdrop: BACKDROPS[hash % BACKDROPS.length],
    helmet: HELMETS[(hash >>> 3) % HELMETS.length],
    visor: VISORS[(hash >>> 7) % VISORS.length],
    crest: (hash >>> 11) % 3,
  }
}

export default function PlayerPortrait({ name = "Player", size = 48, className = "", title }) {
  const instanceId = useId().replace(/:/g, "")
  const { backdrop, helmet, visor, crest } = getPortraitTraits(name)
  const gradientId = `portrait-bg-${instanceId}`

  return (
    <svg
      className={`playerPortrait ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : "true"}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={backdrop[0]} />
          <stop offset="1" stopColor={backdrop[1]} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" fill={`url(#${gradientId})`} />
      <path d="M0 48 64 30v34H0Z" fill="#000" opacity="0.14" />
      <g stroke={INK} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round">
        {/* shoulders */}
        <path d="M8 64c2-10 10-15 24-15s22 5 24 15Z" fill="#22344f" />
        <path d="M22 51l10 6 10-6" fill="none" stroke={visor} strokeWidth="2.2" />
        {/* helmet */}
        <path d="M14 34c0-12 8-21 18-21s18 9 18 21v6c0 3-2 5-5 5H19c-3 0-5-2-5-5Z" fill={helmet} />
        {crest === 0 ? <path d="M32 13V6" fill="none" strokeWidth="3.4" /> : null}
        {crest === 1 ? <path d="M24 15c2-6 14-6 16 0" fill={visor} strokeWidth="2.2" /> : null}
        {crest === 2 ? <path d="M48 26l6-4M16 26l-6-4" fill="none" strokeWidth="3" /> : null}
        {/* visor */}
        <path d="M18 29c0-3 2-5 5-5h18c3 0 5 2 5 5v4c0 3-2 5-5 5H23c-3 0-5-2-5-5Z" fill="#0d1a2c" />
        <path d="M21 31h22" fill="none" stroke={visor} strokeWidth="3" />
      </g>
      <path d="M20 20c3-4 7-6 11-6" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="40" cy="29" r="1.6" fill="#fff" opacity="0.8" />
    </svg>
  )
}

