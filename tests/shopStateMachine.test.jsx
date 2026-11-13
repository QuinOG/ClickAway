import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"

import ShopCategoryTabs from "../src/features/shop/components/ShopCategoryTabs.jsx"
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
    // The equipped card shows its state through the Equipped button, not a tag.
    if (state === "equipped") expect(card.querySelector(".shopItemStateTag")).toBeNull()
    else expect(card.querySelector(".shopItemStateTag svg")).not.toBeNull()
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

    await user.click(screen.getByRole("button", { name: /Unlock for 100 coins/ }))
    expect(onPurchase).toHaveBeenCalledWith(baseItem)
  })
})

describe("Shop category keyboard navigation", () => {
  test("arrows wrap, Home and End select, and only the active tab is a tab stop", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const tabs = ["All", "Buttons", "Arenas"].map((label) => ({
      id: label, label, ownedCount: 0, itemCount: 3,
    }))
    const { rerender } = render(<ShopCategoryTabs tabs={tabs} activeCategoryId="All" onChange={onChange} />)
    const buttons = screen.getAllByRole("tab")
    expect(buttons.map((button) => button.tabIndex)).toEqual([0, -1, -1])
    buttons[0].focus()
    await user.keyboard("{ArrowLeft}")
    expect(document.activeElement).toBe(buttons[2])
    expect(onChange).toHaveBeenLastCalledWith("Arenas", buttons[2])
    rerender(<ShopCategoryTabs tabs={tabs} activeCategoryId="Arenas" onChange={onChange} />)
    expect(buttons.map((button) => button.tabIndex)).toEqual([-1, -1, 0])
    await user.keyboard("{ArrowRight}")
    expect(document.activeElement).toBe(buttons[0])
    await user.keyboard("{End}")
    expect(document.activeElement).toBe(buttons[2])
    await user.keyboard("{Home}{ArrowRight}")
    expect(document.activeElement).toBe(buttons[1])
    expect(onChange).toHaveBeenLastCalledWith("Buttons", buttons[1])
  })
})
