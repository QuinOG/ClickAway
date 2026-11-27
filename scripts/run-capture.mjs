// Runs Playwright with the zz-* capture specs included (see playwright.config.js).
import { spawnSync } from "node:child_process"

const result = spawnSync("npx", ["playwright", "test", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, PLAYWRIGHT_CAPTURE: "1" },
})
process.exit(result.status ?? 1)
