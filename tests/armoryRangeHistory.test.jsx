import { act, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { buildRoundRules, DEFAULT_SAVED_LOADOUTS } from "../src/constants/buildcraft.js"
import { DIFFICULTIES } from "../src/constants/gameModesConfig.js"
import ArmoryTestRange from "../src/features/armory/components/ArmoryTestRange.jsx"

afterEach(() => vi.useRealTimers())

function finishSample() {
  act(() => vi.advanceTimersByTime(3000))
  for (let i = 0; i < 11; i += 1) act(() => vi.advanceTimersByTime(1000))
}

test("renaming a bay preserves its baseline and does not count as a part swap", () => {
  vi.useFakeTimers()
  const loadout = { ...DEFAULT_SAVED_LOADOUTS[0], id: "rename_history_test" }
  const props = { isOpen: true, modeLabel: "Casual", loadoutName: loadout.name,
    roundRules: buildRoundRules(DIFFICULTIES[1], loadout), runToken: 1 }
  const { rerender } = render(<ArmoryTestRange {...props} />)
  finishSample()
  expect(screen.getByText("First sample")).not.toBeNull()
  const renamed = { ...loadout, name: "Renamed bay" }
  rerender(<ArmoryTestRange {...props} loadoutName={renamed.name}
    roundRules={buildRoundRules(DIFFICULTIES[1], renamed)} runToken={2} />)
  finishSample()
  expect(screen.getByText("Repeat: same parts")).not.toBeNull()
  expect(screen.getByText(/Test complete .* Run 2/)).not.toBeNull()
})
