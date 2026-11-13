import test from "node:test"
import assert from "node:assert/strict"
import jwt from "jsonwebtoken"

import { AUTH_COOKIE_NAME, extractCookieToken, signAuthToken, verifyAuthToken } from "../server/auth.js"

const secret = "auth-test-secret"

test("auth cookies round trip the signed account identity", () => {
  const token = signAuthToken({ id: 42, username: "player", role: "player" }, secret)
  const extracted = extractCookieToken(`other=ignored; ${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`)
  const payload = verifyAuthToken(extracted, secret)
  assert.equal(payload.sub, "42")
  assert.equal(payload.username, "player")
  assert.equal(payload.role, "player")
  assert.equal(payload.exp - payload.iat, 7 * 24 * 60 * 60)
})

test("auth verification rejects wrong signatures and expired sessions", () => {
  const token = signAuthToken({ id: 42, username: "player", role: "player" }, secret)
  assert.throws(() => verifyAuthToken(token, "wrong-secret"), /invalid signature/)
  const expired = jwt.sign({ sub: "42" }, secret, { expiresIn: -1 })
  assert.throws(() => verifyAuthToken(expired, secret), /jwt expired/)
})

test("cookie extraction handles absent, malformed and unrelated cookies", () => {
  assert.equal(extractCookieToken(), "")
  assert.equal(extractCookieToken("other=token; no-equals"), "")
  assert.equal(extractCookieToken(`${AUTH_COOKIE_NAME}=%broken`), "")
  assert.equal(extractCookieToken(`${AUTH_COOKIE_NAME}_other=token`), "")
})
