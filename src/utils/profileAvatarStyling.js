export function getProfileInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "P"
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
}

const AVATAR_GRADIENTS = [
  "linear-gradient(145deg, #ff6b6b, #7b233a)",
  "linear-gradient(145deg, #ff9f43, #7a3f0f)",
  "linear-gradient(145deg, #ffd166, #7b5c11)",
  "linear-gradient(145deg, #4dd4ac, #175b55)",
  "linear-gradient(145deg, #54a0ff, #233b8b)",
  "linear-gradient(145deg, #8c7ae6, #3d2f7b)",
  "linear-gradient(145deg, #f368e0, #7a245d)",
  "linear-gradient(145deg, #48dbfb, #17617a)",
]

function getAvatarGradientIndex(seedText = "") {
  const normalizedSeedText = String(seedText).trim().toLowerCase()
  if (!normalizedSeedText) return 0

  let hash = 0

  for (let index = 0; index < normalizedSeedText.length; index += 1) {
    hash = ((hash << 5) - hash) + normalizedSeedText.charCodeAt(index)
    hash |= 0
  }

  return (hash >>> 0) % AVATAR_GRADIENTS.length
}

export function getProfileAvatarStyle(seedText = "") {
  return {
    background: AVATAR_GRADIENTS[getAvatarGradientIndex(seedText)],
  }
}
