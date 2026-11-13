import { afterEach, expect, test, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useShopActions } from '../src/app/useShopActions.js'
import { startNewProgressSession } from '../src/app/progressResponseGuard.js'
import { purchaseShopItem, equipShopItem, fetchCurrentUser } from '../src/services/clickAwayHttpApiClient.js'
vi.mock('../src/services/clickAwayHttpApiClient.js', () => ({ purchaseShopItem: vi.fn(), equipShopItem: vi.fn(), fetchCurrentUser: vi.fn() }))
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
