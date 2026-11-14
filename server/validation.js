// Only real strings are accepted; anything else (null, objects, numbers) is
// treated as missing instead of being coerced into "null" or "[object Object]".
export function sanitizeUsername(username = "") {
  return typeof username === "string" ? username.trim() : ""
}

export function sanitizePassword(password = "") {
  return typeof password === "string" ? password : ""
}

// bcrypt only uses the first 72 bytes of a password, so anything longer would
// be silently ignored when checking it.
export const PASSWORD_MAX_BYTES = 72

export function validateUsername(username) {
  if (!username) return "Username is required."
  if (username.length < 3) return "Username must be at least 3 characters."
  if (username.length > 32) return "Username must be 32 characters or less."
  return ""
}

export function validatePassword(password = "") {
  if (!password) return "Password is required."
  if (password.length < 8) return "Password must be at least 8 characters."
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    return "Password must be 72 characters or less."
  }
  return ""
}
