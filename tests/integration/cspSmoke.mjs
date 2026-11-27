import assert from "node:assert/strict"
import { once } from "node:events"
import { chromium } from "@playwright/test"
import { startTestDatabase } from "./testDatabase.js"

const database = await startTestDatabase()
let pool
let server
let browser

try {
  process.env.JWT_SECRET = "integration-test-secret"
  process.env.CLIENT_ORIGIN = "http://localhost:5173"
  process.env.NODE_ENV = "test"
  process.env.TRUST_PROXY = "false"

  pool = (await import("../../server/db/pgPool.js")).default
  const { initializeSchema } = await import("../../server/playerMysqlDatabase.js")
  const { createApp } = await import("../../server/app.js")
  await initializeSchema()
  server = createApp().listen(0, "127.0.0.1")
  await once(server, "listening")

  browser = await chromium.launch()
  const page = await browser.newPage({
    baseURL: `http://127.0.0.1:${server.address().port}`,
  })
  page.setDefaultTimeout(10_000)
  const violations = []
  page.on("console", (message) => {
    if (/content security policy/i.test(message.text())) {
      violations.push(`${page.url()} ${message.text()}`)
    }
  })

  await page.goto("/login")
  await page.getByLabel("Username", { exact: true }).waitFor()
  await page.waitForLoadState("networkidle")
  const loginViolations = violations.length

  await page.goto("/signup")
  await page.getByLabel("Confirm Password", { exact: true }).waitFor()
  await page.getByLabel("Username", { exact: true }).fill("CspSmokePlayer")
  await page.getByLabel("Password", { exact: true }).fill("integration-password")
  await page.getByLabel("Confirm Password", { exact: true }).fill("integration-password")
  const signup = page.waitForResponse((response) => response.url().endsWith("/api/auth/signup"))
  await page.getByRole("button", { name: "Create account" }).click()
  assert.equal((await signup).status(), 201)
  await page.waitForURL("**/game")
  await page.goto("/game")
  await page.locator("#round-ready-title").waitFor()
  assert.equal(new URL(page.url()).pathname, "/game")
  await page.waitForLoadState("networkidle")

  assert.deepEqual(violations, [], "Content Security Policy violations")
  console.log(`/login: ${loginViolations} CSP violations`)
  console.log(`/signup and /game: ${violations.length - loginViolations} CSP violations`)
} finally {
  try {
    await browser?.close()
    if (server?.listening) {
      await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve())
      })
    }
    await pool?.end()
  } finally {
    await database.stop()
  }
}
