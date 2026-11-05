// TEMPORARY (judge council session) — delete after. Drives the user's running
// dev server on localhost:5173 with mocked API data; starts no web server.
import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: ".",
  testMatch: /zz-judge-.*\.spec\.js/,
  outputDir: "C:/Users/Quinlan/AppData/Local/Temp/claude/6e27f11f35d1816b/99e2bbab-32f7-4fd7-9cdc-07590b537485/scratchpad/pw-judge-output",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 600_000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:5173",
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
  },
})
