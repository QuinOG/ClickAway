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
  FEEDBACK_OFFSET,
  READY_COUNTDOWN_START,
  ROUND_END_SETTLE_MS,
  ROUND_PHASE,
  SHAKE_DURATION_MS,
  TIMER_TICK_MS,
} from "../../../constants/gameConstants.js"
import {
  formatAccuracy,
  getButtonLabel,
  getButtonLabelFontSize,
  getCenteredPosition,
  getComboMultiplier,
  getNextButtonSize,
  getRandomPosition,
  getStreakAtmosphereTier,
} from "../../../utils/gameMath.js"
import { createRoundSimulation } from "../../../game/engine/roundEngine.js"
import {
  FREEZE_MOVEMENT_DURATION_MS,
  MAGNET_CENTER_FREEZE_MS,
} from "../../../game/engine/roundGeometry.js"
import { createRandomSeed, createSeededRng } from "../../../game/engine/seededRng.js"
import { computeGhostScoreAtElapsed } from "../../../utils/replayUtils.js"
import { requestRoundStart } from "../../../services/clickAwayHttpApiClient.js"
import { calculateRoundXp } from "../../../utils/progressionUtils.js"
import {
  applyRankedMatchResult,
  calculatePlacementMatchScore,
  calculateRoundRankDelta,
} from "../../../utils/rankUtils.js"
import { shouldShowArmoryOnboardingBadge } from "../../../constants/buildWalkthrough.js"
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

