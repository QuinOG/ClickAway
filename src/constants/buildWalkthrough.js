export const BUILD_WALKTHROUGH_STATUS = {
  NOT_STARTED: "not_started",
  DISMISSED: "dismissed",
  PRACTICE_PENDING: "practice_pending",
  CASUAL_PENDING: "casual_pending",
  COMPLETED: "completed",
}

const VALID_BUILD_WALKTHROUGH_STATUSES = new Set(Object.values(BUILD_WALKTHROUGH_STATUS))

export function normalizeBuildWalkthrough(
  value = {},
  fallbackStatus = BUILD_WALKTHROUGH_STATUS.DISMISSED
) {
  const requestedStatus = typeof value === "string"
    ? value
    : value?.status
  const normalizedFallbackStatus = VALID_BUILD_WALKTHROUGH_STATUSES.has(fallbackStatus)
    ? fallbackStatus
    : BUILD_WALKTHROUGH_STATUS.DISMISSED
  const normalizedStatus = VALID_BUILD_WALKTHROUGH_STATUSES.has(requestedStatus)
    ? requestedStatus
    : normalizedFallbackStatus

  return {
    status: normalizedStatus,
  }
}

export function shouldShowArmoryOnboardingBadge(status) {
  return status === BUILD_WALKTHROUGH_STATUS.NOT_STARTED
}

export function shouldAutoStartArmoryWalkthrough(status) {
  return status === BUILD_WALKTHROUGH_STATUS.NOT_STARTED
}
