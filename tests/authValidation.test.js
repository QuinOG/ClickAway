import test from "node:test"
import assert from "node:assert/strict"

import {
  sanitizeUsername,
  validatePassword,
  validateUsername,
} from "../server/validation.js"

test("F-A03: short username is rejected (signup validation)", () => {
  assert.match(validateUsername("ab"), /at least 3/)
})

test("F-A04: short password is rejected (signup validation)", () => {
  assert.match(validatePassword("short"), /at least 8/)
})

test("F-A01: valid username and password pass validation (happy path)", () => {
  assert.equal(validateUsername("newuser"), "")
  assert.equal(validatePassword("validpass1"), "")
})

test("usernames are trimmed (sanitize)", () => {
  assert.equal(sanitizeUsername("  hey  "), "hey")
})
