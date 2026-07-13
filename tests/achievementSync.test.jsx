import { render, waitFor } from "@testing-library/react"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { describe, expect, test, vi } from "vitest"

import { FeedbackPreferencesContext } from "../src/app/feedbackPreferencesContextValue.js"
import { useAchievementSync } from "../src/app/useAchievementSync.js"
import { FEEDBACK_EVENTS } from "../src/constants/feedbackEvents.js"

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn() },
}))

function AchievementSyncHarness({ sessionKey, earnedIds, serverIds = null }) {
  const [unlockedIds, setUnlockedIds] = useState(serverIds ?? [])

  useEffect(() => {
    if (serverIds !== null) setUnlockedIds(serverIds)
  }, [serverIds])

  useAchievementSync({
    unlockedAchievementIds: unlockedIds,
    setUnlockedAchievementIds: setUnlockedIds,
    unlockedAchievementIdsFromStats: earnedIds,
    sessionKey,
  })

  return <output aria-label="unlocked achievements">{unlockedIds.join(",")}</output>
}

describe("achievement session cohesion", () => {
  test("reconciles restored achievements without stacking historical toasts", async () => {
    const emitFeedback = vi.fn()
    const { getByLabelText } = render(
      <FeedbackPreferencesContext.Provider value={{ emitFeedback }}>
        <AchievementSyncHarness
          sessionKey="player-7"
          earnedIds={["easy-rounds-1", "easy-rounds-10"]}
        />
      </FeedbackPreferencesContext.Provider>
    )

    await waitFor(() => expect(getByLabelText("unlocked achievements").textContent)
      .toBe("easy-rounds-1,easy-rounds-10"))
    expect(toast.success).not.toHaveBeenCalled()
    expect(emitFeedback).not.toHaveBeenCalled()
  })

  test("announces an achievement earned after the restored baseline", async () => {
    const emitFeedback = vi.fn()
    const { getByLabelText, rerender } = render(
      <FeedbackPreferencesContext.Provider value={{ emitFeedback }}>
        <AchievementSyncHarness sessionKey="player-7" earnedIds={["easy-rounds-1"]} />
      </FeedbackPreferencesContext.Provider>
    )
    await waitFor(() => expect(getByLabelText("unlocked achievements").textContent)
      .toBe("easy-rounds-1"))

    rerender(
      <FeedbackPreferencesContext.Provider value={{ emitFeedback }}>
        <AchievementSyncHarness
          sessionKey="player-7"
          earnedIds={["easy-rounds-1", "easy-rounds-10"]}
        />
      </FeedbackPreferencesContext.Provider>
    )

    await waitFor(() => expect(toast.success)
      .toHaveBeenCalledWith("Achievement unlocked: Session Builder", { duration: 4000 }))
    expect(emitFeedback).toHaveBeenCalledWith(FEEDBACK_EVENTS.ACHIEVEMENT, {
      eventId: "achievement-easy-rounds-10",
      scope: "progression",
    })
  })

  test("does not repeat restored unlocks after an unrelated server refresh", async () => {
    const emitFeedback = vi.fn()
    const { getByLabelText, rerender } = render(
      <FeedbackPreferencesContext.Provider value={{ emitFeedback }}>
        <AchievementSyncHarness sessionKey="player-7" earnedIds={["easy-rounds-1"]} />
      </FeedbackPreferencesContext.Provider>
    )
    await waitFor(() => expect(getByLabelText("unlocked achievements").textContent)
      .toBe("easy-rounds-1"))

    rerender(
      <FeedbackPreferencesContext.Provider value={{ emitFeedback }}>
        <AchievementSyncHarness
          sessionKey="player-7"
          earnedIds={["easy-rounds-1"]}
          serverIds={[]}
        />
      </FeedbackPreferencesContext.Provider>
    )
    await waitFor(() => expect(getByLabelText("unlocked achievements").textContent)
      .toBe("easy-rounds-1"))

    expect(toast.success).not.toHaveBeenCalled()
    expect(emitFeedback).not.toHaveBeenCalled()
  })
})
