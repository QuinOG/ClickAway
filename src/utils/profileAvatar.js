export function getProfileInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "P"
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
}

export function getProfileAvatarStyle(seedText = "") {
  return {
    background: "linear-gradient(145deg, #ff1919d2, #690b1288)",
  }
}
