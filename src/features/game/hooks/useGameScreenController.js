import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  buildLoadoutSnapshot,
  buildRoundRules,
  getLoadoutById,
} from "../../../constants/buildcraft.js"
import { buildLoadoutPresentation } from "../../../constants/buildcraftPresentation.js"
import {
  DEFAULT_DIFFICULTY_ID as DEFAULT_MODE_ID,
  DIFFICULTIES as MODES,
  DIFFICULTY_IDS,
  getDifficultyById as getModeById,
} from "../../../constants/gameModesConfig.js"
import {
  buildDrillMode,
  getTrainingDrillById,
  TRAINING_DRILLS,
} from "../../../constants/drillConfig.js"
import {
  FEEDBACK_LIFETIME_MS,
  READY_COUNTDOWN_START,
  ROUND_END_SETTLE_MS,
  ROUND_PHASE,
  SHAKE_DURATION_MS,
  TIMER_TICK_MS,
} from "../../../constants/gameConstants.js"
import { FEEDBACK_EVENTS } from "../../../constants/feedbackEvents.js"
import { buildRankedPreflight } from "../../../utils/rankUtils.js"
import {
  formatAccuracy,
  getButtonLabel,
  getButtonLabelFontSize,
  getCenteredPosition,
  getComboMultiplier,
  getStreakAtmosphereTier,
} from "../../../utils/gameMath.js"
import { createRoundSimulation, getMaxClickEvents, MIN_CLICK_INTERVAL_MS } from "../../../game/engine/roundEngine.js"
import {
  createGeometrySimulation,
  FREEZE_MOVEMENT_DURATION_MS,
  MAGNET_CENTER_FREEZE_MS,
  SIZE_LOCK_DURATION_MS,
} from "../../../game/engine/roundGeometry.js"
import { createRandomSeed, createSeededRng } from "../../../game/engine/seededRng.js"
import { computeGhostScoreAtElapsed, isValidGhostReplay } from "../../../utils/replayUtils.js"
import { requestRoundStart } from "../../../services/clickAwayHttpApiClient.js"
import { calculateRoundXp } from "../../../utils/progressionUtils.js"
import {
  applyRankedMatchResult,
  calculatePlacementMatchScore,
  calculateRoundRankDelta,
} from "../../../utils/rankUtils.js"
import { shouldShowArmoryOnboardingBadge } from "../../../constants/buildWalkthrough.js"
import { hasUnseenUnlockedParts } from "../../../utils/unlockWallUtils.js"
import {
  getGameOnboardingStep,
  getNextOnboardingStatusAfterRound,
  isGameOnboardingStatus,
} from "../../../constants/gameOnboarding.js"
import { calculateRoundCoins } from "../../../utils/roundRewards.js"
import {
  evaluateDrillMetric,
} from "../../../utils/drillStatsUtils.js"
import { getWarmupSuggestion } from "../../../utils/trainingRecommendations.js"
import { buildWorkshopNote, selectLoadoutStatsEntry } from "../../../utils/armoryFieldDataUtils.js"

// The bottom strip of the arena is reserved for the powerup tray's ready
// callouts, so targets never spawn (even partly) behind them. Spawning,
// centring and the dimensions reported for server replay all use this same
// playfield so the seeded simulation stays in step.
const PLAYFIELD_BOTTOM_RESERVE_PX = 52

function getPlayfieldRect(arenaElement) {
  const arenaRect = arenaElement.getBoundingClientRect()
  return { width: arenaRect.width, height: Math.max(0, arenaRect.height - PLAYFIELD_BOTTOM_RESERVE_PX) }
}

function getArenaClickCoordinates(event, arenaElement) {
  if (!arenaElement) return null

  // Measured from inside the arena's border (where the target is positioned),
  // and kept to two decimals: rounding to whole pixels could push an edge hit
  // outside the target in the server's replay.
  const arenaRect = arenaElement.getBoundingClientRect()
  const toPlayfield = (value) => Math.round(value * 100) / 100
  return {
    x: toPlayfield(event.clientX - arenaRect.left - (arenaElement.clientLeft || 0)),
    y: toPlayfield(event.clientY - arenaRect.top - (arenaElement.clientTop || 0)),
  }
}

function buildGameScreenClassName(atmosphereTier, isShakeActive) {
  const shakeClassName = isShakeActive ? "isShaking" : ""
  return `gameScreen streakTier${atmosphereTier} ${shakeClassName}`.trim()
}

function buildButtonStyle(buttonSize, buttonPosition) {
  return {
    width: `${buttonSize}px`,
    height: `${buttonSize}px`,
    left: `${buttonPosition.x}px`,
    top: `${buttonPosition.y}px`,
  }
}

function buildClickFeedbackId() {
  return `${Date.now()}-${Math.random()}`
}

// Capped so long combos cannot stack a cloud of popups around the target.
const MAX_TRANSIENT_FEEDBACK_ITEMS = 6

function isStreakMilestone(streak) {
  return streak === 5 || (streak >= 10 && streak % 10 === 0)
}

function buildPowerupChargeState(equippedPowerups = [], startingCharges = 0) {
  return equippedPowerups.reduce((chargesById, powerup) => {
    chargesById[powerup.id] = Math.max(0, Number(startingCharges) || 0)
    return chargesById
  }, {})
}

function getResolvedLoadout(savedLoadouts = [], activeLoadoutId = "", activeLoadout = null) {
  return activeLoadout ?? getLoadoutById(savedLoadouts, activeLoadoutId)
}


function countClickEvents(events) {
  let count = 0
  for (const event of events) {
    if (event.type === "hit" || event.type === "miss") count += 1
  }
  return count
}

// A second click inside MIN_CLICK_INTERVAL_MS (a double-click or bounce) is
// ignored, matching the server, which would otherwise reject the whole round.
function isTooSoonAfterLastClick(events, eventTimeMs) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (event.type === "hit" || event.type === "miss") {
      return eventTimeMs - event.t < MIN_CLICK_INTERVAL_MS
    }
  }
  return false
}

