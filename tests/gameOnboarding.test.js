import test from "node:test"
import assert from "node:assert/strict"

import {
  BUILD_WALKTHROUGH_STATUS,
  normalizeBuildWalkthrough,
  shouldAutoStartArmoryWalkthrough,
  shouldShowArmoryOnboardingBadge,
} from "../src/constants/buildWalkthrough.js"
import {
  getGameOnboardingModeId,
  getGameOnboardingStep,
  getNextOnboardingStatusAfterRound,
  isGameOnboardingStatus,
} from "../src/constants/gameOnboarding.js"
import { WALKTHROUGH_STEPS } from "../src/features/armory/armoryConstants.js"

test("normalizeBuildWalkthrough accepts multi-step onboarding statuses", () => {
  assert.deepEqual(
    normalizeBuildWalkthrough({ status: BUILD_WALKTHROUGH_STATUS.PRACTICE_PENDING }),
    { status: BUILD_WALKTHROUGH_STATUS.PRACTICE_PENDING }
  )
  assert.deepEqual(
    normalizeBuildWalkthrough({ status: BUILD_WALKTHROUGH_STATUS.CASUAL_PENDING }),
    { status: BUILD_WALKTHROUGH_STATUS.CASUAL_PENDING }
  )
})

test("game onboarding maps statuses to guided modes", () => {
  assert.equal(
    getGameOnboardingModeId(BUILD_WALKTHROUGH_STATUS.PRACTICE_PENDING),
    "easy"
  )
  assert.equal(
    getGameOnboardingModeId(BUILD_WALKTHROUGH_STATUS.CASUAL_PENDING),
    "normal"
  )
  assert.equal(getGameOnboardingModeId(BUILD_WALKTHROUGH_STATUS.COMPLETED), null)
})

test("game onboarding advances only after the expected mode", () => {
  assert.equal(
    getNextOnboardingStatusAfterRound(BUILD_WALKTHROUGH_STATUS.PRACTICE_PENDING, "easy"),
    BUILD_WALKTHROUGH_STATUS.CASUAL_PENDING
  )
  assert.equal(
    getNextOnboardingStatusAfterRound(BUILD_WALKTHROUGH_STATUS.PRACTICE_PENDING, "normal"),
    BUILD_WALKTHROUGH_STATUS.PRACTICE_PENDING
  )
  assert.equal(
    getNextOnboardingStatusAfterRound(BUILD_WALKTHROUGH_STATUS.CASUAL_PENDING, "normal"),
    BUILD_WALKTHROUGH_STATUS.COMPLETED
  )
})

test("game onboarding step copy is available for active statuses", () => {
  const practiceStep = getGameOnboardingStep(BUILD_WALKTHROUGH_STATUS.PRACTICE_PENDING)
  const casualStep = getGameOnboardingStep(BUILD_WALKTHROUGH_STATUS.CASUAL_PENDING)

  assert.equal(practiceStep.stepNumber, 2)
  assert.equal(casualStep.stepNumber, 3)
  assert.ok(isGameOnboardingStatus(BUILD_WALKTHROUGH_STATUS.PRACTICE_PENDING))
  assert.ok(!isGameOnboardingStatus(BUILD_WALKTHROUGH_STATUS.NOT_STARTED))
})

test("armory badge only shows before the armory tour starts", () => {
  assert.equal(shouldShowArmoryOnboardingBadge(BUILD_WALKTHROUGH_STATUS.NOT_STARTED), true)
  assert.equal(shouldShowArmoryOnboardingBadge(BUILD_WALKTHROUGH_STATUS.PRACTICE_PENDING), false)
})

test("Phase 12 re-onboarding: walkthrough is 5 fewer, stronger steps ending at the range", () => {
  assert.equal(WALKTHROUGH_STEPS.length, 5)
  assert.deepEqual(
    WALKTHROUGH_STEPS.map((step) => step.id),
    ["welcome", "machine", "module", "rack", "range"]
  )
  assert.equal(WALKTHROUGH_STEPS.at(-1).armoryStepId, "review")
})

test("legacy walkthrough statuses never re-trigger auto-start", () => {
  assert.equal(shouldAutoStartArmoryWalkthrough(BUILD_WALKTHROUGH_STATUS.NOT_STARTED), true)
  for (const status of [
    BUILD_WALKTHROUGH_STATUS.DISMISSED,
    BUILD_WALKTHROUGH_STATUS.PRACTICE_PENDING,
    BUILD_WALKTHROUGH_STATUS.CASUAL_PENDING,
    BUILD_WALKTHROUGH_STATUS.COMPLETED,
  ]) {
    assert.equal(shouldAutoStartArmoryWalkthrough(status), false)
  }
})