function getArenaClickCoordinates(event, arenaElement) {
  if (!arenaElement) return null

  const arenaRect = arenaElement.getBoundingClientRect()
  return {
    x: Math.round(event.clientX - arenaRect.left),
    y: Math.round(event.clientY - arenaRect.top),
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

function buildPowerupChargeState(equippedPowerups = [], startingCharges = 0) {
  return equippedPowerups.reduce((chargesById, powerup) => {
    chargesById[powerup.id] = Math.max(0, Number(startingCharges) || 0)
    return chargesById
  }, {})
}

function getResolvedLoadout(savedLoadouts = [], activeLoadoutId = "", activeLoadout = null) {
  return activeLoadout ?? getLoadoutById(savedLoadouts, activeLoadoutId)
}

export function useGameScreenController({
  onRoundComplete,
  selectedModeId = DEFAULT_MODE_ID,
  onModeChange,
  playerLevel = 1,
  playerXpIntoLevel = 0,
  playerXpToNextLevel = 0,
  playerRankMmr = 0,
  playerRankLabel = "Unranked",
  playerRankedState = {},
  playerHasRankedHistory = false,
  playerBestScore = 0,
  lifetimeStats = null,
  savedLoadouts = [],
  activeLoadoutId = "",
  activeLoadout = null,
  onLoadoutStateChange,
  buildWalkthrough = null,
  onBuildWalkthroughChange,
  buttonSkinClass = "skin-default",
  buttonSkinImageSrc = "",
  buttonSkinImageScale = 100,
  arenaThemeClass = "theme-default",
  achievementStats = {},
  unlockedAchievementIds = [],
  ghostReplay = null,
  challengeId = null,
  autoStartGhostDuel = false,
}) {
  const arenaRef = useRef(null)
  const feedbackTimeoutIdsRef = useRef([])
  const hasAwardedRoundRef = useRef(false)
  const shakeTimeoutRef = useRef(null)
  const roundEndTimeoutRef = useRef(null)
  const freezeMovementUntilRef = useRef(0)
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

  useEffect(() => {
    ghostReplayRef.current = ghostReplay
  }, [ghostReplay])

  useEffect(() => {
    challengeIdRef.current = challengeId
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
  const [powerupCharges, setPowerupCharges] = useState(() => (
    buildPowerupChargeState(
      resolvedSelectedMode.equippedPowerups,
      resolvedSelectedMode.startingPowerupCharges
    )
  ))
  const [roundStartBestScore, setRoundStartBestScore] = useState(playerBestScore)
  const [roundStartLevel, setRoundStartLevel] = useState(playerLevel)
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
  const pbPaceStatus = useMemo(() => {
    if (!isPlaying || !isTimedRound) return null
    if (!playerBestScore || playerBestScore <= 0) return null
    const elapsedSeconds = roundMode.durationSeconds - timeLeft
    if (elapsedSeconds < 3) return null
    const expectedPace = Math.round(playerBestScore * (elapsedSeconds / roundMode.durationSeconds))
    return score >= expectedPace ? "ahead" : "behind"
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
    clearShakeTimeout()
    setIsShakeActive(true)

    shakeTimeoutRef.current = setTimeout(() => {
      setIsShakeActive(false)
      shakeTimeoutRef.current = null
    }, SHAKE_DURATION_MS)
  }, [clearShakeTimeout])

  const centerButtonPosition = useCallback((nextButtonSize) => {
    const arenaElement = arenaRef.current
    if (!arenaElement) return

    const arenaRect = arenaElement.getBoundingClientRect()
    setButtonPosition(getCenteredPosition(arenaRect, nextButtonSize))
  }, [])

  const randomizeButtonPosition = useCallback((nextButtonSize) => {
    const arenaElement = arenaRef.current
    if (!arenaElement) return

    const arenaRect = arenaElement.getBoundingClientRect()
    setButtonPosition(getRandomPosition(arenaRect, nextButtonSize, rngRef.current))
    markButtonSpawned()
  }, [markButtonSpawned])

  const queueButtonReposition = useCallback(
    (nextButtonSize) => {
      if (getElapsedMs() < freezeMovementUntilRef.current) return

      setTimeout(() => {
        if (getElapsedMs() < freezeMovementUntilRef.current) return
        randomizeButtonPosition(nextButtonSize)
      }, 0)
    },
    [getElapsedMs, randomizeButtonPosition]
  )

  const addClickFeedback = useCallback((clientX, clientY, value, type) => {
    const arenaElement = arenaRef.current
    if (!arenaElement) return

    const arenaRect = arenaElement.getBoundingClientRect()
    const feedbackX = clientX - arenaRect.left + FEEDBACK_OFFSET.x
    const feedbackY = clientY - arenaRect.top + FEEDBACK_OFFSET.y
    const feedbackId = buildClickFeedbackId()

    setClickFeedbackItems((currentItems) => [
      ...currentItems,
      { id: feedbackId, x: feedbackX, y: feedbackY, value, type },
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
    setScore(0)
    setStreak(0)
    setBestStreak(0)
    setHits(0)
    setMisses(0)
    setButtonSize(modeSettings.initialButtonSize)
    setTimeLeft(modeSettings.durationSeconds)
    setClickFeedbackItems([])
    setPowerupCharges(
      buildPowerupChargeState(
        modeSettings.equippedPowerups,
        modeSettings.startingPowerupCharges
      )
    )
    setComboSurgeHitsRemaining(0)
    setGuardActiveUntilMs(0)
    freezeMovementUntilRef.current = 0
    buttonSpawnedAtRef.current = 0
    reactionTotalMsRef.current = 0
    reactionSampleCountRef.current = 0
    setAvgReactionMs(null)
    setBestReactionMs(null)
    setIsShakeActive(false)
    setIsRoundEnding(false)
    clearShakeTimeout()
    clearFeedbackTimeouts()
    centerButtonPosition(modeSettings.initialButtonSize)
  }, [centerButtonPosition, clearFeedbackTimeouts, clearRoundEndTimeout, clearShakeTimeout])

  const startRoundWithCountdown = useCallback((
    nextModeId = selectedModeId,
    nextLoadoutId = activeLoadoutId,
    nextDrillId = selectedDrillId
  ) => {
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
    const activeGhostReplay = ghostReplayRef.current
    const requiresRoundToken = nextRoundMode.allowsRankProgression === true
      && !activeGhostReplay?.seed

    const beginCountdown = () => {
      setRoundStartBestScore(playerBestScore)
      setRoundStartLevel(playerLevel)
      setRoundStartXpIntoLevel(playerXpIntoLevel)
      setRoundStartXpToNextLevel(playerXpToNextLevel)
      setRoundStartRankMmr(playerRankMmr)
      setRoundStartRankedState(playerRankedState)
      setRoundStartHasRankedHistory(playerHasRankedHistory)
      setRoundStartLoadoutSnapshot(buildLoadoutSnapshot(nextResolvedLoadout))
      setCountdownValue(READY_COUNTDOWN_START)
      setPhase(ROUND_PHASE.COUNTDOWN)
    }

    const applyRoundSeed = (seed, roundToken = null) => {
      roundSeedRef.current = Number(seed) >>> 0
      rngRef.current = createSeededRng(roundSeedRef.current)
      roundTokenRef.current = roundToken
    }

    setGhostScore(0)

    if (activeGhostReplay?.seed) {
      applyRoundSeed(activeGhostReplay.seed)
      beginCountdown()
      return
    }

    if (requiresRoundToken) {
      requestRoundStart(nextModeId)
        .then(({ roundToken, seed }) => {
          if (roundNonceRef.current !== startedRoundNonce || !roundToken) return
          applyRoundSeed(seed, roundToken)
          beginCountdown()
        })
        .catch(() => {
          // Ranked rounds cannot start without a server-issued token.
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
    onLoadoutStateChange,
    onModeChange,
    playerHasRankedHistory,
    playerBestScore,
    playerLevel,
    playerRankMmr,
    playerRankedState,
    playerXpIntoLevel,
    playerXpToNextLevel,
    resetRoundState,
    savedLoadouts,
    selectedModeId,
    selectedDrillId,
  ])

  const returnToReadyOverlay = useCallback(() => {
    const nextRoundMode = resolvedSelectedMode
    setRoundMode(nextRoundMode)
    resetRoundState(nextRoundMode)
    setPhase(ROUND_PHASE.READY)
  }, [resetRoundState, resolvedSelectedMode])

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
    if (powerup.effectType === "time_boost") {
      setTimeLeft((currentTime) =>
        Math.min(roundMode.maxTimeBufferSeconds, currentTime + 2)
      )
      addCenterFeedback("+2s", "positive")
      return
    }

    if (powerup.effectType === "size_boost") {
      setButtonSize((currentButtonSize) => (
        Math.min(roundMode.initialButtonSize, currentButtonSize + 10)
      ))
      markButtonSpawned()
      addCenterFeedback("Grow", "positive")
      return
    }

    if (powerup.effectType === "freeze_movement") {
      freezeMovementUntilRef.current = eventTimeMs + FREEZE_MOVEMENT_DURATION_MS
      addCenterFeedback("Freeze", "positive")
      return
    }

    if (powerup.effectType === "magnet_center") {
      freezeMovementUntilRef.current = eventTimeMs + MAGNET_CENTER_FREEZE_MS
      setButtonSize((currentButtonSize) => {
        const nextButtonSize = Math.min(roundMode.initialButtonSize, currentButtonSize + 6)
        centerButtonPosition(nextButtonSize)
        return nextButtonSize
      })
      markButtonSpawned()
      addCenterFeedback("Center", "positive")
      return
    }

    if (powerup.effectType === "combo_surge") {
      addCenterFeedback("Surge", "positive")
      return
    }

    if (powerup.effectType === "guard_charge") {
      addCenterFeedback("Guard", "positive")
    }
  }, [
    addCenterFeedback,
    centerButtonPosition,
    markButtonSpawned,
    roundMode.initialButtonSize,
    roundMode.maxTimeBufferSeconds,
  ])

  const tryUsePowerup = useCallback((powerup) => {
    if (!powerup || !isPlaying || !simulationRef.current) return

    const eventTimeMs = getElapsedMs()
    const outcome = simulationRef.current.applyPowerup(powerup.id, eventTimeMs)

    if (!outcome.applied) {
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
    setPowerupCharges(outcome.powerupCharges)
    setComboSurgeHitsRemaining(outcome.comboSurgeHitsRemaining)
    setGuardActiveUntilMs(outcome.guardActiveUntilMs)
    applyPowerupPresentation(powerup, eventTimeMs)
  }, [addCenterFeedback, applyPowerupPresentation, getElapsedMs, isPlaying])

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

    roundEventsRef.current.push({
      type: "hit",
      t: eventTimeMs,
      ...(clickCoordinates ?? {}),
    })
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

    const result = simulationRef.current.applyHit(eventTimeMs)
    syncSimulationState(result)

    addClickFeedback(event.clientX, event.clientY, `+${result.pointsEarned}`, "positive")
    result.grantedPowerups.forEach((powerup) => {
      addCenterFeedback(`${powerup.slotKey}+`, "positive")
    })

    setButtonSize((currentButtonSize) => {
      const nextButtonSize = getNextButtonSize(currentButtonSize, roundMode)
      queueButtonReposition(nextButtonSize)
      return nextButtonSize
    })
  }, [
    addCenterFeedback,
    addClickFeedback,
    getElapsedMs,
    isPlaying,
    queueButtonReposition,
    roundMode,
    syncSimulationState,
  ])

  const handleArenaClick = useCallback((event) => {
    if (!isPlaying || !simulationRef.current) return

    const eventTimeMs = getElapsedMs()
    const arenaElement = arenaRef.current
    const clickCoordinates = getArenaClickCoordinates(event, arenaElement)

    roundEventsRef.current.push({
      type: "miss",
      t: eventTimeMs,
      ...(clickCoordinates ?? {}),
    })

    const result = simulationRef.current.applyMiss(eventTimeMs)
    syncSimulationState(result)

    if (result.guarded) {
      addClickFeedback(event.clientX, event.clientY, "Guarded", "positive")
      return
    }

    triggerScreenShake()

    if (result.penaltyApplied > 0) {
      addClickFeedback(event.clientX, event.clientY, `-${result.penaltyApplied}`, "negative")
      return
    }

    addClickFeedback(event.clientX, event.clientY, "Miss", "negative")
  }, [
    addClickFeedback,
    getElapsedMs,
    isPlaying,
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

    const countdownInterval = setInterval(() => {
      setCountdownValue((currentCountdown) => {
        if (currentCountdown <= 1) {
          clearInterval(countdownInterval)
          roundStartTimeRef.current = Date.now()

          const arenaElement = arenaRef.current
          if (arenaElement) {
            const arenaRect = arenaElement.getBoundingClientRect()
            arenaDimensionsRef.current = {
              arenaWidth: Math.round(arenaRect.width),
              arenaHeight: Math.round(arenaRect.height),
            }
          }

          setPhase(ROUND_PHASE.PLAYING)
          return 0
        }
        return currentCountdown - 1
      })
    }, TIMER_TICK_MS)

    return () => clearInterval(countdownInterval)
  }, [phase])

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
    if (!autoStartGhostDuel || !ghostReplay?.seed) return undefined
    if (phase !== ROUND_PHASE.READY) return undefined

    const timeoutId = window.setTimeout(() => {
      startRoundWithCountdown(ghostReplay.modeId || selectedModeId, activeLoadoutId)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [
    activeLoadoutId,
    autoStartGhostDuel,
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
    if (!isPlaying) return
    markButtonSpawned()
  }, [isPlaying, markButtonSpawned])

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
    if (phase !== ROUND_PHASE.GAME_OVER) return
    if (hasAwardedRoundRef.current) return

    hasAwardedRoundRef.current = true
    onRoundComplete?.({
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
      challengeId: challengeIdRef.current,
      drillId: activeDrillIdRef.current,
    })

    setSessionStats((prev) => ({
      rounds: prev.rounds + 1,
      bestScore: Math.max(prev.bestScore, score),
      netRR: prev.netRR + (roundMode.allowsRankProgression === true ? projectedRankOutcome.appliedRankDelta : 0),
    }))

    const nextOnboardingStatus = getNextOnboardingStatusAfterRound(
      buildWalkthroughStatus,
      roundMode.id
    )
    if (nextOnboardingStatus !== buildWalkthroughStatus) {
      onBuildWalkthroughChange?.({ status: nextOnboardingStatus })
    }
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
    projectedRankOutcome,
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
        hasAwardedRoundRef.current = true
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

  return {
    phase,
    allowsCoinRewards,
    gameScreenClassName,
    hudProps: {
      score,
      ghostScore: ghostReplay ? ghostScore : null,
      ghostUsername: ghostReplay?.username ?? null,
      ghostTargetScore: ghostReplay?.score ?? null,
      isGhostDuel: Boolean(ghostReplay),
      timeLeft: phase === ROUND_PHASE.READY ? displayMode.durationSeconds : timeLeft,
      isTimedRound: displayMode.isTimedRound !== false,
      modeLabel: displayMode.label,
      rankLabel: playerRankLabel,
      streak,
      comboMultiplier,
      comboActive: comboMultiplier > 1,
      bestStreak,
      isPlaying,
      loadoutName: displayMode.loadoutSnapshot?.loadoutName ?? resolvedLoadout?.name ?? "Loadout",
      loadoutPresentation: phase === ROUND_PHASE.READY
        ? previewLoadoutPresentation
        : activeRoundLoadoutPresentation,
      pbPaceStatus,
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
    },
    powerupTrayProps: {
      powerupSlots,
      streak,
      onUsePowerup: handleUsePowerup,
    },
    readyOverlayProps: {
      onStart: startRoundWithCountdown,
      modes: MODES,
      selectedModeId,
      onSelectMode: handleModeSelect,
      canChangeMode,
      activeLoadoutName: resolvedLoadout?.name ?? "Loadout",
      showArmoryWalkthroughBadge: shouldShowArmoryOnboardingBadge(buildWalkthroughStatus),
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
    },
    countdownOverlayProps: {
      countdownValue,
    },
    gameOverOverlayProps: {
      score,
      hits,
      misses,
      bestStreak,
      accuracy,
      modeLabel: roundMode.label,
      playerLevel: roundStartLevel,
      playerXpIntoLevel: roundStartXpIntoLevel,
      playerXpToNextLevel: roundStartXpToNextLevel,
      roundXpEarned,
      roundCoinsEarned,
      allowsCoinRewards,
      allowsLevelProgression,
      previousRankProgress: projectedRankOutcome.previousRankProgress,
      projectedRankProgress: projectedRankOutcome.nextRankProgress,
      roundRankDelta: projectedRankOutcome.appliedRankDelta,
      allowsRankProgression,
      selectedModeId,
      bestScore: roundStartBestScore,
      avgReactionMs,
      bestReactionMs,
      loadoutSnapshot: roundStartLoadoutSnapshot,
      loadoutPresentation: activeRoundLoadoutPresentation,
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
