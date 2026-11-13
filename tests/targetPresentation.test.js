import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { isPointOnButtonForHit } from "../src/game/engine/roundGeometry.js"

test("target interaction effects preserve the replay hit area", () => {
  const css = readFileSync(new URL("../src/styles/components/game.css", import.meta.url), "utf8")
  for (const selector of [".bigCircleButton", ".bigCircleButton:hover", ".bigCircleButton:active"]) {
    const rule = css.slice(css.indexOf(`${selector} {`)).split("}")[0]
    assert.ok(rule.startsWith(`${selector} {`))
    assert.doesNotMatch(rule, /(?:transform|translate|scale)\s*:/)
  }
  // The old active transform put this visibly clickable point outside replay.
  const position = { x: 100, y: 100 }
  assert.equal(isPointOnButtonForHit(105, 105 + .97 * (5 + 4), position, 10), false)
  assert.equal(isPointOnButtonForHit(105, 109, position, 10), true)
})

test("spawn animation preserves target size and position", () => {
  const css = readFileSync(new URL("../src/styles/animations.css", import.meta.url), "utf8")
  const animation = css.split("@keyframes targetSpawnCalibrate {")[1].split("@keyframes")[0]
  assert.doesNotMatch(animation, /(?:transform|translate|scale)\s*:/)
})
