import { fireEvent, render, screen, within } from "@testing-library/react"
import { expect, test, vi } from "vitest"
import ArmoryUnlockCeremony from "../src/features/armory/components/ArmoryUnlockCeremony.jsx"
import { getUnseenUnlockedParts } from "../src/utils/unlockWallUtils.js"

test("collection drop contains keyboard focus and Escape dismisses it", () => {
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([{ width: 100, height: 30 }])
  const parts = getUnseenUnlockedParts(5)
  const onSkipAll = vi.fn()
  render(<><button>Workshop control</button><ArmoryUnlockCeremony part={parts[0]} parts={parts} remainingCount={parts.length} onSkipAll={onSkipAll} /></>)
  const dialog = screen.getByRole("dialog", { name: "Part unlocked" })
  const buttons = within(dialog).getAllByRole("button")
  expect(document.activeElement).toBe(buttons[0])
  buttons.at(-1).focus()
  fireEvent.keyDown(document.activeElement, { key: "Tab" })
  expect(document.activeElement).toBe(buttons[0])
  screen.getByRole("button", { name: "Workshop control" }).focus()
  expect(document.activeElement).toBe(buttons[0])
  fireEvent.keyDown(document.activeElement, { key: "Escape" })
  expect(onSkipAll).toHaveBeenCalledTimes(1)
})
