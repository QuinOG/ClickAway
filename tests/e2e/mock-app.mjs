// Opens ClickAway in a real browser using the same fake API data as the
// screenshot tests (tests/e2e/fixtures.js). No backend or database needed.
// Usage: start Vite (`npm run dev`), then `node tests/e2e/mock-app.mjs [path] [dataState]`
//   path:      starting page, default /game
//   dataState: rich (default) | sparse | empty | error
// Nothing is saved; closing the window ends the session.
import { chromium } from "@playwright/test"

import { installApiMocks } from "./fixtures.js"

const startPath = process.argv[2] || "/game"
const dataState = process.argv[3] || "rich"
const baseUrl = process.env.MOCK_BASE_URL || "http://localhost:5173"

const browser = await chromium.launch({ headless: false })
const context = await browser.newContext({ viewport: null, colorScheme: "dark" })
const page = await context.newPage()
await installApiMocks(page, { dataState })
await page.goto(new URL(startPath, baseUrl).href)
console.log(`Mock ClickAway open at ${baseUrl}${startPath} (${dataState} data). Close the window to stop.`)

browser.on("disconnected", () => process.exit(0))
page.on("close", () => browser.close())
