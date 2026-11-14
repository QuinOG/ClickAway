import { StrictMode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { buildRoundRules, DEFAULT_SAVED_LOADOUTS } from '../src/constants/buildcraft.js'
import { DIFFICULTIES } from '../src/constants/gameModesConfig.js'
import { createGeometrySimulation, validateRoundGeometry } from '../src/game/engine/roundGeometry.js'
import { replayRoundEvents } from '../src/game/engine/roundEngine.js'
import { createSeededRng } from '../src/game/engine/seededRng.js'
import { useGameScreenController } from '../src/features/game/hooks/useGameScreenController.js'
vi.mock('../src/services/clickAwayHttpApiClient.js', () => ({ requestRoundStart: vi.fn(async () => ({ roundToken: 'token', seed: 12345 })) }))
afterEach(() => vi.useRealTimers())
test.each([
  ['hit', 'magnet_center'], ['hit', 'freeze_movement', 'hit'],
  ['freeze_movement', 'hit'], ['hit', 'size_boost', 'magnet_center'],
  ['size_lock', 'hit', 'expire', 'hit'],
])('live geometry follows replay in event order: %j', async (...steps) => {
  vi.useFakeTimers()
  const powers = [...new Set(steps.filter(s => !['hit', 'expire'].includes(s)))]
  const loadout = { ...DEFAULT_SAVED_LOADOUTS[0], moduleIds: { ...DEFAULT_SAVED_LOADOUTS[0].moduleIds, powerRigId: 'power_reserve' }, powerupIds: [...powers, 'size_boost', 'freeze_movement'].filter((x, i, a) => a.indexOf(x) === i).slice(0, 3) }
  const rules = buildRoundRules(DIFFICULTIES[1], loadout)
  const geometry = createGeometrySimulation({ roundRules: rules, arenaWidth: 600, arenaHeight: 400, rng: createSeededRng(12345) })
  const onRoundComplete = vi.fn(() => ({ ok: true }))
  const { result } = renderHook(() => useGameScreenController({ activeLoadout: loadout, onRoundComplete }), { wrapper: StrictMode })
  result.current.arenaProps.arenaRef.current = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 452 }) }
  await act(async () => result.current.readyOverlayProps.onStart('normal'))
  act(() => vi.advanceTimersByTime(3000))
  let t = 0
  for (const step of steps) {
    if (step === 'expire') { act(() => vi.advanceTimersByTime(3100)); t += 3100; continue }
    // All geometry transitions happen synchronously, including within one task.
    act(() => {
      if (step === 'hit') {
        const { position, buttonSize } = geometry.getState()
        result.current.arenaProps.onButtonClick({ stopPropagation() {}, clientX: position.x + buttonSize / 2, clientY: position.y + buttonSize / 2 })
        geometry.applyHit(t)
      } else {
        result.current.powerupTrayProps.onUsePowerup(step); geometry.applyPowerup(step, t)
      }
    })
    const state = geometry.getState()
    expect(result.current.arenaProps.buttonStyle.left).toBe(`${state.position.x}px`)
    expect(result.current.arenaProps.buttonStyle.top).toBe(`${state.position.y}px`)
    expect(result.current.arenaProps.buttonStyle.width).toBe(`${state.buttonSize}px`)
    if (step === 'hit') { act(() => vi.advanceTimersByTime(100)); t += 100 }
  }
  act(() => result.current.hudProps.onEndRound())
  act(() => vi.advanceTimersByTime(500))
  act(() => vi.advanceTimersByTime(1))
  const recorded = onRoundComplete.mock.calls[0][0]
  expect(validateRoundGeometry(rules, recorded.events, { seed: recorded.seed, arenaWidth: recorded.arenaWidth, arenaHeight: recorded.arenaHeight }).valid).toBe(true)
  const replay = replayRoundEvents(rules, recorded.events)
  expect(replay.valid).toBe(true)
  expect(replay.score).toBe(recorded.score)
})

