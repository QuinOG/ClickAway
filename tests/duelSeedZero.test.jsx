import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { DEFAULT_SAVED_LOADOUTS } from '../src/constants/buildcraft.js'
import { useGameScreenController } from '../src/features/game/hooks/useGameScreenController.js'
import { isValidGhostReplay } from '../src/utils/replayUtils.js'
import { requestRoundStart } from '../src/services/clickAwayHttpApiClient.js'
vi.mock('../src/services/clickAwayHttpApiClient.js', () => ({ requestRoundStart: vi.fn(async () => ({ seed: 0, roundToken: 'duel-token', replayId: 2 })) }))
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })
test.each([0, 123])('valid seed %s starts a challenge-bound duel exactly once', async seed => {
  vi.useFakeTimers()
  const { result } = renderHook(() => useGameScreenController({ savedLoadouts: DEFAULT_SAVED_LOADOUTS, activeLoadout: DEFAULT_SAVED_LOADOUTS[0], challengeId: 1, ghostReplay: { id: 2, seed, modeId: 'normal', events: [] }, autoStartGhostDuel: true }))
  await act(async () => vi.advanceTimersByTimeAsync(1))
  expect(requestRoundStart).toHaveBeenCalledExactlyOnceWith('normal', { challengeId: 1 })
  act(() => vi.advanceTimersByTime(3000))
  expect(result.current.phase).toBe('playing')
})
test('raw ghost predicate rejects missing or invalid seeds before normalization', () => {
  for (const seed of [undefined, null, NaN, Infinity, -1, 2 ** 32, '0']) expect(isValidGhostReplay({ id: 2, modeId: 'normal', seed })).toBe(false)
  expect(isValidGhostReplay(null)).toBe(false)
  expect(isValidGhostReplay({ id: 2, modeId: 'normal', seed: 0 })).toBe(true)
})
