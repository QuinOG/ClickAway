import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { BULLSEYE_RADIUS_SHARE } from "../src/game/engine/roundGeometry.js"

const css = readFileSync(new URL("../src/styles/game-feel.css", import.meta.url), "utf8")

test("the Bullseye ring is painted only inside the scoring zone", () => {
  const rule = css.split("/* ---- Bullseye zone")[1].split("}")[0]
  const ring = rule.split("radial-gradient(circle closest-side,")[1]
  const edge = `${(BULLSEYE_RADIUS_SHARE * 100).toFixed(3)}%`
  assert.equal(edge, "33.333%")
  // A stop past the edge paints pixels that do not score (1.5px on a 10px target's 1.67px zone).
  assert.doesNotMatch(ring, /33\.333% \+/)
  const stops = ring.split(",").map((stop) => stop.trim())
  assert.match(stops.at(-2), new RegExp(`^rgb\\(.+\\) calc\\(${edge} - \\d+px\\) ${edge}$`))
  assert.match(stops.at(-1), new RegExp(`^transparent ${edge}\\)`))
})

test("reduced motion keeps a static gold ring, for the OS and the in-app setting", () => {
  assert.doesNotMatch(css, /\.goldTargetRing\s*\{\s*display:\s*none/)
  const osRule = css.split("/* Reduced motion (OS or in-app)")[1].split("@media (prefers-reduced-motion: reduce) {")[1].split("}")[0]
  assert.match(osRule, /\.goldTargetRing circle \{ stroke-dashoffset: 0 !important;/)
  assert.match(css, /html\[data-motion-reduced="true"\] \.goldTargetRing circle \{ stroke-dashoffset: 0 !important; \}/)
})
