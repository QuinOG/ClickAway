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
  getDifficultyById as getModeById,
} from "../../../constants/gameModesConfig.js"
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
import { calculateRoundXp } from "../../../utils/progressionUtils.js"
import {
  applyRankedMatchResult,
  calculatePlacementMatchScore,
  calculateRoundRankDelta,
} from "../../../utils/rankUtils.js"
import { calculateRoundCoins } from "../../../utils/roundRewards.js"

const COMBO_SURGE_STREAK_BONUS = 4
const COMBO_SURGE_HIT_COUNT = 4
const MAGNET_CENTER_FREEZE_MS = 400
const GUARD_CHARGE_DURATION_MS = 8000
const FREEZE_MOVEMENT_DURATION_MS = 1000

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
  savedLoadouts = [],
  activeLoadoutId = "",
  activeLoadout = null,
  onLoadoutStateChange,
  buildWalkthrough = null,
  buttonSkinClass = "skin-default",
  buttonSkinImageSrc = "",
  buttonSkinImageScale = 100,
  arenaThemeClass = "theme-default",
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

  const isPlaying = phase === ROUND_PHASE.PLAYING && !isRoundEnding
  const canChangeMode = phase === ROUND_PHASE.READY || phase === ROUND_PHASE.GAME_OVER
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
    setButtonPosition(getRandomPosition(arenaRect, nextButtonSize))
    markButtonSpawned()
  }, [markButtonSpawned])

  const queueButtonReposition = useCallback(
    (nextButtonSize) => {
      if (performance.now() < freezeMovementUntilRef.current) return

      setTimeout(() => {
        if (performance.now() < freezeMovementUntilRef.current) return
        randomizeButtonPosition(nextButtonSize)
      }, 0)
    },
    [randomizeButtonPosition]
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

  const grantPowerupCharge = useCallback((powerup) => {
    setPowerupCharges((currentCharges) => ({
      ...currentCharges,
      [powerup.id]: (currentCharges[powerup.id] ?? 0) + 1,
    }))
    addCenterFeedback(`${powerup.slotKey}+`, "positive")
  }, [addCenterFeedback])

  const awardPowerupCharges = useCallback((nextStreak) => {
    roundMode.equippedPowerups.forEach((powerup) => {
      if (nextStreak > 0 && nextStreak % powerup.awardEvery === 0) {
        grantPowerupCharge(powerup)
      }
    })
  }, [grantPowerupCharge, roundMode.equippedPowerups])

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
    nextLoadoutId = activeLoadoutId
  ) => {
    const nextResolvedLoadout = getResolvedLoadout(
      savedLoadouts,
      nextLoadoutId,
      nextLoadoutId === activeLoadoutId ? activeLoadout : null
    )
    const nextRoundMode = buildRoundRules(getModeById(nextModeId), nextResolvedLoadout)

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

  const applyPowerup = useCallback((powerup) => {
    if (!powerup) return false

    if (powerup.effectType === "time_boost") {
      if (!isTimedRound) {
        addCenterFeedback("No Timer", "negative")
        return false
      }

      setTimeLeft((currentTime) =>
        Math.min(roundMode.maxTimeBufferSeconds, currentTime + 2)
      )
      addCenterFeedback("+2s", "positive")
      return true
    }

    if (powerup.effectType === "size_boost") {
      setButtonSize((currentButtonSize) => {
        const nextButtonSize = Math.min(roundMode.initialButtonSize, currentButtonSize + 10)
        return nextButtonSize
      })
      markButtonSpawned()
      addCenterFeedback("Grow", "positive")
      return true
    }

    if (powerup.effectType === "freeze_movement") {
      freezeMovementUntilRef.current = performance.now() + FREEZE_MOVEMENT_DURATION_MS
      addCenterFeedback("Freeze", "positive")
      return true
    }

    if (powerup.effectType === "magnet_center") {
      freezeMovementUntilRef.current = performance.now() + MAGNET_CENTER_FREEZE_MS
      setButtonSize((currentButtonSize) => {
        const nextButtonSize = Math.min(roundMode.initialButtonSize, currentButtonSize + 6)
        centerButtonPosition(nextButtonSize)
        return nextButtonSize
      })
      markButtonSpawned()
      addCenterFeedback("Center", "positive")
      return true
    }

    if (powerup.effectType === "combo_surge") {
      setComboSurgeHitsRemaining((currentHitsRemaining) => (
        currentHitsRemaining + COMBO_SURGE_HIT_COUNT
      ))
      addCenterFeedback("Surge", "positive")
      return true
    }

    if (powerup.effectType === "guard_charge") {
      setGuardActiveUntilMs(performance.now() + GUARD_CHARGE_DURATION_MS)
      addCenterFeedback("Guard", "positive")
      return true
    }

    return false
  }, [
    addCenterFeedback,
    centerButtonPosition,
    isTimedRound,
    markButtonSpawned,
    roundMode.initialButtonSize,
    roundMode.maxTimeBufferSeconds,
  ])

  const tryUsePowerupKey = useCallback((key) => {
    if (!isPlaying) return

    const powerup = roundMode.equippedPowerups.find((item) => item.slotKey === key)
    if (!powerup) return

    const availableCharges = powerupCharges[powerup.id] ?? 0
    if (availableCharges <= 0) return

    const wasApplied = applyPowerup(powerup)
    if (!wasApplied) return

    setPowerupCharges((currentCharges) => ({
      ...currentCharges,
      [powerup.id]: Math.max(0, (currentCharges[powerup.id] ?? 0) - 1),
    }))
  }, [applyPowerup, isPlaying, powerupCharges, roundMode.equippedPowerups])

  const handleUsePowerup = useCallback((powerupId) => {
    if (!isPlaying) return

    const powerup = roundMode.equippedPowerups.find((item) => item.id === powerupId)
    if (!powerup) return

    const availableCharges = powerupCharges[powerup.id] ?? 0
    if (availableCharges <= 0) return

    const wasApplied = applyPowerup(powerup)
    if (!wasApplied) return

    setPowerupCharges((currentCharges) => ({
      ...currentCharges,
      [powerup.id]: Math.max(0, (currentCharges[powerup.id] ?? 0) - 1),
    }))
  }, [applyPowerup, isPlaying, powerupCharges, roundMode.equippedPowerups])

  const handleButtonClick = useCallback((event) => {
    event.stopPropagation()
    if (!isPlaying) return

    const nextStreak = streak + 1
    const effectiveStreak = comboSurgeHitsRemaining > 0
      ? nextStreak + COMBO_SURGE_STREAK_BONUS
      : nextStreak
    const pointsEarned = Math.max(
      1,
      Math.round(
        roundMode.basePointsPerHit *
        getComboMultiplier(effectiveStreak, roundMode.comboStep) *
        (roundMode.scoreMultiplier ?? 1)
      )
    )
    const hitReactionMs = buttonSpawnedAtRef.current > 0
      ? Math.max(0, Math.round(performance.now() - buttonSpawnedAtRef.current))
      : null

    roundEventsRef.current.push({ type: "hit", t: Date.now() - roundStartTimeRef.current })
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

    if (comboSurgeHitsRemaining > 0) {
      setComboSurgeHitsRemaining((currentHitsRemaining) => Math.max(0, currentHitsRemaining - 1))
    }

    setStreak(nextStreak)
    setBestStreak((currentBestStreak) => Math.max(currentBestStreak, nextStreak))
    setHits((currentHits) => currentHits + 1)
    setScore((currentScore) => currentScore + pointsEarned)

    addClickFeedback(event.clientX, event.clientY, `+${pointsEarned}`, "positive")
    awardPowerupCharges(nextStreak)

    setButtonSize((currentButtonSize) => {
      const nextButtonSize = getNextButtonSize(currentButtonSize, roundMode)
      queueButtonReposition(nextButtonSize)
      return nextButtonSize
    })
  }, [
    addClickFeedback,
    awardPowerupCharges,
    comboSurgeHitsRemaining,
    isPlaying,
    queueButtonReposition,
    roundMode,
    streak,
  ])

  const handleArenaClick = useCallback((event) => {
    if (!isPlaying) return

    roundEventsRef.current.push({ type: "miss", t: Date.now() - roundStartTimeRef.current })
    setMisses((currentMisses) => currentMisses + 1)

    if (guardActiveUntilMs > performance.now()) {
      setGuardActiveUntilMs(0)
      addClickFeedback(event.clientX, event.clientY, "Guarded", "positive")
      return
    }

    const missPenalty = roundMode.missPenalty
    setStreak(0)
    triggerScreenShake()

    if (missPenalty > 0) {
      setScore((currentScore) => Math.max(0, currentScore - missPenalty))
      addClickFeedback(event.clientX, event.clientY, `-${missPenalty}`, "negative")
      return
    }

    addClickFeedback(event.clientX, event.clientY, "Miss", "negative")
  }, [addClickFeedback, guardActiveUntilMs, isPlaying, roundMode.missPenalty, triggerScreenShake])

  const handleModeSelect = useCallback((modeId) => {
    onModeChange?.(modeId)
  }, [onModeChange])

  useEffect(() => {
    if (phase !== ROUND_PHASE.COUNTDOWN) return

    const countdownInterval = setInterval(() => {
      setCountdownValue((currentCountdown) => {
        if (currentCountdown <= 1) {
          clearInterval(countdownInterval)
          roundStartTimeRef.current = Date.now()
          setPhase(ROUND_PHASE.PLAYING)
          return 0
        }
        return currentCountdown - 1
      })
    }, TIMER_TICK_MS)

    return () => clearInterval(countdownInterval)
  }, [phase])

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

    const remainingMs = Math.max(0, guardActiveUntilMs - performance.now())
    const timeoutId = window.setTimeout(() => {
      setGuardActiveUntilMs(0)
    }, remainingMs)

    return () => window.clearTimeout(timeoutId)
  }, [guardActiveUntilMs])

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
    })
  }, [
    avgReactionMs,
    bestReactionMs,
    bestStreak,
    hits,
    misses,
    onRoundComplete,
    phase,
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

  return {
    phase,
    allowsCoinRewards,
    gameScreenClassName,
    hudProps: {
      score,
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
      onEndRound: endCurrentRound,
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
      showArmoryWalkthroughBadge: buildWalkthrough?.status === "not_started",
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
      onPlayAgain: returnToReadyOverlay,
      onChooseMode: returnToReadyOverlay,
    },
  }
}