export function useGameScreenController({
  onRoundComplete,
  selectedModeId = DEFAULT_MODE_ID,
  onModeChange,
  playerLevel = 1,
  playerCoins = 0,
  playerXpIntoLevel = 0,
  playerXpToNextLevel = 0,
  playerRankMmr = 0,
  playerRankLabel = "Unranked",
  playerRankProgress = null,
  playerRankedState = {},
  playerHasRankedHistory = false,
  playerRecentRounds = [],
  playerBestScore = 0,
  lifetimeStats = null,
  loadoutStats = [],
  savedLoadouts = [],
  activeLoadoutId = "",
  activeLoadout = null,
  onLoadoutStateChange,
  buildWalkthrough = null,
  onBuildWalkthroughChange,
  seenUnlockPartIds = [],
  buttonSkinClass = "skin-default",
  buttonSkinImageSrc = "",
  buttonSkinImageScale = 100,
  arenaThemeClass = "theme-default",
  achievementStats = {},
  unlockedAchievementIds = [],
  ghostReplay = null,
  challengeId = null,
  autoStartGhostDuel = false,
  onExitDuel = null,
  emitFeedback = null,
  allowScreenShake = true,
}) {
  const arenaRef = useRef(null)
  const feedbackTimeoutIdsRef = useRef([])
  const hasAwardedRoundRef = useRef(false)
  const shakeTimeoutRef = useRef(null)
  const roundEndTimeoutRef = useRef(null)
  const goCueTimeoutRef = useRef(null)
  const countdownEndsAtRef = useRef(0)
  const pendingRoundStartRef = useRef(null)
  const geometryRef = useRef(null)
  const buttonSpawnedAtRef = useRef(0)
  const reactionTotalMsRef = useRef(0)
  const reactionSampleCountRef = useRef(0)
  // The deterministic simulation owns all score-relevant state (score, streak,
  // combo surge, guard, powerup charges). React state below only mirrors it
  // for rendering, so the submitted event stream replays to the exact same
  // totals on the server.
  const simulationRef = useRef(null)
  const roundNonceRef = useRef(0)
  const roundSeedRef = useRef(0)
  const roundTokenRef = useRef(null)
  const arenaDimensionsRef = useRef(null)
  const rngRef = useRef(Math.random)
  const ghostReplayRef = useRef(ghostReplay)
  const challengeIdRef = useRef(challengeId)
  // Whether the finished round reached the server, and what it actually awarded.
  const [roundSave, setRoundSave] = useState({ status: "idle" })
  // A duel is raced once. After its round, Play Again and Change Mode leave the
  // duel (onExitDuel) and start ordinary rounds instead of re-racing it.
  const finishedDuelRef = useRef(false)
  const autoStartedChallengeRef = useRef(null)
  const onExitDuelRef = useRef(onExitDuel)
  useEffect(() => {
    onExitDuelRef.current = onExitDuel
  }, [onExitDuel])
  const rankedWarmupIntentRef = useRef(false)

  useEffect(() => {
    ghostReplayRef.current = ghostReplay
  }, [ghostReplay])

  useEffect(() => {
    challengeIdRef.current = challengeId
    finishedDuelRef.current = false
  }, [challengeId])

  const [ghostScore, setGhostScore] = useState(0)

  const resolvedLoadout = useMemo(
    () => getResolvedLoadout(savedLoadouts, activeLoadoutId, activeLoadout),
    [activeLoadout, activeLoadoutId, savedLoadouts]
  )
  const resolvedSelectedMode = useMemo(
    () => buildRoundRules(getModeById(selectedModeId), resolvedLoadout),
    [resolvedLoadout, selectedModeId]
  )
  const selectedModeConfig = useMemo(
    () => getModeById(selectedModeId),
    [selectedModeId]
  )

  const [phase, setPhase] = useState(ROUND_PHASE.READY)
  const [countdownValue, setCountdownValue] = useState(READY_COUNTDOWN_START)
  const [roundStartStatus, setRoundStartStatus] = useState("idle")
  const [roundStartError, setRoundStartError] = useState("")
  const [isGoCueVisible, setIsGoCueVisible] = useState(false)
  const [isShakeActive, setIsShakeActive] = useState(false)
  const [isRoundEnding, setIsRoundEnding] = useState(false)

  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const roundStartTimeRef = useRef(0)
  const roundEventsRef = useRef([])

  const [roundMode, setRoundMode] = useState(resolvedSelectedMode)
  const [buttonSize, setButtonSize] = useState(resolvedSelectedMode.initialButtonSize)
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 })
  const [timeLeft, setTimeLeft] = useState(resolvedSelectedMode.durationSeconds)
  const [clickFeedbackItems, setClickFeedbackItems] = useState([])
  const [targetSpawnSequence, setTargetSpawnSequence] = useState(0)
  const [activatedPowerup, setActivatedPowerup] = useState(null)
  const activationCueTimeoutRef = useRef(null)
  const hasPassedPersonalBestRef = useRef(false)
  const [powerupCharges, setPowerupCharges] = useState(() => (
    buildPowerupChargeState(
      resolvedSelectedMode.equippedPowerups,
      resolvedSelectedMode.startingPowerupCharges
    )
  ))
  const [roundStartBestScore, setRoundStartBestScore] = useState(playerBestScore)
  const [roundStartLevel, setRoundStartLevel] = useState(playerLevel)
  const [roundStartCoins, setRoundStartCoins] = useState(playerCoins)
  const [roundStartXpIntoLevel, setRoundStartXpIntoLevel] = useState(playerXpIntoLevel)
  const [roundStartXpToNextLevel, setRoundStartXpToNextLevel] = useState(playerXpToNextLevel)
  const [roundStartRankMmr, setRoundStartRankMmr] = useState(playerRankMmr)
  const [roundStartRankedState, setRoundStartRankedState] = useState(playerRankedState)
  const [roundStartHasRankedHistory, setRoundStartHasRankedHistory] = useState(
    playerHasRankedHistory
  )
  const [roundStartLoadoutSnapshot, setRoundStartLoadoutSnapshot] = useState(() => (
    buildLoadoutSnapshot(resolvedLoadout)
  ))
  // Field Data (Phase 9): the loadout's round tally *before* this round, so
  // the Game Over "Workshop notes" line only fires once the server's updated
  // loadoutStats (applied via onRoundComplete) actually reflects this round.
  const [roundStartLoadoutStatsTotalRounds, setRoundStartLoadoutStatsTotalRounds] = useState(() => (
    selectLoadoutStatsEntry(loadoutStats, resolvedLoadout?.id)?.totalRounds ?? 0
  ))
  const [avgReactionMs, setAvgReactionMs] = useState(null)
  const [bestReactionMs, setBestReactionMs] = useState(null)
  const [comboSurgeHitsRemaining, setComboSurgeHitsRemaining] = useState(0)
  const [guardActiveUntilMs, setGuardActiveUntilMs] = useState(0)
  const [sessionStats, setSessionStats] = useState({ rounds: 0, bestScore: 0, netRR: 0 })
  const [selectedDrillId, setSelectedDrillId] = useState(null)
  const activeDrillIdRef = useRef(null)

  const isPlaying = phase === ROUND_PHASE.PLAYING && !isRoundEnding
  const buildWalkthroughStatus = buildWalkthrough?.status ?? null
  const gameOnboardingStep = getGameOnboardingStep(buildWalkthroughStatus)
  const isGameOnboardingActive = isGameOnboardingStatus(buildWalkthroughStatus)
  const canChangeMode = (phase === ROUND_PHASE.READY || phase === ROUND_PHASE.GAME_OVER)
    && !isGameOnboardingActive
  const isTimedRound = roundMode.isTimedRound !== false
  const allowsCoinRewards = roundMode.allowsCoinRewards !== false
  const allowsLevelProgression = roundMode.allowsLevelProgression !== false
  const allowsRankProgression = roundMode.allowsRankProgression === true

  const comboMultiplier = useMemo(
    () => getComboMultiplier(streak, roundMode.comboStep),
    [roundMode.comboStep, streak]
  )

  const accuracy = useMemo(() => formatAccuracy(hits, misses), [hits, misses])
  const roundXpEarned = useMemo(
    () => (allowsLevelProgression
      ? calculateRoundXp({ hits, misses, bestStreak, score })
      : 0),
    [allowsLevelProgression, bestStreak, hits, misses, score]
  )
  const roundRankDelta = useMemo(
    () => calculateRoundRankDelta({
      score,
      hits,
      misses,
      bestStreak,
      modeId: roundMode.id,
      progressionMode: roundMode.progressionMode,
      allowsRankProgression,
    }),
    [
      allowsRankProgression,
      bestStreak,
      hits,
      misses,
      roundMode.id,
      roundMode.progressionMode,
      score,
    ]
  )
  const placementMatchScore = useMemo(
    () => calculatePlacementMatchScore({
      score,
      hits,
      misses,
      bestStreak,
      modeId: roundMode.id,
      progressionMode: roundMode.progressionMode,
      allowsRankProgression,
    }),
    [
      allowsRankProgression,
      bestStreak,
      hits,
      misses,
      roundMode.id,
      roundMode.progressionMode,
      score,
    ]
  )
  const projectedRankOutcome = useMemo(
    () => applyRankedMatchResult({
      currentMmr: roundStartRankMmr,
      currentRankedState: roundStartRankedState,
      hasRankedHistory: roundStartHasRankedHistory,
      baseRankDelta: roundRankDelta,
      placementMatchScore,
      allowsRankProgression,
    }),
    [
      allowsRankProgression,
      placementMatchScore,
      roundRankDelta,
      roundStartHasRankedHistory,
      roundStartRankMmr,
      roundStartRankedState,
    ]
  )
  const roundCoinsEarned = useMemo(
    () => (allowsCoinRewards ? calculateRoundCoins(hits, roundMode.coinMultiplier) : 0),
    [allowsCoinRewards, hits, roundMode.coinMultiplier]
  )
  const atmosphereTier = useMemo(() => getStreakAtmosphereTier(streak), [streak])
  const pbPace = useMemo(() => {
    if (!isPlaying || !isTimedRound) return null
    if (!playerBestScore || playerBestScore <= 0) return null
    const elapsedSeconds = roundMode.durationSeconds - timeLeft
    if (elapsedSeconds < 3) return null
    const expectedPace = Math.round(playerBestScore * (elapsedSeconds / roundMode.durationSeconds))
    return {
      status: score >= expectedPace ? "ahead" : "behind",
      delta: score - expectedPace,
    }
  }, [isPlaying, isTimedRound, playerBestScore, roundMode.durationSeconds, score, timeLeft])
  const isGuardActive = guardActiveUntilMs > 0
  const displayMode = phase === ROUND_PHASE.READY ? resolvedSelectedMode : roundMode
  const previewPowerupCharges = useMemo(
    () => buildPowerupChargeState(
      resolvedSelectedMode.equippedPowerups,
      resolvedSelectedMode.startingPowerupCharges
    ),
    [resolvedSelectedMode]
  )
  const gameScreenClassName = useMemo(
    () => buildGameScreenClassName(atmosphereTier, isShakeActive),
    [atmosphereTier, isShakeActive]
  )
  const previewLoadoutPresentation = useMemo(
    () => buildLoadoutPresentation(selectedModeConfig, resolvedLoadout),
    [resolvedLoadout, selectedModeConfig]
  )
  const activeRoundLoadoutPresentation = useMemo(
    () => buildLoadoutPresentation(getModeById(roundMode.id), roundStartLoadoutSnapshot),
    [roundMode.id, roundStartLoadoutSnapshot]
  )
  const buttonStyle = useMemo(
    () => buildButtonStyle(buttonSize, buttonPosition),
    [buttonPosition, buttonSize]
  )
  const buttonLabel = getButtonLabel(buttonSize)
  const buttonLabelFontSize = getButtonLabelFontSize(buttonSize)

  const clearFeedbackTimeouts = useCallback(() => {
    feedbackTimeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId))
    feedbackTimeoutIdsRef.current = []
  }, [])

  const clearShakeTimeout = useCallback(() => {
    if (!shakeTimeoutRef.current) return

    clearTimeout(shakeTimeoutRef.current)
    shakeTimeoutRef.current = null
  }, [])

  const clearRoundEndTimeout = useCallback(() => {
    if (!roundEndTimeoutRef.current) return

    clearTimeout(roundEndTimeoutRef.current)
    roundEndTimeoutRef.current = null
  }, [])

  const markButtonSpawned = useCallback(() => {
    buttonSpawnedAtRef.current = performance.now()
  }, [])

  // Milliseconds since the round started playing — the canonical timebase for
  // every recorded event (and therefore for the server replay).
  const getElapsedMs = useCallback(() => (
    roundStartTimeRef.current > 0 ? Date.now() - roundStartTimeRef.current : 0
  ), [])

  const triggerScreenShake = useCallback(() => {
    if (!allowScreenShake) return

    clearShakeTimeout()
    setIsShakeActive(true)

    shakeTimeoutRef.current = setTimeout(() => {
      setIsShakeActive(false)
      shakeTimeoutRef.current = null
    }, SHAKE_DURATION_MS)
  }, [allowScreenShake, clearShakeTimeout])

  const centerButtonPosition = useCallback((nextButtonSize) => {
    const arenaElement = arenaRef.current
    if (!arenaElement) return

    setButtonPosition(getCenteredPosition(getPlayfieldRect(arenaElement), nextButtonSize))
  }, [])

  const mirrorGeometry = useCallback((state, spawned = false) => {
    if (!state) return
    setButtonSize(state.buttonSize)
    setButtonPosition(state.position)
    if (spawned) {
      markButtonSpawned()
      setTargetSpawnSequence((sequence) => sequence + 1)
    }
  }, [markButtonSpawned])

  const addClickFeedback = useCallback((clientX, clientY, value, type, detail = null) => {
    const arenaElement = arenaRef.current
    if (!arenaElement) return

    const arenaRect = arenaElement.getBoundingClientRect()
    const feedbackX = clientX - arenaRect.left
    const feedbackY = clientY - arenaRect.top
    const feedbackId = buildClickFeedbackId()

    setClickFeedbackItems((currentItems) => [
      ...currentItems.slice(-(MAX_TRANSIENT_FEEDBACK_ITEMS - 1)),
      { id: feedbackId, x: feedbackX, y: feedbackY, value, type, detail },
    ])

    const timeoutId = setTimeout(() => {
      setClickFeedbackItems((currentItems) =>
        currentItems.filter((item) => item.id !== feedbackId)
      )
      feedbackTimeoutIdsRef.current = feedbackTimeoutIdsRef.current.filter(
        (currentTimeoutId) => currentTimeoutId !== timeoutId
      )
    }, FEEDBACK_LIFETIME_MS)

    feedbackTimeoutIdsRef.current.push(timeoutId)
  }, [])

  const addCenterFeedback = useCallback((value, type) => {
    const arenaElement = arenaRef.current
    if (!arenaElement) return

    const arenaRect = arenaElement.getBoundingClientRect()
    addClickFeedback(
      arenaRect.left + arenaRect.width / 2,
      arenaRect.top + arenaRect.height / 2,
      value,
      type
    )
  }, [addClickFeedback])

  const syncSimulationState = useCallback((simulationState) => {
    setScore(simulationState.score)
    setStreak(simulationState.streak)
    setBestStreak(simulationState.bestStreak)
    setHits(simulationState.hits)
    setMisses(simulationState.misses)
    setPowerupCharges(simulationState.powerupCharges)
    setComboSurgeHitsRemaining(simulationState.comboSurgeHitsRemaining)
    setGuardActiveUntilMs(simulationState.guardActiveUntilMs)
  }, [])

  const resetRoundState = useCallback((modeSettings) => {
    clearRoundEndTimeout()
    countdownEndsAtRef.current = 0
    setRoundStartStatus("idle")
    setRoundStartError("")
    setCountdownValue(READY_COUNTDOWN_START)
    setScore(0)
    setStreak(0)
    setBestStreak(0)
    setHits(0)
    setMisses(0)
    setButtonSize(modeSettings.initialButtonSize)
    setTimeLeft(modeSettings.durationSeconds)
    setClickFeedbackItems([])
    setTargetSpawnSequence(0)
    setActivatedPowerup(null)
    hasPassedPersonalBestRef.current = false
    if (activationCueTimeoutRef.current) {
      window.clearTimeout(activationCueTimeoutRef.current)
      activationCueTimeoutRef.current = null
    }
    setPowerupCharges(
      buildPowerupChargeState(
        modeSettings.equippedPowerups,
        modeSettings.startingPowerupCharges
      )
    )
    setComboSurgeHitsRemaining(0)
    setGuardActiveUntilMs(0)
    geometryRef.current = null
    buttonSpawnedAtRef.current = 0
    reactionTotalMsRef.current = 0
    reactionSampleCountRef.current = 0
    setAvgReactionMs(null)
    setBestReactionMs(null)
    setIsShakeActive(false)
    setIsRoundEnding(false)
    setIsGoCueVisible(false)
    if (goCueTimeoutRef.current) {
      window.clearTimeout(goCueTimeoutRef.current)
      goCueTimeoutRef.current = null
    }
    clearShakeTimeout()
    clearFeedbackTimeouts()
    centerButtonPosition(modeSettings.initialButtonSize)
  }, [centerButtonPosition, clearFeedbackTimeouts, clearRoundEndTimeout, clearShakeTimeout])

  const startRoundWithCountdown = useCallback((
    nextModeId = selectedModeId,
    nextLoadoutId = activeLoadoutId,
    nextDrillId = selectedDrillId
  ) => {
    if (finishedDuelRef.current) onExitDuelRef.current?.()
    // A duel can't start until its ghost has loaded; starting earlier would run
    // an ordinary round that can never settle the duel.
    else if (challengeIdRef.current && !isValidGhostReplay(ghostReplayRef.current)) return
    pendingRoundStartRef.current = {
      modeId: nextModeId,
      loadoutId: nextLoadoutId,
      drillId: nextDrillId,
    }
    setRoundStartStatus("idle")
    setRoundStartError("")
    const nextResolvedLoadout = getResolvedLoadout(
      savedLoadouts,
      nextLoadoutId,
      nextLoadoutId === activeLoadoutId ? activeLoadout : null
    )
    const baseMode = nextModeId === DIFFICULTY_IDS.EASY && nextDrillId
      ? buildDrillMode(nextDrillId, getModeById(nextModeId))
      : getModeById(nextModeId)
    const nextRoundMode = buildRoundRules(baseMode, nextResolvedLoadout)
    activeDrillIdRef.current = baseMode.drillId ?? null

    if (nextModeId !== selectedModeId) {
      onModeChange?.(nextModeId)
    }

    if (nextLoadoutId !== activeLoadoutId && nextResolvedLoadout) {
      onLoadoutStateChange?.({
        savedLoadouts,
        activeLoadoutId: nextResolvedLoadout.id,
      })
    }

    setRoundMode(nextRoundMode)
    resetRoundState(nextRoundMode)
    hasAwardedRoundRef.current = false
    setRoundSave({ status: "idle" })
    roundEventsRef.current = []
    roundStartTimeRef.current = 0
    reactionTotalMsRef.current = 0
    reactionSampleCountRef.current = 0
    buttonSpawnedAtRef.current = 0

    simulationRef.current = createRoundSimulation(nextRoundMode)

    roundNonceRef.current += 1
    const startedRoundNonce = roundNonceRef.current
    roundTokenRef.current = null
    arenaDimensionsRef.current = null
    const activeGhostReplay = finishedDuelRef.current ? null : ghostReplayRef.current
    // Reward-bearing rounds wait for a server token: without one the server
    // records the round but pays nothing.
    const requiresRoundToken = (
      nextRoundMode.allowsRankProgression === true
      || nextRoundMode.allowsCoinRewards === true
      || nextRoundMode.allowsLevelProgression === true
    ) && !isValidGhostReplay(activeGhostReplay)

    const beginCountdown = () => {
      setRoundStartBestScore(playerBestScore)
      setRoundStartLevel(playerLevel)
      setRoundStartCoins(playerCoins)
      setRoundStartXpIntoLevel(playerXpIntoLevel)
      setRoundStartXpToNextLevel(playerXpToNextLevel)
      setRoundStartRankMmr(playerRankMmr)
      setRoundStartRankedState(playerRankedState)
      setRoundStartHasRankedHistory(playerHasRankedHistory)
      setRoundStartLoadoutSnapshot(buildLoadoutSnapshot(nextResolvedLoadout))
      setRoundStartLoadoutStatsTotalRounds(
        selectLoadoutStatsEntry(loadoutStats, nextResolvedLoadout?.id)?.totalRounds ?? 0
      )
      setCountdownValue(READY_COUNTDOWN_START)
      countdownEndsAtRef.current = Date.now() + (READY_COUNTDOWN_START * TIMER_TICK_MS)
      setRoundStartStatus("countdown")
      setPhase(ROUND_PHASE.COUNTDOWN)
    }

    const applyRoundSeed = (seed, roundToken = null) => {
      roundSeedRef.current = Number(seed) >>> 0
      rngRef.current = createSeededRng(roundSeedRef.current)
      roundTokenRef.current = roundToken
    }

    setGhostScore(0)

    if (isValidGhostReplay(activeGhostReplay)) {
      // A duel race asks for a token bound to the challenge, so the run is stored
      // as a replay and settles the duel. A ghost race outside a duel runs unrewarded.
      const duelChallengeId = finishedDuelRef.current ? null : challengeIdRef.current
      if (!duelChallengeId) {
        applyRoundSeed(activeGhostReplay.seed)
        beginCountdown()
        return
      }

      setRoundStartStatus("requesting")
      setPhase(ROUND_PHASE.READY)
      // Without the challenge token the race could never settle the duel, so a
      // failed request stops at Ready with the error and a retry, like Ranked.
      requestRoundStart(nextModeId, { challengeId: duelChallengeId })
        .then(({ roundToken, seed, replayId }) => {
          if (roundNonceRef.current !== startedRoundNonce
            || challengeIdRef.current !== duelChallengeId
            || ghostReplayRef.current !== activeGhostReplay) return
          if (Number(replayId) !== activeGhostReplay.id || !replayId || activeGhostReplay.modeId !== nextModeId) {
            setRoundStartStatus("error")
            setRoundStartError("This duel link doesn't match its rival run")
            return
          }
          if (!roundToken) {
            setRoundStartStatus("error")
            setRoundStartError("The server did not start this duel. Please try again.")
            return
          }
          applyRoundSeed(seed, roundToken)
          beginCountdown()
        })
        .catch((error) => {
          if (roundNonceRef.current !== startedRoundNonce
            || challengeIdRef.current !== duelChallengeId
            || ghostReplayRef.current !== activeGhostReplay) return
          setRoundStartStatus("error")
          setRoundStartError(error?.message || "Unable to start this duel. Check your connection and try again.")
        })
      return
    }

    if (requiresRoundToken) {
      setRoundStartStatus("requesting")
      setPhase(ROUND_PHASE.READY)
      requestRoundStart(nextModeId)
        .then(({ roundToken, seed }) => {
          if (roundNonceRef.current !== startedRoundNonce) return
          if (!roundToken) {
            setRoundStartStatus("error")
            setRoundStartError("The server did not issue a round token. Please try again.")
            return
          }
          applyRoundSeed(seed, roundToken)
          beginCountdown()
        })
        .catch((error) => {
          if (roundNonceRef.current !== startedRoundNonce) return
          setRoundStartStatus("error")
          setRoundStartError(
            error?.message || "Unable to reach the server. Check your connection and try again."
          )
        })
      return
    }

    // Non-ranked modes seed locally and upgrade to a server token when available.
    applyRoundSeed(createRandomSeed())
    beginCountdown()

    requestRoundStart(nextModeId)
      .then(({ roundToken, seed }) => {
        const isSameRound = roundNonceRef.current === startedRoundNonce
        const hasRoundStarted = roundStartTimeRef.current > 0
        if (!isSameRound || hasRoundStarted || !roundToken) return

        applyRoundSeed(seed, roundToken)
      })
      .catch(() => {
        // Non-ranked rounds can still submit without a token.
      })
  }, [
    activeLoadout,
    activeLoadoutId,
    loadoutStats,
    onLoadoutStateChange,
    onModeChange,
    playerHasRankedHistory,
    playerBestScore,
    playerLevel,
    playerCoins,
    playerRankMmr,
    playerRankedState,
    playerXpIntoLevel,
    playerXpToNextLevel,
    resetRoundState,
    savedLoadouts,
    selectedModeId,
    selectedDrillId,
  ])

  const cancelPendingRoundStart = useCallback(() => {
    roundNonceRef.current += 1
    pendingRoundStartRef.current = null
    roundTokenRef.current = null
    simulationRef.current = null
    countdownEndsAtRef.current = 0
    setRoundStartStatus("idle")
    setRoundStartError("")
    setCountdownValue(READY_COUNTDOWN_START)
    setRoundMode(resolvedSelectedMode)
    resetRoundState(resolvedSelectedMode)
    setPhase(ROUND_PHASE.READY)
  }, [resetRoundState, resolvedSelectedMode])

  const retryPendingRoundStart = useCallback(() => {
    const pendingStart = pendingRoundStartRef.current
    if (!pendingStart) return
    startRoundWithCountdown(
      pendingStart.modeId,
      pendingStart.loadoutId,
      pendingStart.drillId
    )
  }, [startRoundWithCountdown])

  const returnToReadyOverlay = useCallback(() => {
    if (finishedDuelRef.current) onExitDuelRef.current?.()
    const shouldReturnToRanked = rankedWarmupIntentRef.current
    rankedWarmupIntentRef.current = false
    const nextRoundMode = shouldReturnToRanked
      ? buildRoundRules(getModeById(DIFFICULTY_IDS.HARD), resolvedLoadout)
      : resolvedSelectedMode
    if (shouldReturnToRanked) {
      onModeChange?.(DIFFICULTY_IDS.HARD)
      setSelectedDrillId(null)
    }
    setRoundMode(nextRoundMode)
    resetRoundState(nextRoundMode)
    setPhase(ROUND_PHASE.READY)
  }, [onModeChange, resetRoundState, resolvedLoadout, resolvedSelectedMode])

  const endCurrentRound = useCallback(() => {
    if (phase !== ROUND_PHASE.PLAYING || isRoundEnding) return

    clearRoundEndTimeout()
    setIsRoundEnding(true)
    roundEndTimeoutRef.current = window.setTimeout(() => {
      setPhase(ROUND_PHASE.GAME_OVER)
      setIsRoundEnding(false)
      roundEndTimeoutRef.current = null
    }, ROUND_END_SETTLE_MS)
  }, [clearRoundEndTimeout, isRoundEnding, phase])

  // Visual/geometry side effects of a powerup. Score-relevant semantics
  // (charge consumption, combo surge, guard) live in the shared engine.
  const applyPowerupPresentation = useCallback((powerup, eventTimeMs = 0) => {
    mirrorGeometry(geometryRef.current?.applyPowerup(powerup.id, eventTimeMs))
    if (powerup.effectType === "time_boost") {
      setTimeLeft((currentTime) =>
        Math.min(roundMode.maxTimeBufferSeconds, currentTime + 2)
      )
      addCenterFeedback("+2s", "power power-time_boost")
      return
    }

    if (powerup.effectType === "size_boost") {
      markButtonSpawned()
      setTargetSpawnSequence((currentSequence) => currentSequence + 1)
      addCenterFeedback("Grow", "power power-size_boost")
      return
    }

    if (powerup.effectType === "freeze_movement") {
      addCenterFeedback("Freeze", "power power-freeze_movement")
      return
    }

    if (powerup.effectType === "magnet_center") {
      markButtonSpawned()
      setTargetSpawnSequence((currentSequence) => currentSequence + 1)
      addCenterFeedback("Center", "power power-magnet_center")
      return
    }

    if (powerup.effectType === "combo_surge") {
      addCenterFeedback("Surge", "power power-combo_surge")
      return
    }

    if (powerup.effectType === "guard_charge") {
      addCenterFeedback("Guard", "power power-guard_charge")
      return
    }

    if (powerup.effectType === "second_wind") {
      addCenterFeedback("Second Wind", "power power-second_wind")
      return
    }

    if (powerup.effectType === "size_lock") {
      addCenterFeedback("Locked", "power power-size_lock")
      return
    }

    if (powerup.effectType === "overclock") {
      addCenterFeedback("Overclock", "power power-overclock")
    }
  }, [
    addCenterFeedback,
    mirrorGeometry,
    markButtonSpawned,
    roundMode.maxTimeBufferSeconds,
  ])

  const tryUsePowerup = useCallback((powerup) => {
    if (!powerup || !isPlaying || !simulationRef.current) return

    const eventTimeMs = getElapsedMs()
    const outcome = simulationRef.current.applyPowerup(powerup.id, eventTimeMs)

    if (!outcome.applied) {
      emitFeedback?.(FEEDBACK_EVENTS.ACTION_DENY, {
        eventId: `round-${roundNonceRef.current}-power-denied-${powerup.id}-${eventTimeMs}`,
      })
      if (outcome.reason === "untimed_round") {
        addCenterFeedback("No Timer", "negative")
      }
      return
    }

    roundEventsRef.current.push({
      type: "powerup",
      powerupId: powerup.id,
      t: eventTimeMs,
    })
    emitFeedback?.(FEEDBACK_EVENTS.POWER_ACTIVATE, {
      eventId: `round-${roundNonceRef.current}-event-${roundEventsRef.current.length}`,
    })
    setPowerupCharges(outcome.powerupCharges)
    setComboSurgeHitsRemaining(outcome.comboSurgeHitsRemaining)
    setGuardActiveUntilMs(outcome.guardActiveUntilMs)
    // Timed effects (freeze, center hold, size lock) stay "active" for their
    // real duration so the tray and the target can show it.
    const activeDurationMs = {
      freeze_movement: FREEZE_MOVEMENT_DURATION_MS,
      magnet_center: MAGNET_CENTER_FREEZE_MS,
      size_lock: SIZE_LOCK_DURATION_MS,
    }[powerup.effectType] ?? 0
    setActivatedPowerup({
      id: powerup.id,
      label: powerup.label,
      effectType: powerup.effectType,
      durationMs: activeDurationMs,
      sequence: eventTimeMs,
    })
    if (activationCueTimeoutRef.current) window.clearTimeout(activationCueTimeoutRef.current)
    activationCueTimeoutRef.current = window.setTimeout(() => {
      setActivatedPowerup(null)
      activationCueTimeoutRef.current = null
    }, Math.max(1100, activeDurationMs))
    applyPowerupPresentation(powerup, eventTimeMs)
  }, [addCenterFeedback, applyPowerupPresentation, emitFeedback, getElapsedMs, isPlaying])

  const tryUsePowerupKey = useCallback((key) => {
    tryUsePowerup(roundMode.equippedPowerups.find((item) => item.slotKey === key))
  }, [roundMode.equippedPowerups, tryUsePowerup])

  const handleUsePowerup = useCallback((powerupId) => {
    tryUsePowerup(roundMode.equippedPowerups.find((item) => item.id === powerupId))
  }, [roundMode.equippedPowerups, tryUsePowerup])

  const handleButtonClick = useCallback((event) => {
    event.stopPropagation()
    if (!isPlaying || !simulationRef.current) return

    const eventTimeMs = getElapsedMs()
    const hitReactionMs = buttonSpawnedAtRef.current > 0
      ? Math.max(0, Math.round(performance.now() - buttonSpawnedAtRef.current))
      : null

    const arenaElement = arenaRef.current
    const clickCoordinates = getArenaClickCoordinates(event, arenaElement)

    if (isTooSoonAfterLastClick(roundEventsRef.current, eventTimeMs)) return
    if (countClickEvents(roundEventsRef.current) >= getMaxClickEvents(roundMode.id)) return

    roundEventsRef.current.push({
      type: "hit",
      t: eventTimeMs,
      ...(clickCoordinates ?? {}),
    })
    // Untimed Practice ends at the click cap. A timed round keeps running until
    // its timer expires (ending early would fail the server's timer check);
    // further clicks are simply not recorded.
    if (!roundMode.isTimedRound && countClickEvents(roundEventsRef.current) >= getMaxClickEvents(roundMode.id)) {
      endCurrentRound()
    }
    buttonSpawnedAtRef.current = 0

    if (hitReactionMs !== null) {
      reactionTotalMsRef.current += hitReactionMs
      reactionSampleCountRef.current += 1

      const nextAverageReactionMs = Math.round(
        reactionTotalMsRef.current / reactionSampleCountRef.current
      )

      setAvgReactionMs(nextAverageReactionMs)
      setBestReactionMs((currentBestReactionMs) => (
        currentBestReactionMs === null
          ? hitReactionMs
          : Math.min(currentBestReactionMs, hitReactionMs)
      ))
    }

    const isComboSurgeHit = simulationRef.current.getState().comboSurgeHitsRemaining > 0
    const result = simulationRef.current.applyHit(eventTimeMs)
    syncSimulationState(result)

    const feedbackEventId = `round-${roundNonceRef.current}-event-${roundEventsRef.current.length}`
    emitFeedback?.(FEEDBACK_EVENTS.HIT, {
      eventId: feedbackEventId,
      pitch: 1 + Math.min(0.36, result.streak * 0.012),
      strength: 1 + Math.min(0.25, result.streak * 0.008),
    })
    if (isStreakMilestone(result.streak)) {
      emitFeedback?.(FEEDBACK_EVENTS.STREAK_MILESTONE, {
        eventId: `${feedbackEventId}-streak-${result.streak}`,
        strength: 1.12,
      })
      addCenterFeedback(`${result.streak} streak`, "milestone")
    }

    addClickFeedback(
      event.clientX,
      event.clientY,
      `+${result.pointsEarned}`,
      isComboSurgeHit ? "hit comboHit" : "hit"
    )
    if (
      !hasPassedPersonalBestRef.current
      && roundStartBestScore > 0
      && score <= roundStartBestScore
      && result.score > roundStartBestScore
    ) {
      hasPassedPersonalBestRef.current = true
      addCenterFeedback("Personal best", "milestone personalBest")
    }
    result.grantedPowerups.forEach((powerup) => {
      addCenterFeedback(`Key ${powerup.slotKey} charged`, "positive chargeGain")
      emitFeedback?.(FEEDBACK_EVENTS.POWER_READY, {
        eventId: `${feedbackEventId}-power-${powerup.id}`,
      })
    })

    const geometry = geometryRef.current
    if (geometry) {
      const moving = eventTimeMs >= geometry.getState().freezeMovementUntilMs
      mirrorGeometry(geometry.applyHit(eventTimeMs), moving)
    }
  }, [
    endCurrentRound,
    addCenterFeedback,
    addClickFeedback,
    emitFeedback,
    getElapsedMs,
    isPlaying,
    mirrorGeometry,
    roundStartBestScore,
    roundMode,
    score,
    syncSimulationState,
  ])

  const handleArenaClick = useCallback((event) => {
    if (!isPlaying || !simulationRef.current) return

    const eventTimeMs = getElapsedMs()
    const arenaElement = arenaRef.current
    const clickCoordinates = getArenaClickCoordinates(event, arenaElement)

    if (isTooSoonAfterLastClick(roundEventsRef.current, eventTimeMs)) return
    if (countClickEvents(roundEventsRef.current) >= getMaxClickEvents(roundMode.id)) return

    roundEventsRef.current.push({
      type: "miss",
      t: eventTimeMs,
      ...(clickCoordinates ?? {}),
    })
    // Untimed Practice ends at the click cap. A timed round keeps running until
    // its timer expires (ending early would fail the server's timer check);
    // further clicks are simply not recorded.
    if (!roundMode.isTimedRound && countClickEvents(roundEventsRef.current) >= getMaxClickEvents(roundMode.id)) {
      endCurrentRound()
    }

    const result = simulationRef.current.applyMiss(eventTimeMs)
    syncSimulationState(result)

    const feedbackEventId = `round-${roundNonceRef.current}-event-${roundEventsRef.current.length}`

    if (result.guarded) {
      emitFeedback?.(FEEDBACK_EVENTS.GUARDED_MISS, { eventId: feedbackEventId })
      addClickFeedback(event.clientX, event.clientY, "Absorbed", "guarded")
      return
    }

    // Second Wind can absorb the streak reset, so read the outcome, not the old streak.
    const streakBroken = streak > 0 && result.streak === 0
    const streakSaved = streak > 0 && result.streak > 0

    triggerScreenShake()
    emitFeedback?.(FEEDBACK_EVENTS.MISS, { eventId: feedbackEventId })
    // A miss supersedes any streak celebration still on screen.
    if (streakBroken) {
      setClickFeedbackItems((currentItems) => currentItems.filter((item) => !String(item.type).includes("milestone")))
    }

    if (result.penaltyApplied > 0) {
      addClickFeedback(
        event.clientX,
        event.clientY,
        `-${result.penaltyApplied}`,
        streakBroken ? "streakBreak" : "miss",
        streakBroken ? `${streak} streak lost` : streakSaved ? "Streak saved" : null
      )
      return
    }

    addClickFeedback(
      event.clientX,
      event.clientY,
      "Miss",
      streakBroken ? "streakBreak" : "miss",
      streakBroken ? `${streak} streak lost` : streakSaved ? "Streak saved" : null
    )
  }, [
    roundMode.isTimedRound,
    endCurrentRound,
    roundMode.id,
    addClickFeedback,
    emitFeedback,
    getElapsedMs,
    isPlaying,
    streak,
    syncSimulationState,
    triggerScreenShake,
  ])

  const handleModeSelect = useCallback((modeId) => {
    if (modeId !== DIFFICULTY_IDS.EASY) {
      setSelectedDrillId(null)
    }
    onModeChange?.(modeId)
  }, [onModeChange])

  useEffect(() => {
    if (phase !== ROUND_PHASE.COUNTDOWN) return

    let timeoutId = null

    const activateRound = () => {
      roundStartTimeRef.current = Date.now()
      countdownEndsAtRef.current = 0

      const arenaElement = arenaRef.current
      if (arenaElement) {
        const playfieldRect = getPlayfieldRect(arenaElement)
        arenaDimensionsRef.current = {
          arenaWidth: Math.round(playfieldRect.width),
          arenaHeight: Math.round(playfieldRect.height),
        }
        geometryRef.current = createGeometrySimulation({
          roundRules: roundMode,
          ...arenaDimensionsRef.current,
          rng: rngRef.current,
        })
        const geometry = geometryRef.current.getState()
        setButtonSize(geometry.buttonSize)
        setButtonPosition(geometry.position)
      }

      setCountdownValue(0)
      setRoundStartStatus("playing")
      setIsGoCueVisible(true)
      markButtonSpawned()
      setTargetSpawnSequence((currentSequence) => currentSequence + 1)
      setPhase(ROUND_PHASE.PLAYING)
      goCueTimeoutRef.current = window.setTimeout(() => {
        setIsGoCueVisible(false)
        goCueTimeoutRef.current = null
      }, 180)
    }

    const syncCountdown = () => {
      const remainingMs = countdownEndsAtRef.current - Date.now()
      if (remainingMs <= 0) {
        activateRound()
        return
      }

      const nextValue = Math.ceil(remainingMs / TIMER_TICK_MS)
      setCountdownValue(nextValue)
      const untilNextBeat = remainingMs - ((nextValue - 1) * TIMER_TICK_MS)
      timeoutId = window.setTimeout(syncCountdown, Math.max(16, untilNextBeat))
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        window.clearTimeout(timeoutId)
        timeoutId = window.setTimeout(syncCountdown, 0)
      }
    }

    timeoutId = window.setTimeout(syncCountdown, TIMER_TICK_MS)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.clearTimeout(timeoutId)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [markButtonSpawned, phase, roundMode])

  useEffect(() => {
    if (phase === ROUND_PHASE.COUNTDOWN && countdownValue > 0) {
      emitFeedback?.(FEEDBACK_EVENTS.COUNTDOWN_TICK, {
        eventId: `round-${roundNonceRef.current}-countdown-${countdownValue}`,
        pitch: 1 + (READY_COUNTDOWN_START - countdownValue) * 0.08,
      })
      return
    }

    if (phase === ROUND_PHASE.PLAYING) {
      emitFeedback?.(FEEDBACK_EVENTS.COUNTDOWN_GO, {
        eventId: `round-${roundNonceRef.current}-go`,
      })
    }
  }, [countdownValue, emitFeedback, phase])

  useEffect(() => {
    if (!isPlaying || !isTimedRound || timeLeft <= 0 || timeLeft > 5) return
    emitFeedback?.(FEEDBACK_EVENTS.TIME_WARNING, {
      eventId: `round-${roundNonceRef.current}-time-${timeLeft}`,
      pitch: timeLeft <= 2 ? 1.15 : 1,
    })
  }, [emitFeedback, isPlaying, isTimedRound, timeLeft])

  useEffect(() => {
    if (!isPlaying || !ghostReplayRef.current) return undefined

    const ghostInterval = setInterval(() => {
      setGhostScore(
        computeGhostScoreAtElapsed(
          ghostReplayRef.current,
          getElapsedMs(),
          playerLevel
        )
      )
    }, TIMER_TICK_MS)

    return () => clearInterval(ghostInterval)
  }, [getElapsedMs, isPlaying, playerLevel])

  useEffect(() => {
    if (!isValidGhostReplay(ghostReplay)) {
      autoStartedChallengeRef.current = null
      return undefined
    }
    if (!autoStartGhostDuel) return undefined
    if (phase !== ROUND_PHASE.READY) return undefined
    // Start each duel automatically only once: returning to Ready or cancelling
    // must not launch it again.
    if (autoStartedChallengeRef.current === challengeId) return undefined

    const timeoutId = window.setTimeout(() => {
      autoStartedChallengeRef.current = challengeId
      startRoundWithCountdown(ghostReplay.modeId || selectedModeId, activeLoadoutId)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [
    activeLoadoutId,
    autoStartGhostDuel,
    challengeId,
    ghostReplay,
    phase,
    selectedModeId,
    startRoundWithCountdown,
  ])

  useEffect(() => {
    if (!isPlaying || !isTimedRound) return

    const roundTimerInterval = setInterval(() => {
      setTimeLeft((currentTime) => {
        if (currentTime <= 1) {
          clearInterval(roundTimerInterval)
          endCurrentRound()
          return 0
        }
        return currentTime - 1
      })
    }, TIMER_TICK_MS)

    return () => clearInterval(roundTimerInterval)
  }, [endCurrentRound, isPlaying, isTimedRound])

  useEffect(() => {
    if (guardActiveUntilMs <= 0) return undefined

    // guardActiveUntilMs is in round-elapsed milliseconds (the event timebase),
    // matching how the engine decides whether a miss is guarded.
    const remainingMs = Math.max(0, guardActiveUntilMs - getElapsedMs())
    const timeoutId = window.setTimeout(() => {
      setGuardActiveUntilMs(0)
    }, remainingMs)

    return () => window.clearTimeout(timeoutId)
  }, [getElapsedMs, guardActiveUntilMs])

  useEffect(() => {
    if (!gameOnboardingStep?.modeId) return
    if (selectedModeId === gameOnboardingStep.modeId) return
    onModeChange?.(gameOnboardingStep.modeId)
  }, [gameOnboardingStep, onModeChange, selectedModeId])

  useEffect(() => {
    if (phase !== ROUND_PHASE.GAME_OVER || hasAwardedRoundRef.current) return undefined

    // Defer progression writes until after the phase commit. Keeping this work
    // out of endCurrentRound also keeps the gameplay timer callback stable while
    // score and reaction state continue to update during a round.
    const timeoutId = window.setTimeout(() => {
      if (hasAwardedRoundRef.current) return
      hasAwardedRoundRef.current = true

      const savingRoundNonce = roundNonceRef.current
      setRoundSave({ status: "saving" })
      const roundSaveResult = onRoundComplete?.({
        clicksScored: hits,
        hits,
        misses,
        score,
        bestStreak,
        avgReactionMs,
        bestReactionMs,
        modeId: roundMode.id,
        progressionMode: roundMode.progressionMode,
        coinMultiplier: roundMode.coinMultiplier,
        allowsCoinRewards: roundMode.allowsCoinRewards !== false,
        allowsLevelProgression: roundMode.allowsLevelProgression !== false,
        allowsRankProgression: roundMode.allowsRankProgression === true,
        events: roundEventsRef.current,
        loadoutSnapshot: roundStartLoadoutSnapshot,
        roundToken: roundTokenRef.current,
        seed: roundSeedRef.current,
        arenaWidth: arenaDimensionsRef.current?.arenaWidth ?? null,
        arenaHeight: arenaDimensionsRef.current?.arenaHeight ?? null,
        challengeId: finishedDuelRef.current ? null : challengeIdRef.current,
        drillId: activeDrillIdRef.current,
      })
      if (challengeIdRef.current) finishedDuelRef.current = true
      Promise.resolve(roundSaveResult).then((result) => {
        if (roundNonceRef.current !== savingRoundNonce) return
        setRoundSave(result && result.ok === false
          ? { status: "failed", error: result.error }
          : { status: "saved", outcome: result?.ok ? result : null })
      })

      setSessionStats((previousStats) => ({
        rounds: previousStats.rounds + 1,
        bestScore: Math.max(previousStats.bestScore, score),
        netRR: previousStats.netRR + (
          roundMode.allowsRankProgression === true
            ? projectedRankOutcome.appliedRankDelta
            : 0
        ),
      }))

      const nextOnboardingStatus = getNextOnboardingStatusAfterRound(
        buildWalkthroughStatus,
        roundMode.id
      )
      if (nextOnboardingStatus !== buildWalkthroughStatus) {
        onBuildWalkthroughChange?.({ status: nextOnboardingStatus })
      }
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [
    avgReactionMs,
    bestReactionMs,
    bestStreak,
    buildWalkthroughStatus,
    hits,
    misses,
    onBuildWalkthroughChange,
    onRoundComplete,
    phase,
    projectedRankOutcome.appliedRankDelta,
    roundMode.allowsCoinRewards,
    roundMode.allowsLevelProgression,
    roundMode.allowsRankProgression,
    roundMode.coinMultiplier,
    roundMode.id,
    roundMode.progressionMode,
    roundStartLoadoutSnapshot,
    score,
  ])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.repeat) return
      if (import.meta.env.DEV && event.key.toLowerCase() === "g") {
        // Dev preview shortcut: end without submitting, but treat the round as
        // saved so the Results and promotion screens can still be previewed.
        hasAwardedRoundRef.current = true
        setRoundSave({ status: "saved" })
        setTimeLeft(0)
        endCurrentRound()
        return
      }

      tryUsePowerupKey(event.key)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [endCurrentRound, tryUsePowerupKey])

  useEffect(() => {
    return () => {
      clearRoundEndTimeout()
      clearShakeTimeout()
      clearFeedbackTimeouts()
      if (activationCueTimeoutRef.current) window.clearTimeout(activationCueTimeoutRef.current)
      if (goCueTimeoutRef.current) window.clearTimeout(goCueTimeoutRef.current)
    }
  }, [clearFeedbackTimeouts, clearRoundEndTimeout, clearShakeTimeout])

  const powerupSlots = useMemo(() => (
    displayMode.equippedPowerups.map((powerup) => ({
      ...powerup,
      charges: phase === ROUND_PHASE.READY
        ? (previewPowerupCharges[powerup.id] ?? 0)
        : (powerupCharges[powerup.id] ?? 0),
      comboSurgeHitsRemaining,
      isGuardActive,
    }))
  ), [
    comboSurgeHitsRemaining,
    displayMode.equippedPowerups,
    isGuardActive,
    phase,
    powerupCharges,
    previewPowerupCharges,
  ])

  const activeDrill = useMemo(
    () => getTrainingDrillById(roundMode.drillId ?? selectedDrillId),
    [roundMode.drillId, selectedDrillId]
  )

  const drillGoal = useMemo(() => {
    if (!activeDrill || phase !== ROUND_PHASE.PLAYING) {
      return null
    }

    const metric = evaluateDrillMetric(activeDrill, {
      hits,
      misses,
      bestStreak,
      avgReactionMs,
    })
    const personalBest = lifetimeStats?.drillStats?.[activeDrill.id]?.bestMetric ?? null

    let progressLabel = activeDrill.goalLabel
    let isComplete = false

    if (activeDrill.goalType === "accuracy" && metric !== null) {
      progressLabel = `${metric}% / ${activeDrill.goalValue}%`
      isComplete = metric >= activeDrill.goalValue
    } else if (activeDrill.goalType === "streak") {
      progressLabel = `${bestStreak} / ${activeDrill.goalValue} streak`
      isComplete = bestStreak >= activeDrill.goalValue
    } else if (activeDrill.goalType === "reaction" && metric !== null) {
      progressLabel = personalBest
        ? `Avg ${metric}ms · Best ${personalBest}ms`
        : `Avg ${metric}ms`
      isComplete = personalBest !== null && metric <= personalBest
    }

    return {
      label: activeDrill.label,
      progressLabel,
      isComplete,
    }
  }, [
    activeDrill,
    avgReactionMs,
    bestStreak,
    hits,
    lifetimeStats,
    misses,
    phase,
  ])

  const warmupSuggestion = useMemo(
    () => getWarmupSuggestion(lifetimeStats, selectedModeId),
    [lifetimeStats, selectedModeId]
  )

  const rankedPreflight = useMemo(
    () => buildRankedPreflight({
      rankProgress: playerRankProgress,
      rankedState: playerRankedState,
      recentRounds: playerRecentRounds,
    }),
    [playerRankProgress, playerRankedState, playerRecentRounds]
  )

  // Field Data (Phase 9): one quiet, advisory "Workshop notes" line on Game
  // Over. Guarded on roundStartLoadoutStatsTotalRounds so it never fires
  // against a stale, pre-round loadoutStats snapshot.
  const workshopNote = useMemo(() => {
    if (phase !== ROUND_PHASE.GAME_OVER) return null

    return buildWorkshopNote({
      loadoutStats,
      loadoutSnapshot: roundStartLoadoutSnapshot,
      baselineTotalRounds: roundStartLoadoutStatsTotalRounds,
      roundResult: {
        score,
        bestStreak,
        isRanked: allowsRankProgression,
        rankDelta: projectedRankOutcome.appliedRankDelta,
      },
    })
  }, [
    allowsRankProgression,
    bestStreak,
    loadoutStats,
    phase,
    projectedRankOutcome.appliedRankDelta,
    roundStartLoadoutSnapshot,
    roundStartLoadoutStatsTotalRounds,
    score,
  ])

  const startRankedWarmup = useCallback(() => {
    rankedWarmupIntentRef.current = true
    setSelectedDrillId(warmupSuggestion?.id ?? null)
    startRoundWithCountdown(
      DIFFICULTY_IDS.EASY,
      activeLoadoutId,
      warmupSuggestion?.id ?? null
    )
  }, [activeLoadoutId, startRoundWithCountdown, warmupSuggestion?.id])

  return {
    phase,
    allowsCoinRewards,
    gameScreenClassName,
    duelStartError: challengeId && roundStartError === "This duel link doesn't match its rival run" ? roundStartError : "",
    hudProps: {
      score,
      ghostScore: ghostReplay ? ghostScore : null,
      ghostUsername: ghostReplay?.username ?? null,
      ghostTargetScore: ghostReplay?.score ?? null,
      isGhostDuel: Boolean(ghostReplay),
      timeLeft: phase === ROUND_PHASE.READY ? displayMode.durationSeconds : timeLeft,
      roundDurationSeconds: displayMode.durationSeconds,
      isTimedRound: displayMode.isTimedRound !== false,
      modeLabel: displayMode.label,
      rankLabel: playerRankLabel,
      streak,
      comboMultiplier,
      comboStep: roundMode.comboStep,
      comboActive: comboMultiplier > 1,
      bestStreak,
      isPlaying,
      loadoutName: displayMode.loadoutSnapshot?.loadoutName ?? resolvedLoadout?.name ?? "Loadout",
      loadoutPresentation: phase === ROUND_PHASE.READY
        ? previewLoadoutPresentation
        : activeRoundLoadoutPresentation,
      pbPaceStatus: pbPace?.status ?? null,
      pbPaceDelta: pbPace?.delta ?? null,
      playerBestScore,
      onEndRound: endCurrentRound,
      drillGoal,
    },
    arenaProps: {
      arenaRef,
      arenaThemeClass,
      onArenaClick: handleArenaClick,
      buttonStyle,
      onButtonClick: handleButtonClick,
      isButtonDisabled: !isPlaying,
      buttonLabel,
      buttonLabelFontSize,
      buttonSkinClass,
      buttonSkinImageSrc,
      buttonSkinImageScale,
      clickFeedbackItems,
      targetSpawnSequence,
      isTargetVisible: phase === ROUND_PHASE.PLAYING,
      finalSeconds: isPlaying && isTimedRound && timeLeft > 0 && timeLeft <= 5 ? timeLeft : null,
      activeEffect: activatedPowerup?.durationMs > 0 ? activatedPowerup.effectType : null,
    },
    powerupTrayProps: {
      powerupSlots,
      streak,
      isPlaying,
      activatedPowerup,
      onUsePowerup: handleUsePowerup,
    },
    readyOverlayProps: {
      onStart: startRoundWithCountdown,
      modes: MODES,
      selectedModeId,
      onSelectMode: handleModeSelect,
      canChangeMode,
      activeLoadoutName: resolvedLoadout?.name ?? "Loadout",
      playerBestScore,
      recentRounds: playerRecentRounds,
      activeLoadoutPresentation: previewLoadoutPresentation,
      showArmoryWalkthroughBadge: shouldShowArmoryOnboardingBadge(buildWalkthroughStatus)
        || hasUnseenUnlockedParts(playerLevel, seenUnlockPartIds),
      onboardingCoach: gameOnboardingStep
        ? {
            stepLabel: `Step ${gameOnboardingStep.stepNumber} of 3`,
            title: gameOnboardingStep.title,
            instruction: gameOnboardingStep.instruction,
            note: gameOnboardingStep.note,
            startLabel: gameOnboardingStep.startLabel,
          }
        : null,
      sessionStats: sessionStats.rounds > 0 ? sessionStats : null,
      showTrainingSuite: selectedModeId === DIFFICULTY_IDS.EASY && !isGameOnboardingActive,
      trainingDrills: TRAINING_DRILLS,
      selectedDrillId,
      onSelectDrill: setSelectedDrillId,
      drillStats: lifetimeStats?.drillStats ?? {},
      warmupSuggestion,
      rankedPreflight,
      rankProgress: playerRankProgress,
      onStartRankedWarmup: startRankedWarmup,
    },
    entranceOverlayProps: (
      (phase === ROUND_PHASE.READY && ["requesting", "error"].includes(roundStartStatus))
      || phase === ROUND_PHASE.COUNTDOWN
      || isGoCueVisible
    ) ? {
      countdownValue,
      modeId: roundMode.id,
      modeLabel: roundMode.label,
      loadoutName: roundMode.loadoutSnapshot?.loadoutName
        ?? roundStartLoadoutSnapshot?.loadoutName
        ?? resolvedLoadout?.name
        ?? "Loadout",
      startStatus: roundStartStatus,
      startError: roundStartError,
      isGoCue: isGoCueVisible,
      onRetry: retryPendingRoundStart,
      onCancel: cancelPendingRoundStart,
    } : null,
    gameOverOverlayProps: {
      score,
      hits,
      misses,
      bestStreak,
      accuracy,
      modeLabel: roundMode.label,
      playerLevel: roundStartLevel,
      playerCoins: roundStartCoins,
      playerXpIntoLevel: roundStartXpIntoLevel,
      playerXpToNextLevel: roundStartXpToNextLevel,
      // Once the server answers, show what it actually awarded rather than the
      // estimate made when the round ended.
      roundXpEarned: roundSave.outcome?.earnedXp ?? roundXpEarned,
      roundCoinsEarned: roundSave.outcome?.earnedCoins ?? roundCoinsEarned,
      roundSaveStatus: roundSave.status,
      roundSaveError: roundSave.error ?? "",
      roundSaveNote: roundSave.outcome?.followUpError ?? "",
      allowsCoinRewards,
      allowsLevelProgression,
      // After the save, the rank shown is the one the server calculated (another
      // tab may have played a ranked round in between).
      previousRankProgress: roundSave.outcome?.rankProgress?.previous ?? projectedRankOutcome.previousRankProgress,
      projectedRankProgress: roundSave.outcome?.rankProgress?.next ?? projectedRankOutcome.nextRankProgress,
      roundRankDelta: roundSave.outcome?.rankDelta ?? projectedRankOutcome.appliedRankDelta,
      allowsRankProgression,
      selectedModeId,
      bestScore: roundStartBestScore,
      avgReactionMs,
      bestReactionMs,
      loadoutSnapshot: roundStartLoadoutSnapshot,
      loadoutPresentation: activeRoundLoadoutPresentation,
      workshopNote,
      onRematch: () => startRoundWithCountdown(
        roundMode.id,
        activeLoadoutId,
        activeDrillIdRef.current
      ),
      onPlayAgain: returnToReadyOverlay,
      onChooseMode: returnToReadyOverlay,
      achievementStats,
      unlockedAchievementIds,
    },
  }
}
