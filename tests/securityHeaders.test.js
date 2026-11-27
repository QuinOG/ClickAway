import assert from "node:assert/strict"
import test from "node:test"

import { securityHeaders } from "../server/securityHeaders.js"

for (const isProduction of [false, true]) {
  test(`security headers are set with isProduction=${isProduction}`, () => {
    const headers = new Headers()
    let nextCalls = 0
    securityHeaders({ isProduction })({}, {
      setHeader: (name, value) => headers.set(name, value),
    }, () => { nextCalls += 1 })

    assert.equal(nextCalls, 1)
    assert.deepEqual(headers.get("Content-Security-Policy").split("; "), [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "worker-src 'self' blob:",
    ])
    assert.equal(headers.get("X-Content-Type-Options"), "nosniff")
    assert.equal(headers.get("Referrer-Policy"), "strict-origin-when-cross-origin")
    assert.equal(headers.get("X-Frame-Options"), "DENY")
    assert.equal(headers.get("Strict-Transport-Security"),
      isProduction ? "max-age=15552000; includeSubDomains" : null)
  })
}
