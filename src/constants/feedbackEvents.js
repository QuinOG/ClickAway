export const FEEDBACK_EVENTS = Object.freeze({
  NAVIGATE: "navigation.commit",
  ACTION_CONFIRM: "action.confirm",
  ACTION_DENY: "action.deny",
  COUNTDOWN_TICK: "round.countdown.tick",
  COUNTDOWN_GO: "round.countdown.go",
  HIT: "round.hit",
  MISS: "round.miss",
  GUARDED_MISS: "round.guard",
  STREAK_MILESTONE: "round.streak.milestone",
  POWER_READY: "power.ready",
  POWER_ACTIVATE: "power.activate",
  TIME_WARNING: "round.time.low",
  REWARD: "reward.granted",
  RANK_CHANGE: "rank.changed",
  TEST: "settings.test",
})

export const FEEDBACK_EVENT_NAMES = Object.freeze(Object.values(FEEDBACK_EVENTS))
