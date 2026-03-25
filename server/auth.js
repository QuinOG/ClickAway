import jwt from "jsonwebtoken"

const TOKEN_EXPIRY = "7d"

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

export function extractBearerToken(authorizationHeader = "") {
  if (!authorizationHeader.startsWith("Bearer ")) return ""
  return authorizationHeader.slice("Bearer ".length).trim()
}
