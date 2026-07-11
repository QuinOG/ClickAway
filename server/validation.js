export function sanitizeUsername(username = "") {
  return String(username).trim()
}

export function validateUsername(username) {
  if (!username) return "Username is required."
  if (username.length < 3) return "Username must be at least 3 characters."
  if (username.length > 32) return "Username must be 32 characters or less."
  return ""
}

export function validatePassword(password = "") {
  if (!password) return "Password is required."
  if (password.length < 8) return "Password must be at least 8 characters."
  if (password.length > 128) return "Password must be 128 characters or less."
  return ""
}
