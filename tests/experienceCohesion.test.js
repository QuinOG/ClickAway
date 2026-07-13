import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, it } from "node:test"

import { SHOP_CATEGORIES } from "../src/constants/shopCatalog.js"

const workspaceRoot = resolve(import.meta.dirname, "..")

describe("E3 static cohesion contracts", () => {
  it("keeps every catalog image source deployable", () => {
    const missingAssets = SHOP_CATEGORIES
      .flatMap((category) => category.items)
      .filter((item) => item.imageSrc?.startsWith("/"))
      .map((item) => item.imageSrc)
      .filter((imageSrc) => !existsSync(resolve(workspaceRoot, "public", imageSrc.slice(1))))

    assert.deepEqual(missingAssets, [])
  })

  it("uses the canonical Ladder term in player-facing field-guide copy", () => {
    const helpSources = [
      "src/pages/HelpPage.jsx",
      "src/features/help/helpPageStructuredContent.js",
    ].map((path) => readFileSync(resolve(workspaceRoot, path), "utf8")).join("\n")

    assert.doesNotMatch(helpSources, /Leaderboard/)
    assert.match(helpSources, /Ladder/)
  })

  it("uses the shared visually-hidden primitive for game announcements", () => {
    const overlaySources = [
      "src/features/game/components/roundOverlays/ReadyOverlay.jsx",
      "src/features/game/components/roundOverlays/CountdownOverlay.jsx",
    ].map((path) => readFileSync(resolve(workspaceRoot, path), "utf8")).join("\n")

    assert.doesNotMatch(overlaySources, /className="srOnly"/)
    assert.match(overlaySources, /className="uiVisuallyHidden"/)
  })
})
