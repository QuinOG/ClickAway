import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"

import ShopHeroHeader from "../src/features/shop/components/ShopHeroHeader.jsx"
import ShopItemCard from "../src/features/shop/components/ShopItemCard.jsx"

const baseItem = {
  id: "skin_test",
  type: "button_skin",
  name: "Test Skin",
  cost: 100,
  description: "A test cosmetic.",
  imageSrc: "/button.png",
}

function renderCard(overrides = {}) {
  const props = {
    item: baseItem,
    coins: 0,
    ownedItemIds: [],
    equippedButtonSkinId: "skin_button",
    equippedArenaThemeId: "theme_default",
    equippedProfileImageId: "profile_default",
    ...overrides,
  }

  return render(<ShopItemCard {...props} />)
}

describe("Shop item state machine", () => {
  test.each([
    ["locked", { coins: 99 }],
    ["affordable", { coins: 100 }],
    ["owned", { coins: 0, ownedItemIds: [baseItem.id] }],
    ["equipped", { coins: 0, ownedItemIds: [baseItem.id], equippedButtonSkinId: baseItem.id }],
  ])("renders the %s state as structural card data with an icon", (state, overrides) => {
    const { container } = renderCard(overrides)
    const card = container.querySelector(".shopItemCard")

    expect(card.dataset.shopState).toBe(state)
    expect(card.classList.contains(`shopItemCard-${state}`)).toBe(true)
    expect(card.querySelector(".shopItemStateTag svg")).not.toBeNull()
  })

  test("selection is independent from ownership state and drives the preview control", () => {
    const { container } = renderCard({ coins: 100, isSelected: true })
    const card = container.querySelector(".shopItemCard")

    expect(card.dataset.shopState).toBe("affordable")
    expect(card.dataset.selected).toBe("true")
    expect(card.classList.contains("shopItemCard-selected")).toBe(true)
    expect(screen.getByRole("button", { name: "Preview Test Skin" }).getAttribute("aria-pressed")).toBe("true")
  })
})

describe("Shop preview-to-action continuity", () => {
  test("keeps the selected item in preview and purchases it from the contextual action", async () => {
    const user = userEvent.setup()
    const onPurchase = vi.fn()
    const equippedButton = { ...baseItem, id: "skin_button", name: "Classic" }

    render(
      <ShopHeroHeader
        coins={250}
        totalOwnedCount={3}
        totalItems={10}
        collectionPercent={30}
        buttonSkin={equippedButton}
        arenaTheme={{ id: "theme_default", type: "arena_theme", name: "Classic Arena", effectClass: "theme-default" }}
        profileImage={{ id: "profile_default", type: "profile_image", name: "Identity Gradient" }}
        selectedItem={baseItem}
        selectedItemStatus={{ state: "affordable", isOwned: false, isEquipped: false, canAfford: true }}
        onPurchase={onPurchase}
      />
    )

    expect(screen.getByLabelText(/Selected preview with Test Skin/)).not.toBeNull()
    expect(screen.getByRole("progressbar", { name: "Collection progress" }).getAttribute("aria-valuenow")).toBe("3")

    await user.click(screen.getByRole("button", { name: /Unlock for 100 coins/ }))
    expect(onPurchase).toHaveBeenCalledWith(baseItem)
  })
})
