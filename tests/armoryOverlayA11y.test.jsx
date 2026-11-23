import { useState } from "react"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { DEFAULT_SAVED_LOADOUTS } from "../src/constants/buildcraft.js"
import { buildLoadoutPresentation } from "../src/constants/buildcraftPresentation.js"
import { DIFFICULTIES } from "../src/constants/gameModesConfig.js"
import ArmoryCompareBench from "../src/features/armory/components/ArmoryCompareBench.jsx"
import ArmoryUnlockWall from "../src/features/armory/components/ArmoryUnlockWall.jsx"
import ArmoryWalkthroughOverlay from "../src/features/armory/components/ArmoryWalkthroughOverlay.jsx"

const loadout = DEFAULT_SAVED_LOADOUTS[0]
const presentation = buildLoadoutPresentation(DIFFICULTIES.find((mode) => mode.id === "normal"), loadout)

function CompareHarness() {
  const [view, setView] = useState("bay")
  return <ArmoryCompareBench isOpen onClose={() => {}} view={view} onChangeView={setView}
    activeLoadout={loadout} ghostLoadout={{ ...loadout, id: "copied" }}
    activePresentation={presentation} ghostPresentation={presentation} />
}

function expectSelected(tabs, index) {
  tabs.forEach((tab, tabIndex) => {
    expect(tab.tabIndex).toBe(tabIndex === index ? 0 : -1)
    expect(tab.getAttribute("aria-selected")).toBe(String(tabIndex === index))
  })
  const panel = screen.getByRole("tabpanel")
  expect(panel.getAttribute("aria-labelledby")).toBe(tabs[index].id)
  expect(tabs[index].getAttribute("aria-controls")).toBe(panel.id)
}

function exerciseTabs() {
  const tabs = within(screen.getByRole("tablist")).getAllByRole("tab")
  expectSelected(tabs, 0)
  tabs[0].focus()
  const navigate = (key, index) => {
    fireEvent.keyDown(document.activeElement, { key })
    expect(document.activeElement).toBe(tabs[index])
    expectSelected(tabs, index)
  }
  navigate("ArrowRight", 1)
  navigate("ArrowLeft", 0)
  navigate("ArrowLeft", tabs.length - 1)
  navigate("ArrowRight", 0)
  navigate("End", tabs.length - 1)
  navigate("Home", 0)
  fireEvent.click(tabs[1])
  expectSelected(tabs, 1)
}

describe("Armory overlay accessibility", () => {
  test("same-named comparison bays have stable keys and keyboard tabs", () => {
    const errors = vi.spyOn(console, "error")
    render(<CompareHarness />)
    expect(document.querySelectorAll(".armoryCompareSpecColumnTitle")).toHaveLength(2)
    exerciseTabs()
    expect(errors.mock.calls.filter((args) => args.some((arg) => /same key|unique.*key/i.test(String(arg))))).toEqual([])
  })

  test("unlock wall tabs move selection, focus, and panel labelling", () => {
    render(<ArmoryUnlockWall isOpen onClose={() => {}} playerLevel={5} activeLoadout={loadout} />)
    exerciseTabs()
  })

  test("walkthrough handles Escape only while open and removes its listener", () => {
    const onSkip = vi.fn()
    const step = { id: "welcome", title: "Welcome", instruction: "Explore the Armory" }
    const { rerender, unmount } = render(<ArmoryWalkthroughOverlay step={null} onSkip={onSkip} />)
    fireEvent.keyDown(document, { key: "Escape" })
    expect(onSkip).not.toHaveBeenCalled()
    rerender(<ArmoryWalkthroughOverlay step={step} onSkip={onSkip} />)
    fireEvent.keyDown(document, { key: "Enter" })
    const prevented = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
    prevented.preventDefault()
    fireEvent(document, prevented)
    expect(onSkip).not.toHaveBeenCalled()
    expect(fireEvent.keyDown(document, { key: "Escape" })).toBe(false)
    expect(onSkip).toHaveBeenCalledTimes(1)
    rerender(<ArmoryWalkthroughOverlay step={null} onSkip={onSkip} />)
    fireEvent.keyDown(document, { key: "Escape" })
    expect(onSkip).toHaveBeenCalledTimes(1)
    rerender(<ArmoryWalkthroughOverlay step={step} onSkip={onSkip} />)
    unmount()
    fireEvent.keyDown(document, { key: "Escape" })
    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  test("spotlight walkthrough leaves underlying controls focusable", () => {
    render(<>
      <button type="button">Spotlight control</button>
      <ArmoryWalkthroughOverlay step={{ id: "module", title: "Pick a module" }}
        spotlightRect={{ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 }} />
    </>)
    const control = screen.getByRole("button", { name: "Spotlight control" })
    control.focus()
    expect(document.activeElement).toBe(control)
  })

  test("Escape closes a topmost overlay modal without dismissing the walkthrough underneath", () => {
    const onSkip = vi.fn()
    const onCloseModal = vi.fn()
    const { rerender } = render(<>
      <ArmoryWalkthroughOverlay step={{ id: "welcome", title: "Welcome" }} onSkip={onSkip} />
      <ArmoryUnlockWall isOpen={false} onClose={onCloseModal} playerLevel={5} activeLoadout={loadout} />
    </>)
    rerender(<>
      <ArmoryWalkthroughOverlay step={{ id: "welcome", title: "Welcome" }} onSkip={onSkip} />
      <ArmoryUnlockWall isOpen onClose={onCloseModal} playerLevel={5} activeLoadout={loadout} />
    </>)
    fireEvent.keyDown(document, { key: "Escape" })
    expect(onCloseModal).toHaveBeenCalledTimes(1)
    expect(onSkip).not.toHaveBeenCalled()
  })
})
