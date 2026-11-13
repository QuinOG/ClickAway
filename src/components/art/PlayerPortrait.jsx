const PORTRAITS = ["helmet", "goggles", "hood", "knight", "headset"]
const RIVALS = { nova: 0, orbit: 1, kestrel: 2, prism: 3, vector: 4 }

function hashName(name) {
  let hash = 2166136261
  for (const char of String(name).toLowerCase()) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export default function PlayerPortrait({ name = "Player", size = 48, className = "", title }) {
  const normalizedName = String(name).toLowerCase()
  const type = Object.hasOwn(RIVALS, normalizedName) ? RIVALS[normalizedName] : hashName(name) % PORTRAITS.length
  return (
    <img
      className={`playerPortrait ${className}`.trim()}
      src={`/art/portraits/${PORTRAITS[type]}.png`}
      width={size}
      height={size}
      alt={title || ""}
      title={title}
      aria-hidden={title ? undefined : "true"}
      decoding="async"
      draggable="false"
    />
  )
}
