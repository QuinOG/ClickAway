import { act, renderHook } from "@testing-library/react"
import { expect, test } from "vitest"

import { useAppPlayerState } from "../src/app/useAppPlayerState.js"
import { DEFAULT_EQUIPPED_IDS } from "../src/constants/clientStorageKeysAndEquippedDefaults.js"

test("an authenticated session with null progress preserves identity and applies defaults", () => {
  const { result } = renderHook(() => useAppPlayerState())
  act(() => {
    result.current.applyProgress({ coins: 100, levelXp: 500, ownedItemIds: ["skin_neon"] })
  })
  act(() => {
    result.current.applyAuthenticatedSession({ user: { id: 1, username: "alice" }, progress: null })
  })
  expect(result.current.playerUserId).toBe("1")
  expect(result.current.playerUsername).toBe("alice")
  expect(result.current.coins).toBe(0)
  expect(result.current.levelXp).toBe(0)
  expect(result.current.ownedItemIds).toEqual([])
  expect(result.current.equippedButtonSkinId).toBe(DEFAULT_EQUIPPED_IDS.buttonSkin)
})

test.each([null, 7, "invalid"])("progress and session entry points safely normalize %s", (value) => {
  const { result } = renderHook(() => useAppPlayerState())
  for (const method of ["applyProgress", "applyPlayerState", "applyAuthenticatedSession"]) {
    let defaults
    act(() => { defaults = result.current[method]({}) })
    act(() => { result.current.applyProgress({ coins: 100, ownedItemIds: ["skin_neon"] }) })
    let normalized
    act(() => { normalized = result.current[method](value) })
    expect(normalized).toEqual(defaults)
    expect(result.current.coins).toBe(0)
    expect(result.current.ownedItemIds).toEqual([])
  }
})

test("null nested player state safely applies defaults", () => {
  const { result } = renderHook(() => useAppPlayerState())
  act(() => { result.current.applyPlayerState({ user: { id: 1, username: "alice" }, state: null }) })
  expect(result.current.coins).toBe(0)
  expect(result.current.playerUsername).toBe("alice")
})
