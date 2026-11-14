import { act, fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import ShopPage from '../src/pages/ShopPage.jsx'
import { celebrateShopPurchase, celebrateShopEquip } from '../src/features/shop/shopPurchaseEquipCelebration.js'
import toast from 'react-hot-toast'
const { signal } = vi.hoisted(() => ({ signal: vi.fn() }))
vi.mock('../src/app/useFeedbackPreferences.js', () => ({ useFeedbackPreferences: () => ({ effectivePreferences: { flashes: true } }) }))
vi.mock('../src/hooks/useActionFeedback.js', () => ({ useActionFeedback: () => ({ signalAction: signal }) }))
vi.mock('../src/features/shop/shopPurchaseEquipCelebration.js', () => ({ celebrateShopPurchase: vi.fn(), celebrateShopEquip: vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }))
vi.mock('../src/features/shop/components/ShopHeroHeader.jsx', () => ({ default: ({ onPurchase, onEquip, isSubmitting, actionFeedback }) => <div><button disabled={isSubmitting} onClick={() => onPurchase({ id: 'skin_button', name: 'Classic' })}>Purchase probe</button><button disabled={isSubmitting} onClick={() => onEquip({ id: 'skin_button', name: 'Classic' })}>Equip probe</button><span data-testid='feedback'>{actionFeedback?.kind}</span></div> }))
vi.mock('../src/features/shop/components/ShopCategoryTabs.jsx', () => ({ default: () => null }))
vi.mock('../src/features/shop/components/ShopItemCard.jsx', () => ({ default: () => null }))
test.each(['Purchase', 'Equip'])('discarded %s clears pending feedback without toast, denial or celebration', async action => {
  let resolve
  const held = new Promise(r => { resolve = r })
  render(<ShopPage onPurchase={() => held} onEquip={() => held} />)
  const button = screen.getByRole('button', { name: `${action} probe` })
  fireEvent.click(button)
  expect(button.disabled).toBe(true)
  await act(async () => resolve({ ok: false, discarded: true }))
  expect(button.disabled).toBe(false)
  expect(screen.getByTestId('feedback').textContent).toBe('')
  expect(celebrateShopPurchase).not.toHaveBeenCalled(); expect(celebrateShopEquip).not.toHaveBeenCalled()
  expect(toast.error).not.toHaveBeenCalled()
  expect(signal.mock.calls.every(([, opts]) => opts.silent)).toBe(true)
})
