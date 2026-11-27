import { afterEach, expect, test, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useShopActions } from '../src/app/useShopActions.js'
import { startNewProgressSession } from '../src/app/progressResponseGuard.js'
import { purchaseShopItem, equipShopItem, fetchCurrentUser } from '../src/services/clickAwayHttpApiClient.js'
import toast from 'react-hot-toast'
vi.mock('../src/services/clickAwayHttpApiClient.js', () => ({ purchaseShopItem: vi.fn(), equipShopItem: vi.fn(), fetchCurrentUser: vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }))
afterEach(() => startNewProgressSession())
const item = { id: 'skin_neon', type: 'button_skin', cost: 100 }
test.each(['handlePurchase', 'handleEquip'])('%s discards old-session waits, responses, refetches and rejections', async method => {
  for (const stage of ['wait', 'http', 'refresh', 'reject']) {
    startNewProgressSession()
    let finish
    const held = new Promise((resolve, reject) => { finish = stage === 'reject' ? reject : resolve })
    const api = method === 'handlePurchase' ? purchaseShopItem : equipShopItem
    api.mockReturnValue(stage === 'http' || stage === 'reject' ? held : Promise.resolve({ progress: null }))
    fetchCurrentUser.mockReturnValue(held)
    const applyProgress = vi.fn()
    const { result, unmount } = renderHook(() => useShopActions({ isAuthed: true, coins: 1000, ownedItemIds: method === 'handleEquip' ? [item.id] : [], applyProgress, waitForPendingProgress: stage === 'wait' ? () => held : undefined }))
    const pending = result.current[method](item)
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
    startNewProgressSession()
    finish(stage === 'reject' ? Error('offline') : { progress: { coins: 900 } })
    expect(await pending).toEqual({ ok: false, discarded: true })
    expect(applyProgress).not.toHaveBeenCalled(); unmount()
  }
})

test.each(['handlePurchase', 'handleEquip'])('failed %s does not schedule a progress refresh or toast', async method => {
  vi.useFakeTimers()
  try {
    const api = method === 'handlePurchase' ? purchaseShopItem : equipShopItem
    api.mockRejectedValueOnce(Error('offline'))
    const { result } = renderHook(() => useShopActions({ isAuthed: true, coins: 1000,
      ownedItemIds: method === 'handleEquip' ? [item.id] : [], applyProgress: vi.fn() }))
    expect(await result.current[method](item)).toEqual({ ok: false, error: 'offline' })
    await vi.advanceTimersByTimeAsync(300)
    expect(fetchCurrentUser).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  } finally {
    startNewProgressSession()
    vi.useRealTimers()
  }
})
