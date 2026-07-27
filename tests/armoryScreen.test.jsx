import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, test, vi } from "vitest"

import { DEFAULT_SAVED_LOADOUTS } from "../src/constants/buildcraft.js"
import { buildLoadoutPresentation } from "../src/constants/buildcraftPresentation.js"
import { BAY_TARGET_SCALE } from "../src/features/armory/components/ArmoryBayWall.jsx"
import { MACHINE_TARGET_SCALE } from "../src/features/armory/components/ArmoryMachine.jsx"
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

function getBayWall() {
  return screen.getByLabelText("Build bays")
}

// Power labels also appear on the hotbar tabs, cadence timeline, and machine
// rack, so scope queries to the actual gallery part card.
function getPartCard(name) {
  return screen
    .getAllByRole("button", { name })
    .find((button) => button.className.includes("armoryPartCard"))
}

async function equipPart(user, card) {
  await user.click(card)
}

describe("Armory screen baseline", () => {
  test("renders three steps with the passive editor open by default", () => {
    renderArmory()

    const rail = screen.getByLabelText("Armory steps")
    expect(within(rail).queryByRole("button", { name: /Build Slot/ })).toBeNull()
    expect(within(rail).getByRole("button", { name: /Mods/ })).not.toBeNull()
    expect(within(rail).getByRole("button", { name: /Powerups/ })).not.toBeNull()
    expect(within(rail).getByRole("button", { name: /Test Run/ })).not.toBeNull()

    expect(screen.getByRole("heading", { name: "Tempo Core" })).not.toBeNull()
    expect(screen.queryByLabelText("Build name")).toBeNull()
    expect(screen.queryByRole("button", { name: "Reset This Slot" })).toBeNull()

    const bayWall = getBayWall()
    expect(within(bayWall).getByText("Loadout 1")).not.toBeNull()
    expect(within(bayWall).getByText("Loadout 2")).not.toBeNull()
    expect(within(bayWall).getByText("Loadout 3")).not.toBeNull()
    expect(within(bayWall).queryByText(/^Bay [123]$/)).toBeNull()
    expect(within(bayWall).queryByRole("button", { name: "Copy active build here" })).toBeNull()
    expect(within(bayWall).queryByRole("button", { name: "Blueprint code" })).toBeNull()
  })

  test("separates build management from the ordered workbench workflow", () => {
    renderArmory()

    const bayWall = screen.getByLabelText("Build bays")
    const workflow = screen.getByLabelText("Armory steps")

    expect(bayWall.closest(".armoryRail")).not.toBeNull()
    expect(workflow.closest(".armoryCommandBar")).not.toBeNull()
    expect(workflow.closest(".armoryRail")).toBeNull()
    expect(within(workflow).getByRole("button", { name: /Mods/ })).not.toBeNull()
    expect(within(workflow).getByRole("button", { name: /Powerups/ })).not.toBeNull()
    expect(within(workflow).getByRole("button", { name: /Test Run/ })).not.toBeNull()
    expect(screen.getByRole("link", { name: "Play" })).not.toBeNull()
    expect(within(workflow).getByRole("button", { name: /Mods/ }).getAttribute("aria-current")).toBe("step")
  })

  test("activating another bay persists the new active id", async () => {
    const user = userEvent.setup()
    const props = renderArmory()

    const bayWall = getBayWall()
    await user.click(within(bayWall).getByRole("button", { name: /Loadout 2/ }))

    expect(lastLoadoutState(props).activeLoadoutId).toBe("loadout_2")
  })

  test("selecting a passive module persists it on the active build", async () => {
    const user = userEvent.setup()
    const props = renderArmory()

    await openStep(user, "Mods")
    await equipPart(user, screen.getByRole("button", { name: /^Anchor/ }))

    const { savedLoadouts, activeLoadoutId } = lastLoadoutState(props)
    expect(activeLoadoutId).toBe("loadout_1")
    const updatedLoadout = savedLoadouts.find((loadout) => loadout.id === "loadout_1")
    expect(updatedLoadout.moduleIds.tempoCoreId).toBe("tempo_anchor")
  })

  test("locked modules and powers are disabled with unlock hints", async () => {
    const user = userEvent.setup()
    renderArmory({ playerLevel: 5 })

    await openStep(user, "Powerups")

    const comboSurge = screen.getByRole("button", { name: /Combo Surge/ })
    expect(comboSurge.disabled).toBe(true)
    expect(within(comboSurge).getByText("Unlocks at Level 7")).not.toBeNull()

    const guardCharge = screen.getByRole("button", { name: /Guard Charge/ })
    expect(guardCharge.disabled).toBe(true)
    expect(within(guardCharge).getByText("Unlocks at Level 11")).not.toBeNull()
  })

  test("a power racked on another key stays live and installs as a one-action swap", async () => {
    const user = userEvent.setup()
    const props = renderArmory()

    // Editing key 1 while Grow +10 sits on key 2 and Freeze 1s on key 3.
    await openStep(user, "Powerups")

    // No longer a dead disabled card: it shows its key and offers a swap.
    const growCard = getPartCard(/Grow \+10/)
    expect(growCard.disabled).toBe(false)
    expect(within(growCard).getByText("On key 2")).not.toBeNull()

    // Clicking swaps it onto key 1 and moves the displaced powerup to key 2.
    await equipPart(user, growCard)

    const { savedLoadouts } = lastLoadoutState(props)
    const updatedLoadout = savedLoadouts.find((loadout) => loadout.id === "loadout_1")
    expect(updatedLoadout.powerupIds).toEqual(["size_boost", "time_boost", "freeze_movement"])
  })

  test("selecting an unlocked, unequipped power persists it on the edited key", async () => {
    const user = userEvent.setup()
    const props = renderArmory({ playerLevel: 5 })

    await openStep(user, "Powerups")
    const magnetCard = getPartCard(/Magnet Center/)
    await equipPart(user, magnetCard)

    const { savedLoadouts } = lastLoadoutState(props)
    const updatedLoadout = savedLoadouts.find((loadout) => loadout.id === "loadout_1")
    expect(updatedLoadout.powerupIds).toEqual(["magnet_center", "size_boost", "freeze_movement"])
  })

  test("renaming the build via the machine nameplate commits a normalized name on Enter", async () => {
    const user = userEvent.setup()
    const props = renderArmory()

    const machine = screen.getByLabelText("Active build machine")
    await user.click(within(machine).getByRole("button", { name: /Loadout 1/ }))

    const nameInput = screen.getByLabelText("Build name")
    await user.clear(nameInput)
    await user.type(nameInput, "  Fast   Fingers  {Enter}")

    const { savedLoadouts } = lastLoadoutState(props)
    const updatedLoadout = savedLoadouts.find((loadout) => loadout.id === "loadout_1")
    expect(updatedLoadout.name).toBe("Fast Fingers")
  })

  test("reset requires a two-step confirm and restores the starter loadout", async () => {
    const user = userEvent.setup()
    const props = renderArmory()

    await openStep(user, "Mods")
    await equipPart(user, screen.getByRole("button", { name: /^Anchor/ }))

    const machine = screen.getByLabelText("Active build machine")
    await user.click(within(machine).getByText("Build options"))
    await user.click(within(machine).getByRole("button", { name: "Strip to Factory Spec" }))
    expect(within(machine).getByText("Strip this build to factory spec?")).not.toBeNull()

    await user.click(within(machine).getByRole("button", { name: "Confirm Strip" }))

    const { savedLoadouts } = lastLoadoutState(props)
    const resetLoadout = savedLoadouts.find((loadout) => loadout.id === "loadout_1")
    expect(resetLoadout.name).toBe("Loadout 1")
    expect(resetLoadout.moduleIds.tempoCoreId).toBe("tempo_balanced")
    expect(resetLoadout.powerupIds).toEqual(["time_boost", "size_boost", "freeze_movement"])
  })

  test("?step=slot deep link aliases to the default passive stage", () => {
    renderArmory({ url: "/armory?step=slot" })

    expect(screen.getByRole("heading", { name: "Tempo Core" })).not.toBeNull()
    expect(screen.queryByLabelText("Build name")).toBeNull()
  })

  test("?step=hotbar&powerSlot=2 deep link opens the hotbar editor on key 2", () => {
    renderArmory({ url: "/armory?step=hotbar&powerSlot=2" })

    const hotbarTabs = screen.getByLabelText("Powerup keys")
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

describe("Armory scene shell", () => {
  test("renders as a full-bleed scene with a semantic h1, not a card page", () => {
    renderArmory()

    expect(screen.getByRole("heading", { level: 1, name: "Armory" })).not.toBeNull()
    expect(document.querySelector(".armoryScene")).not.toBeNull()
    expect(document.querySelector(".pageCenter")).toBeNull()
    expect(document.querySelector(".cardWide")).toBeNull()
  })

  test("scene lighting identity follows the active build", async () => {
    const user = userEvent.setup()
    renderArmory()

    const normalMode = DIFFICULTIES.find((mode) => mode.id === "normal")
    const expectedIdentityFor = (loadoutId) => buildLoadoutPresentation(
      normalMode,
      DEFAULT_SAVED_LOADOUTS.find((loadout) => loadout.id === loadoutId)
    ).identity.label.toLowerCase()

    const scene = document.querySelector(".armoryScene")
    expect(scene.dataset.identity).toBe(expectedIdentityFor("loadout_1"))

    const bayWall = getBayWall()
    await user.click(within(bayWall).getByRole("button", { name: /Loadout 3/ }))

    const glassCannonIdentity = expectedIdentityFor("loadout_3")
    expect(scene.dataset.identity).toBe(glassCannonIdentity)
    expect(glassCannonIdentity).not.toBe(expectedIdentityFor("loadout_1"))
  })
})

describe("Armory machine", () => {
  const normalMode = DIFFICULTIES.find((mode) => mode.id === "normal")

  function expectedTargetSize(loadout) {
    const { roundRules } = buildLoadoutPresentation(normalMode, loadout)
    return `${Math.round(roundRules.initialButtonSize * MACHINE_TARGET_SCALE)}px`
  }

  function getMachine() {
    return screen.getByLabelText("Active build machine")
  }

  test("shows the build's body: nameplate, module housings, and keyed rack", () => {
    renderArmory()

    const machine = getMachine()
    expect(within(machine).getByText("Loadout 1")).not.toBeNull()

    // Housings carry the installed module of each lane.
    expect(within(machine).getByText("Tempo Core")).not.toBeNull()
    expect(within(machine).getByText("Balanced Tempo")).not.toBeNull()
    expect(within(machine).getByText("Balanced Streak")).not.toBeNull()
    expect(within(machine).getByText("Balanced Rig")).not.toBeNull()

    // The rack mirrors the in-game tray: three keyed powerups with timing.
    const rack = within(machine).getByLabelText("Equipped powerups")
    expect(within(rack).getByText("Time +2s")).not.toBeNull()
    expect(within(rack).getByText("Grow +10")).not.toBeNull()
    expect(within(rack).getByText("Freeze 1s")).not.toBeNull()
    expect(rack.querySelectorAll(".armoryMachineRackKey")).toHaveLength(3)
  })

  test("target size tracks the build's computed initial button size", async () => {
    const user = userEvent.setup()
    renderArmory()

    const target = document.querySelector(".armoryMachineTarget")
    const allRounder = DEFAULT_SAVED_LOADOUTS.find((loadout) => loadout.id === "loadout_1")
    expect(target.style.width).toBe(expectedTargetSize(allRounder))

    // Installing Anchor (bigger targets) visibly grows the machine's target.
    await openStep(user, "Mods")
    await equipPart(user, screen.getByRole("button", { name: /^Anchor/ }))

    const anchorLoadout = {
      ...allRounder,
      moduleIds: { ...allRounder.moduleIds, tempoCoreId: "tempo_anchor" },
    }
    const anchorSize = expectedTargetSize(anchorLoadout)
    expect(target.style.width).toBe(anchorSize)
    expect(parseInt(anchorSize, 10)).toBeGreaterThan(
      parseInt(expectedTargetSize(allRounder), 10)
    )
  })

  test("default modules read as neutral plates; specialist modules light their lane", async () => {
    const user = userEvent.setup()
    renderArmory()

    // All-Rounder ships all-default: every housing is a neutral plate.
    expect(document.querySelectorAll(".armoryMachineHousing.isNeutral")).toHaveLength(3)

    await openStep(user, "Mods")
    await equipPart(user, screen.getByRole("button", { name: /^Anchor/ }))

    const tempoHousing = document.querySelector(".armoryMachineHousing.housing-tempoCore")
    expect(tempoHousing.className).not.toContain("isNeutral")
    expect(document.querySelectorAll(".armoryMachineHousing.isNeutral")).toHaveLength(2)
  })

  test("clicking a mod equips it on the selected rig node", () => {
    const props = renderArmory()
    const tempoHousing = document.querySelector(".armoryMachineHousing.housing-tempoCore")

    expect(tempoHousing.className).toContain("isSelected")
    expect(tempoHousing.dataset.moduleState).toBe("installed")
    expect(within(tempoHousing).getByText("Balanced Tempo")).not.toBeNull()

    fireEvent.click(getPartCard(/^Anchor/))

    expect(tempoHousing.dataset.moduleState).toBe("installed")
    expect(tempoHousing.className).not.toContain("isPreviewing")
    expect(within(tempoHousing).getByText("Anchor")).not.toBeNull()
    expect(props.onLoadoutStateChange).toHaveBeenCalledOnce()
  })

  test("the shop-equipped image skin dresses the target", () => {
    renderArmory({
      buttonSkinImageSrc: "/skins/cd.png",
      buttonSkinImageScale: 120,
    })

    const target = document.querySelector(".armoryMachineTarget")
    expect(target.className).toContain("hasImage")
    expect(target.style.backgroundImage).toContain("/skins/cd.png")
    expect(target.style.backgroundSize).toBe("120%")
  })

  test("a class-based skin applies its effect class when no image is set", () => {
    renderArmory({ buttonSkinClass: "skin-cd" })

    const target = document.querySelector(".armoryMachineTarget")
    expect(target.className).toContain("skin-cd")
    expect(target.className).not.toContain("hasImage")
  })
})

describe("Armory parts gallery (Phase 5)", () => {
  function getPartCard(name) {
    return screen
      .getAllByRole("button", { name })
      .find((button) => button.className.includes("armoryPartCard"))
  }

  test("instrument dials replace the review metric-card grid", () => {
    renderArmory()

    const instruments = screen.getByLabelText("Build instruments")
    expect(instruments.querySelectorAll(".armoryInstrument")).toHaveLength(5)
    expect(within(instruments).getByText("Aim Window")).not.toBeNull()
    expect(document.querySelector(".armoryMetricCard")).toBeNull()
    expect(within(instruments).getByText("100px")).not.toBeNull()
    expect(within(instruments).getByText(/% \/ hit/)).not.toBeNull()
  })

  test("part cards expose available, installed, and locked states", async () => {
    const user = userEvent.setup()
    const props = renderArmory({ playerLevel: 5 })

    await openStep(user, "Mods")
    const balancedCard = getPartCard(/^Balanced Tempo/)
    const anchorCard = getPartCard(/^Anchor/)
    const lockedCard = getPartCard(/Flashpoint/)

    expect(balancedCard.dataset.armoryState).toBe("installed")
    expect(balancedCard.querySelector('[data-armory-state="installed"] svg')).not.toBeNull()
    expect(anchorCard.dataset.armoryState).toBe("available")
    expect(lockedCard.dataset.armoryState).toBe("locked")

    await user.click(anchorCard)
    expect(props.onLoadoutStateChange).toHaveBeenCalledOnce()
  })

  test("keyboard: arrows rove and Enter equips immediately", async () => {
    const user = userEvent.setup()
    const props = renderArmory()

    await openStep(user, "Mods")
    const anchorCard = getPartCard(/^Anchor/)
    anchorCard.focus()
    expect(props.onLoadoutStateChange).not.toHaveBeenCalled()

    // Arrow keys rove focus along the shelf.
    await user.keyboard("{ArrowRight}")
    expect(document.activeElement.className).toContain("armoryPartCard")
    expect(document.activeElement).not.toBe(anchorCard)

    await user.keyboard("{ArrowLeft}")
    expect(document.activeElement).toBe(anchorCard)

    // Enter equips the focused mod immediately.
    await user.keyboard("{Enter}")
    expect(props.onLoadoutStateChange).toHaveBeenCalledOnce()

    const { savedLoadouts } = lastLoadoutState(props)
    const updatedLoadout = savedLoadouts.find((loadout) => loadout.id === "loadout_1")
    expect(updatedLoadout.moduleIds.tempoCoreId).toBe("tempo_anchor")
  })

  test("a bare tap or click equips immediately", async () => {
    const props = renderArmory()

    await openStep(userEvent.setup(), "Mods")
    props.onLoadoutStateChange.mockClear()

    const anchorCard = getPartCard(/^Anchor/)
    fireEvent.click(anchorCard)

    expect(props.onLoadoutStateChange).toHaveBeenCalledOnce()
    expect(screen.queryByRole("region", { name: "Preview actions" })).toBeNull()
    const { savedLoadouts } = lastLoadoutState(props)
    const updatedLoadout = savedLoadouts.find((loadout) => loadout.id === "loadout_1")
    expect(updatedLoadout.moduleIds.tempoCoreId).toBe("tempo_anchor")
  })

  test("clicking a machine housing opens that lane's parts gallery", async () => {
    const user = userEvent.setup()
    renderArmory()

    const machine = screen.getByLabelText("Active build machine")
    await user.click(within(machine).getByRole("button", { name: /Power Rig/ }))

    expect(screen.getByRole("heading", { name: "Power Rig" })).not.toBeNull()
    expect(screen.getByLabelText("Power Rig parts")).not.toBeNull()
  })
})

describe("Armory tool rack (Phase 6)", () => {
  async function openHotbar(user) {
    await openStep(user, "Powerups")
  }

  test("the cadence timeline marks each racked tool's charge streaks", async () => {
    const user = userEvent.setup()
    renderArmory()

    await openHotbar(user)

    const timeline = screen.getByLabelText("Charge cadence timeline")
    const rows = timeline.querySelectorAll(".armoryCadenceRow")
    expect(rows).toHaveLength(3)

    // All-Rounder in normal mode: Time +2s every 5 streak → charges at 5,10,15,20.
    const timeRow = within(timeline).getByText("Time +2s").closest(".armoryCadenceRow")
    expect(timeRow.querySelectorAll(".armoryCadenceTick")).toHaveLength(20)
    expect(timeRow.querySelectorAll(".armoryCadenceTick.isCharge")).toHaveLength(4)

    // Freeze 1s every 12 streak → a single charge marker inside the ruler.
    const freezeRow = within(timeline).getByText("Freeze 1s").closest(".armoryCadenceRow")
    expect(freezeRow.querySelectorAll(".armoryCadenceTick.isCharge")).toHaveLength(1)
  })

  test("hovering a power does not change the build or cadence", async () => {
    const user = userEvent.setup()
    const props = renderArmory({ playerLevel: 5 })

    await openHotbar(user)
    props.onLoadoutStateChange.mockClear()

    await user.hover(getPartCard(/Magnet Center/))

    const timeline = screen.getByLabelText("Charge cadence timeline")
    expect(timeline.querySelectorAll(".armoryCadenceRow.isPreview")).toHaveLength(0)
    expect(props.onLoadoutStateChange).not.toHaveBeenCalled()
  })

  test("dragging a rack key onto another swaps the two tools", async () => {
    const user = userEvent.setup()
    const props = renderArmory()

    await openHotbar(user)
    const tabs = screen.getByLabelText("Powerup keys")
    const keyButtons = tabs.querySelectorAll(".armoryHotbarButton")

    const dataTransfer = {
      store: {},
      setData(type, value) { this.store[type] = String(value) },
      getData(type) { return this.store[type] ?? "" },
    }

    // Drag key 1 (Time +2s) onto key 3 (Freeze 1s): the two swap.
    fireEvent.dragStart(keyButtons[0], { dataTransfer })
    fireEvent.drop(keyButtons[2], { dataTransfer })

    const { savedLoadouts } = lastLoadoutState(props)
    const updatedLoadout = savedLoadouts.find((loadout) => loadout.id === "loadout_1")
    expect(updatedLoadout.powerupIds).toEqual(["freeze_movement", "size_boost", "time_boost"])
  })
})

describe("Armory test range (Phase 7)", () => {
  test("the third step is a range launcher, not a readout", async () => {
    const user = userEvent.setup()
    renderArmory()

    await openStep(user, "Test Run")

    expect(screen.getByRole("button", { name: "Start test run" })).not.toBeNull()
    // The old review readout content is gone from the step (it lives in the spec sheet).
    expect(screen.queryByText("Strengths")).toBeNull()
    // Mode selection is integrated into the launcher.
    const modeRow = screen.getByLabelText("Game mode")
    expect(within(modeRow).getByText("Casual")).not.toBeNull()
    expect(within(modeRow).getByText("Ranked")).not.toBeNull()

    const readiness = screen.getByLabelText("Loadout 1 test run readiness")
    expect(readiness.querySelector('[data-armory-state="ready"]')).not.toBeNull()
    expect(within(readiness).getAllByText("3/3", { selector: "strong" })).toHaveLength(2)
    expect(within(readiness).getByText("Casual", { selector: "strong" })).not.toBeNull()
  })

  test("?step=review deep-links to the range launcher", () => {
    renderArmory({ url: "/armory?step=review" })

    expect(screen.getByRole("button", { name: "Start test run" })).not.toBeNull()
  })

  test("running the range opens an ephemeral, unrewarded live sample", async () => {
    const user = userEvent.setup()
    const props = renderArmory()

    await openStep(user, "Test Run")
    await user.click(screen.getByRole("button", { name: "Start test run" }))

    const range = screen.getByLabelText("Test range")
    expect(range).not.toBeNull()
    // It runs the real arena, and it writes nothing to persistence.
    expect(range.querySelector(".arena")).not.toBeNull()
    expect(props.onLoadoutStateChange).not.toHaveBeenCalled()

    // Exiting returns to the bench.
    await user.click(within(range).getByRole("button", { name: "Exit Range" }))
    expect(screen.queryByLabelText("Test range")).toBeNull()
  })

  test("the spec sheet carries the old review readout with exact values behind a toggle", async () => {
    const user = userEvent.setup()
    const props = renderArmory()

    const machine = screen.getByLabelText("Active build machine")
    await user.click(within(machine).getByRole("button", { name: "Spec Sheet" }))

    const specSheet = screen.getByLabelText("Build spec sheet")
    expect(within(specSheet).getByText("Strengths")).not.toBeNull()
    expect(within(specSheet).getByText("Tradeoffs")).not.toBeNull()

    // Exact values stay one calm toggle away.
    expect(within(specSheet).queryByText("Start size")).toBeNull()
    await user.click(within(specSheet).getByRole("button", { name: "Show Exact Values" }))
    expect(within(specSheet).getByText("Start size")).not.toBeNull()

    // Purely presentational: no persistence.
    expect(props.onLoadoutStateChange).not.toHaveBeenCalled()
  })
})

describe("Armory collection flow (Phase D2b)", () => {
  test("the unlock wall summarizes collection progress and distinguishes installed parts", async () => {
    const user = userEvent.setup()
    renderArmory({ playerLevel: 5 })

    await user.click(screen.getByRole("button", { name: "Unlock Wall" }))
    const wall = screen.getByRole("dialog", { name: "Unlock wall" })
    const progress = within(wall).getByRole("progressbar", { name: "Parts collected" })
    expect(Number(progress.getAttribute("aria-valuenow"))).toBeGreaterThan(0)
    expect(Number(progress.getAttribute("aria-valuenow"))).toBeLessThan(
      Number(progress.getAttribute("aria-valuemax"))
    )

    const installedPart = within(wall).getByText("Balanced Tempo").closest(".armoryUnlockWallItem")
    const collectedPart = within(wall).getByText("Anchor").closest(".armoryUnlockWallItem")
    const lockedPart = within(wall).getByText("Flashpoint").closest(".armoryUnlockWallItem")
    expect(installedPart.dataset.armoryState).toBe("installed")
    expect(collectedPart.dataset.armoryState).toBe("owned")
    expect(lockedPart.dataset.armoryState).toBe("locked")
  })

  test("an unlock batch is marked seen when presented and can be dismissed in one action", async () => {
    const user = userEvent.setup()
    const onSeenUnlockPartIdsChange = vi.fn()
    renderArmory({
      playerLevel: 5,
      seenUnlockPartIds: [],
      onSeenUnlockPartIdsChange,
    })

    const ceremony = screen.getByRole("dialog", { name: "Part unlocked" })
    expect(within(ceremony).getByText(/Collection drop/)).not.toBeNull()
    expect(within(ceremony).getByText("Added to collection")).not.toBeNull()
    expect(onSeenUnlockPartIdsChange).toHaveBeenCalledTimes(1)
    expect(onSeenUnlockPartIdsChange.mock.calls[0][0].length).toBeGreaterThan(1)

    await user.click(within(ceremony).getByRole("button", { name: /Keep all .* parts in collection/ }))

    expect(screen.queryByRole("dialog", { name: "Part unlocked" })).toBeNull()
    expect(onSeenUnlockPartIdsChange).toHaveBeenCalledTimes(1)
  })
})

describe("Armory bay wall", () => {
  const normalMode = DIFFICULTIES.find((mode) => mode.id === "normal")

  function expectedMiniTargetSize(loadout) {
    const { roundRules } = buildLoadoutPresentation(normalMode, loadout)
    return `${Math.round(roundRules.initialButtonSize * BAY_TARGET_SCALE)}px`
  }

  test("bay mini targets scale with each saved build", () => {
    renderArmory()

    const bayWall = getBayWall()
    const miniTargets = bayWall.querySelectorAll(".armoryBayMiniTarget")
    expect(miniTargets).toHaveLength(3)

    DEFAULT_SAVED_LOADOUTS.forEach((loadout, index) => {
      expect(miniTargets[index].style.width).toBe(expectedMiniTargetSize(loadout))
    })
  })

  test("inactive bays only offer comparison", () => {
    renderArmory()

    const bayWall = getBayWall()
    expect(within(bayWall).getAllByRole("button", { name: "Compare with active" })).toHaveLength(2)
    expect(within(bayWall).queryByRole("button", { name: "Copy active build here" })).toBeNull()
  })
})

describe("Armory compare bench (Phase 8)", () => {
  test("comparing a bay against the active build shows both machines and paired instruments", async () => {
    const user = userEvent.setup()
    renderArmory()

    const bayWall = getBayWall()
    const otherLoadout = DEFAULT_SAVED_LOADOUTS.find((loadout) => loadout.id !== "loadout_1")
    await user.click(within(bayWall).getAllByRole("button", { name: "Compare with active" })[0])

    const bench = screen.getByRole("dialog", { name: "Compare bench" })
    expect(within(bench).getAllByText("Loadout 1").length).toBeGreaterThan(0)
    expect(within(bench).getAllByText(otherLoadout.name).length).toBeGreaterThan(0)
    expect(bench.querySelectorAll(".armoryCompareMachine")).toHaveLength(2)
    expect(within(bench).getByLabelText("Build instruments").querySelectorAll(".armoryInstrument").length).toBeGreaterThan(0)

    // Purely derived: no persistence, no history writes.
    expect(screen.queryByText("Loadout")).toBeNull()
  })

  test("closing the compare bench hides it", async () => {
    const user = userEvent.setup()
    renderArmory()

    const bayWall = getBayWall()
    await user.click(within(bayWall).getAllByRole("button", { name: "Compare with active" })[0])
    expect(screen.getByRole("dialog", { name: "Compare bench" })).not.toBeNull()

    await user.click(screen.getByRole("button", { name: "Close" }))
    expect(screen.queryByRole("dialog", { name: "Compare bench" })).toBeNull()
  })

  test("Compare Modes opens the mode matrix with one column per mode", async () => {
    const user = userEvent.setup()
    renderArmory()

    await user.click(screen.getByRole("button", { name: "Compare Modes" }))

    const bench = screen.getByRole("dialog", { name: "Compare bench" })
    expect(within(bench).getByRole("tab", { name: "Mode Matrix", selected: true })).not.toBeNull()

    const manifest = within(bench).getByLabelText("Mode manifest")
    expect(manifest.querySelectorAll(".armoryModeManifestColumn")).toHaveLength(DIFFICULTIES.length)
    DIFFICULTIES.forEach((mode) => {
      expect(within(manifest).getByText(mode.label)).not.toBeNull()
    })
  })

  test("switching bays closes an open compare bench", async () => {
    const user = userEvent.setup()
    renderArmory()

    await user.click(screen.getByRole("button", { name: "Compare Modes" }))
    expect(screen.getByRole("dialog", { name: "Compare bench" })).not.toBeNull()

    const otherIndex = DEFAULT_SAVED_LOADOUTS.findIndex((loadout) => loadout.id !== "loadout_1")
    const bayWall = getBayWall()
    const baySelectButtons = bayWall.querySelectorAll(".armoryBaySelect")
    await user.click(baySelectButtons[otherIndex])

    expect(screen.queryByRole("dialog", { name: "Compare bench" })).toBeNull()
  })
})
