import { DIFFICULTY_IDS } from "./gameModesConfig.js"
import { BUILD_WALKTHROUGH_STATUS } from "./buildWalkthrough.js"

export const GAME_ONBOARDING_FLOW = [
  {
    status: BUILD_WALKTHROUGH_STATUS.NOT_STARTED,
    label: "Armory tour",
    location: "armory",
  },
  {
    status: BUILD_WALKTHROUGH_STATUS.PRACTICE_PENDING,
    label: "Practice round",
    location: "game",
    modeId: DIFFICULTY_IDS.EASY,
    stepNumber: 2,
    title: "Try your first Practice round",
    instruction: "Practice has no timer pressure or rank stakes. Use it to learn the click rhythm and hotbar keys.",
    note: "Hit the target, watch it shrink and move, and try a powerup when a charge appears.",
    startLabel: "Start Practice",
  },
  {
    status: BUILD_WALKTHROUGH_STATUS.CASUAL_PENDING,
    label: "Casual round",
    location: "game",
    modeId: DIFFICULTY_IDS.NORMAL,
    stepNumber: 3,
    title: "Play your first Casual round",
    instruction: "Casual turns on the timer, coins, and XP. This is the standard progression loop before Ranked.",
    note: "Same build, more pressure. Finish the round to complete onboarding.",
    startLabel: "Start Casual",
  },
  {
    status: BUILD_WALKTHROUGH_STATUS.COMPLETED,
    label: "Onboarding complete",
    location: "done",
  },
]

const GAME_ONBOARDING_STEPS_BY_STATUS = Object.fromEntries(
  GAME_ONBOARDING_FLOW
    .filter((step) => step.location === "game")
    .map((step) => [step.status, step])
)

export function isGameOnboardingStatus(status) {
  return status === BUILD_WALKTHROUGH_STATUS.PRACTICE_PENDING
    || status === BUILD_WALKTHROUGH_STATUS.CASUAL_PENDING
}

export function getGameOnboardingStep(status) {
  return GAME_ONBOARDING_STEPS_BY_STATUS[status] ?? null
}

export function getGameOnboardingModeId(status) {
  return getGameOnboardingStep(status)?.modeId ?? null
}

export function getNextOnboardingStatusAfterRound(status, modeId) {
  if (status === BUILD_WALKTHROUGH_STATUS.PRACTICE_PENDING && modeId === DIFFICULTY_IDS.EASY) {
    return BUILD_WALKTHROUGH_STATUS.CASUAL_PENDING
  }

  if (status === BUILD_WALKTHROUGH_STATUS.CASUAL_PENDING && modeId === DIFFICULTY_IDS.NORMAL) {
    return BUILD_WALKTHROUGH_STATUS.COMPLETED
  }

  return status
}
