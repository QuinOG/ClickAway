import jwt from "jsonwebtoken"

export const AUTH_COOKIE_NAME = "clickaway_auth"
const TOKEN_EXPIRY = "7d"
export const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export function signAuthToken({ id, username, role }, jwtSecret) {
  return jwt.sign(
    {
      sub: String(id),
      username,
      role,
    },
    jwtSecret,
    { expiresIn: TOKEN_EXPIRY }
  )
}

export function verifyAuthToken(token, jwtSecret) {
  return jwt.verify(token, jwtSecret)
}

// Express has no built-in cookie parser. The auth cookie is a single opaque JWT
// with no special characters, so a tiny hand-rolled parser avoids pulling in a
// dependency (e.g. cookie-parser) for a one-line problem.
export function extractCookieToken(cookieHeader = "", cookieName = AUTH_COOKIE_NAME) {
  return String(cookieHeader || "")
    .split(";")
    .map((pair) => pair.trim())
    .reduce((foundToken, pair) => {
      if (foundToken) return foundToken
      const separatorIndex = pair.indexOf("=")
      if (separatorIndex === -1) return foundToken
      const name = pair.slice(0, separatorIndex).trim()
      if (name !== cookieName) return foundToken
      try {
        return decodeURIComponent(pair.slice(separatorIndex + 1).trim())
      } catch {
        return ""
      }
    }, "")
}
