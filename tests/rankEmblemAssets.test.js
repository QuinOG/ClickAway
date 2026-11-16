import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { getRankImageSrc } from '../src/utils/rankUtils.js'

test('every ranked tier resolves to a shipped square PNG through the shared helper', () => {
 for (const tier of ['bronze','silver','gold','platinum','diamond','deadeye']) {
  const src = getRankImageSrc({ toneId: tier })
  assert.equal(src, `/art/ranks/${tier}.png`)
  assert.equal(getRankImageSrc(tier === 'deadeye' ? 'Deadeye' : `${tier} III`), src)
  const path = new URL(`../public${src}`, import.meta.url)
  assert.ok(existsSync(path))
  const png = readFileSync(path)
  assert.equal(png.readUInt32BE(16), 384)
  assert.equal(png.readUInt32BE(20), 384)
 }
 assert.equal(getRankImageSrc('Unranked'), '')
 assert.equal(getRankImageSrc('Placement 2/5'), '')
})
