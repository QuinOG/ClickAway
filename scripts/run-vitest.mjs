import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import path from "node:path"

// Windows paths that differ only in drive-letter case make Vitest load two
// copies of its runner, so every suite fails to register. Uppercase the drive
// before Vitest starts, because fixing it inside the Vitest config is too late.
const upperDrive = (file) =>
  process.platform === "win32" ? file.charAt(0).toUpperCase() + file.slice(1) : file

const cwd = upperDrive(process.cwd())
const require = createRequire(import.meta.url)
const vitestPackage = require.resolve("vitest/package.json")
const vitestBin = upperDrive(path.join(path.dirname(vitestPackage), "vitest.mjs"))

const result = spawnSync(
  process.execPath,
  [vitestBin, "run", "--config", "vitest.config.js", ...process.argv.slice(2)],
  { cwd, stdio: "inherit" },
)

if (result.error) throw result.error
// A null status means a signal ended Vitest, which must still count as failure.
process.exit(result.status ?? 1)
