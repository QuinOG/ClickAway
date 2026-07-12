import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, test, vi } from "vitest"

import { DEFAULT_SAVED_LOADOUTS } from "../src/constants/buildcraft.js"
import { BUILD_WALKTHROUGH_STATUS } from "../src/constants/buildWalkthrough.js"
import { DIFFICULTIES } from "../src/constants/gameModesConfig.js"
import ArmoryPage from "../src/pages/ArmoryPage.jsx"

function renderArmory({ url = "/armory", ...overrides } = {}) {
  const props = {
    modes: DIFFICULTIES,
    selectedModeId: "normal",
    onModeChange: vi.fn(),
    playerLevel: 5,
    savedLoadouts: DEFAULT_SAVED_LOADOUTS,
    activeLoadoutId: "loadout_1",
    onLoadoutStateChange: vi.fn(),
    buildWalkthrough: { status: BUILD_WALKTHROUGH_STATUS.DISMISSED },
    onBuildWalkthroughChange: vi.fn(),
    ...overrides,
  }

  render(
    <MemoryRouter initialEntries={[url]}>
      <ArmoryPage {...props} />
    </MemoryRouter>
  )

  return props
}

function lastLoadoutState(props) {
  return props.onLoadoutStateChange.mock.calls.at(-1)[0]
}

async function openStep(user, stepLabel) {
  const rail = screen.getByLabelText("Armory steps")
  await user.click(within(rail).getByRole("button", { name: new RegExp(stepLabel) }))
}

// Power labels also appear in the collapsed hotbar step summary, so scope
// queries to the actual choice card.
function getChoiceCard(name) {
  return screen
    .getAllByRole("button", { name })
    .find((button) => button.className.includes("armoryChoiceCard"))
}

describe("Armory screen baseline", () => {
  test("renders all four steps with the slot editor open by default", () => {
    renderArmory()

    const rail = screen.getByLabelText("Armory steps")
    expect(within(rail).getByRole("button", { name: /Build Slot/ })).not.toBeNull()
    expect(within(rail).getByRole("button", { name: /Passive Stack/ })).not.toBeNull()
    expect(within(rail).getByRole("button", { name: /Hotbar/ })).not.toBeNull()
    expect(within(rail).getByRole("button", { name: /Review Sim/ })).not.toBeNull()

    expect(screen.getByLabelText("Build name")).not.toBeNull()
    expect(screen.getByRole("button", { name: "Reset This Slot" })).not.toBeNull()

    const slotList = screen.getByLabelText("Saved build slots")
    expect(within(slotList).getByText("All-Rounder")).not.toBeNull()
    expect(within(slotList).getByText("Safe Hands")).not.toBeNull()
    expect(within(slotList).getByText("Glass Cannon")).not.toBeNull()
  })

  test("activating another saved build persists the new active id", async () => {
    const user = userEvent.setup()
    const props = renderArmory()

    const slotList = screen.getByLabelText("Saved build slots")
    await user.click(within(slotList).getByRole("button", { name: /Safe Hands/ }))

    expect(lastLoadoutState(props).activeLoadoutId).toBe("loadout_2")
  })

  test("selecting a passive module persists it on the active build", async () => {
    const user = userEvent.setup()
    const props = renderArmory()

    await openStep(user, "Passive Stack")
    await user.click(screen.getByRole("button", { name: /^Anchor/ }))

    const { savedLoadouts, activeLoadoutId } = lastLoadoutState(props)
    expect(activeLoadoutId).toBe("loadout_1")
    const updatedLoadout = savedLoadouts.find((loadout) => loadout.id === "loadout_1")
    expect(updatedLoadout.moduleIds.tempoCoreId).toBe("tempo_anchor")
  })

  test("locked modules and powers are disabled with unlock hints", async () => {
    const user = userEvent.setup()
    renderArmory({ playerLevel: 5 })

    await openStep(user, "Hotbar")

    const comboSurge = screen.getByRole("button", { name: /Combo Surge/ })
    expect(comboSurge.disabled).toBe(true)
    expect(within(comboSurge).getByText("Unlocks at Level 7")).not.toBeNull()

    const guardCharge = screen.getByRole("button", { name: /Guard Charge/ })
    expect(guardCharge.disabled).toBe(true)
    expect(within(guardCharge).getByText("Unlocks at Level 11")).not.toBeNull()
  })

  test("a power equipped on another key is blocked as a duplicate", async () => {
    const user = userEvent.setup()
    renderArmory()

    // Editing key 1 while Grow +10 sits on key 2 and Freeze 1s on key 3.
    await openStep(user, "Hotbar")

    const growCard = getChoiceCard(/Grow \+10/)
    expect(growCard.disabled).toBe(true)
    expect(within(growCard).getByText("On key 2")).not.toBeNull()

    const freezeCard = getChoiceCard(/Freeze 1s/)
    expect(freezeCard.disabled).toBe(true)
    expect(within(freezeCard).getByText("On key 3")).not.toBeNull()
  })

  test("selecting an unlocked, unequipped power persists it on the edited key", async () => {
    const user = userEvent.setup()
    const props = renderArmory({ playerLevel: 5 })

    await openStep(user, "Hotbar")
    await user.click(screen.getByRole("button", { name: /Magnet Center/ }))

    const { savedLoadouts } = lastLoadoutState(props)
    const updatedLoadout = savedLoadouts.find((loadout) => loadout.id === "loadout_1")
    expect(updatedLoadout.powerupIds).toEqual(["magnet_center", "size_boost", "freeze_movement"])
  })

  test("renaming the build commits a normalized name on Enter", async () => {
    const user = userEvent.setup()
    const props = renderArmory()

    const nameInput = screen.getByLabelText("Build name")
    await user.clear(nameInput)
    await user.type(nameInput, "  Fast   Fingers  {Enter}")

    const { savedLoadouts } = lastLoadoutState(props)
    const updatedLoadout = savedLoadouts.find((loadout) => loadout.id === "loadout_1")
    expect(updatedLoadout.name).toBe("Fast Fingers")
  })

  test("reset restores the starter loadout for the active slot", async () => {
    const user = userEvent.setup()
    const props = renderArmory()

    await openStep(user, "Passive Stack")
    await user.click(screen.getByRole("button", { name: /^Anchor/ }))

    await openStep(user, "Build Slot")
    await user.click(screen.getByRole("button", { name: "Reset This Slot" }))

    const { savedLoadouts } = lastLoadoutState(props)
    const resetLoadout = savedLoadouts.find((loadout) => loadout.id === "loadout_1")
    expect(resetLoadout.name).toBe("All-Rounder")
    expect(resetLoadout.moduleIds.tempoCoreId).toBe("tempo_balanced")
    expect(resetLoadout.powerupIds).toEqual(["time_boost", "size_boost", "freeze_movement"])
  })

  test("?step=hotbar&powerSlot=2 deep link opens the hotbar editor on key 2", () => {
    renderArmory({ url: "/armory?step=hotbar&powerSlot=2" })

    const hotbarTabs = screen.getByLabelText("Hotbar slots")
    // Key 2 is the selected editing slot: its tab is active and the detail panel shows it.
    const activeTab = hotbarTabs.querySelector(".armoryHotbarButton.isActive .armoryHotbarKey")
    expect(activeTab?.textContent).toBe("2")
    expect(screen.getAllByText("Key 2").length).toBeGreaterThan(0)
  })

  test("?step=passives&lane=powerRig deep link opens the Power Rig lane", () => {
    renderArmory({ url: "/armory?step=passives&lane=powerRig" })

    expect(screen.getByRole("heading", { name: "Power Rig" })).not.toBeNull()
  })
})
