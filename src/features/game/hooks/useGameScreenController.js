import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  DEFAULT_DIFFICULTY_ID as DEFAULT_MODE_ID,
  DIFFICULTIES as MODES,
  getDifficultyById as getModeById,
} from "../../../constants/difficultyConfig.js"
import {
  FEEDBACK_LIFETIME_MS,
  FEEDBACK_OFFSET,
  FREEZE_MOVEMENT_DURATION_MS,
  POWERUPS,
  POWERUP_BY_KEY,
  READY_COUNTDOWN_START,
  ROUND_PHASE,
  SHAKE_DURATION_MS,
  TIMER_TICK_MS,
  buildInitialPowerupCharges,
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
import { calculateRoundRankDelta } from "../../../utils/rankUtils.js"
import { calculateRoundCoins } from "../../../utils/roundRewards.js"

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

export function useGameScreenController({
  onRoundComplete,
  selectedModeId = DEFAULT_MODE_ID,
  onModeChange,
  playerLevel = 1,
  playerXpIntoLevel = 0,
  playerXpToNextLevel = 0,
  playerLevelProgressPercent = 0,
  playerRankLabel = "Unranked",
  playerRankMmr = 0,
  playerRankToNextTier = 0,
  buttonSkinClass = "skin-default",
  buttonSkinImageSrc = "",
  buttonSkinImageScale = 100,
  arenaThemeClass = "theme-default",
}) {
  const arenaRef = useRef(null)
  const feedbackTimeoutIdsRef = useRef([])
  const hasAwardedRoundRef = useRef(false)
  const shakeTimeoutRef = useRef(null)
  const freezeMovementUntilRef = useRef(0)

  const selectedMode = useMemo(
    () => getModeById(selectedModeId),
    [selectedModeId]
  )

  const [phase, setPhase] = useState(ROUND_PHASE.READY)
  const [countdownValue, setCountdownValue] = useState(READY_COUNTDOWN_START)
  const [isShakeActive, setIsShakeActive] = useState(false)

  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)

  const [roundMode, setRoundMode] = useState(selectedMode)
  const [buttonSize, setButtonSize] = useState(selectedMode.initialButtonSize)
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 })
  const [timeLeft, setTimeLeft] = useState(selectedMode.durationSeconds)
  const [clickFeedbackItems, setClickFeedbackItems] = useState([])
  const [powerupCharges, setPowerupCharges] = useState(buildInitialPowerupCharges)

  const isPlaying = phase === ROUND_PHASE.PLAYING
  const canChangeMode =
    phase === ROUND_PHASE.READY || phase === ROUND_PHASE.GAME_OVER
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
  const roundCoinsEarned = useMemo(
    () => (allowsCoinRewards ? calculateRoundCoins(hits, roundMode.coinMultiplier) : 0),
    [allowsCoinRewards, hits, roundMode.coinMultiplier]
  )
  const atmosphereTier = useMemo(() => getStreakAtmosphereTier(streak), [streak])

  const gameScreenClassName = useMemo(
    () => buildGameScreenClassName(atmosphereTier, isShakeActive),
    [atmosphereTier, isShakeActive]
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
  }, [])

  const queueButtonReposition = useCallback(
    (nextButtonSize) => {
      if (Date.now() < freezeMovementUntilRef.current) return

      setTimeout(() => {
        if (Date.now() < freezeMovementUntilRef.current) return
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

  const addCenterFeedback = useCallback(
    (value, type) => {
      const arenaElement = arenaRef.current
      if (!arenaElement) return

      const arenaRect = arenaElement.getBoundingClientRect()
      addClickFeedback(
        arenaRect.left + arenaRect.width / 2,
        arenaRect.top + arenaRect.height / 2,
        value,
        type
      )
    },
    [addClickFeedback]
  )

  const grantPowerupCharge = useCallback(
    (powerup) => {
      setPowerupCharges((currentCharges) => ({
        ...currentCharges,
        [powerup.id]: currentCharges[powerup.id] + 1,
      }))
      addCenterFeedback(`${powerup.key}+`, "positive")
    },
    [addCenterFeedback]
  )

  const awardPowerupCharges = useCallback(
    (nextStreak) => {
      POWERUPS.forEach((powerup) => {
        if (nextStreak > 0 && nextStreak % powerup.awardEvery === 0) {
          grantPowerupCharge(powerup)
        }
      })
    },
    [grantPowerupCharge]
  )

  const resetRoundState = useCallback(
    (modeSettings) => {
      setScore(0)
      setStreak(0)
      setBestStreak(0)
      setHits(0)
      setMisses(0)
      setButtonSize(modeSettings.initialButtonSize)
      setTimeLeft(modeSettings.durationSeconds)
      setClickFeedbackItems([])
      setPowerupCharges(buildInitialPowerupCharges())
      freezeMovementUntilRef.current = 0
      setIsShakeActive(false)
      clearShakeTimeout()
      clearFeedbackTimeouts()
      centerButtonPosition(modeSettings.initialButtonSize)
    },
    [centerButtonPosition, clearFeedbackTimeouts, clearShakeTimeout]
  )

  const startRoundWithCountdown = useCallback(() => {
    const nextRoundMode = selectedMode

    setRoundMode(nextRoundMode)
    resetRoundState(nextRoundMode)
    hasAwardedRoundRef.current = false
    setCountdownValue(READY_COUNTDOWN_START)
    setPhase(ROUND_PHASE.COUNTDOWN)
  }, [resetRoundState, selectedMode])

  const returnToReadyOverlay = useCallback(() => {
    const nextRoundMode = selectedMode
    setRoundMode(nextRoundMode)
    resetRoundState(nextRoundMode)
    setPhase(ROUND_PHASE.READY)
  }, [resetRoundState, selectedMode])

  const endCurrentRound = useCallback(() => {
    if (phase !== ROUND_PHASE.PLAYING) return
    setPhase(ROUND_PHASE.GAME_OVER)
  }, [phase])

  const applyPowerup = useCallback(
    (powerupId) => {
      if (powerupId === "time_boost") {
        if (!isTimedRound) {
          addCenterFeedback("No Timer", "negative")
          return
        }
        setTimeLeft((currentTime) =>
          Math.min(roundMode.maxTimeBufferSeconds, currentTime + 2)
        )
        addCenterFeedback("+2s", "positive")
        return
      }

      if (powerupId === "size_boost") {
        setButtonSize((currentButtonSize) => {
          const nextButtonSize = Math.min(
            roundMode.initialButtonSize,
            currentButtonSize + 10
          )
          return nextButtonSize
        })
        addCenterFeedback("Grow", "positive")
        return
      }

      if (powerupId === "freeze_movement") {
        freezeMovementUntilRef.current = Date.now() + FREEZE_MOVEMENT_DURATION_MS
        addCenterFeedback("Freeze", "positive")
      }
    },
    [addCenterFeedback, isTimedRound, roundMode]
  )

  const tryUsePowerupKey = useCallback(
    (key) => {
      if (!isPlaying) return

      const powerup = POWERUP_BY_KEY[key]
      if (!powerup) return

      const availableCharges = powerupCharges[powerup.id] ?? 0
      if (availableCharges <= 0) return

      setPowerupCharges((currentCharges) => ({
        ...currentCharges,
        [powerup.id]: Math.max(0, (currentCharges[powerup.id] ?? 0) - 1),
      }))
      applyPowerup(powerup.id)
    },
    [applyPowerup, isPlaying, powerupCharges]
  )

  const handleButtonClick = useCallback(
    (event) => {
      event.stopPropagation()
      if (!isPlaying) return

      const nextStreak = streak + 1
      const pointsEarned =
        roundMode.basePointsPerHit *
        getComboMultiplier(nextStreak, roundMode.comboStep)

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
    },
    [
      addClickFeedback,
      awardPowerupCharges,
      isPlaying,
      queueButtonReposition,
      roundMode,
      streak,
    ]
  )

  const handleArenaClick = useCallback(
    (event) => {
      if (!isPlaying) return

      const missPenalty = roundMode.missPenalty
      setStreak(0)
      setMisses((currentMisses) => currentMisses + 1)
      triggerScreenShake()

      if (missPenalty > 0) {
        setScore((currentScore) => Math.max(0, currentScore - missPenalty))
        addClickFeedback(event.clientX, event.clientY, `-${missPenalty}`, "negative")
        return
      }

      addClickFeedback(event.clientX, event.clientY, "Miss", "negative")
    },
    [addClickFeedback, isPlaying, roundMode, triggerScreenShake]
  )

  const handleModeSelect = useCallback(
    (modeId) => {
      onModeChange?.(modeId)
      if (phase !== ROUND_PHASE.READY) return

      const nextMode = getModeById(modeId)
      setRoundMode(nextMode)
      setButtonSize(nextMode.initialButtonSize)
      setTimeLeft(nextMode.durationSeconds)
      centerButtonPosition(nextMode.initialButtonSize)
    },
    [centerButtonPosition, onModeChange, phase]
  )

  useEffect(() => {
    if (phase !== ROUND_PHASE.COUNTDOWN) return

    const countdownInterval = setInterval(() => {
      setCountdownValue((currentCountdown) => {
        if (currentCountdown <= 1) {
          clearInterval(countdownInterval)
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
          setPhase(ROUND_PHASE.GAME_OVER)
          return 0
        }
        return currentTime - 1
      })
    }, TIMER_TICK_MS)

    return () => clearInterval(roundTimerInterval)
  }, [isPlaying, isTimedRound])

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
      modeId: roundMode.id,
      progressionMode: roundMode.progressionMode,
      coinMultiplier: roundMode.coinMultiplier,
      allowsCoinRewards: roundMode.allowsCoinRewards !== false,
      allowsLevelProgression: roundMode.allowsLevelProgression !== false,
      allowsRankProgression: roundMode.allowsRankProgression === true,
    })
  }, [
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
    score,
  ])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.repeat) return
      if (import.meta.env.DEV && event.key.toLowerCase() === "g") {
        hasAwardedRoundRef.current = true
        setTimeLeft(0)
        setPhase(ROUND_PHASE.GAME_OVER)
        return
      }
      tryUsePowerupKey(event.key)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [tryUsePowerupKey])

  useEffect(() => {
    centerButtonPosition(selectedMode.initialButtonSize)
  }, [centerButtonPosition, selectedMode.initialButtonSize])

  useEffect(() => {
    return () => {
      clearShakeTimeout()
      clearFeedbackTimeouts()
    }
  }, [clearFeedbackTimeouts, clearShakeTimeout])

  return {
    phase,
    gameScreenClassName,
    hudProps: {
      score,
      timeLeft,
      isTimedRound,
      modeLabel: roundMode.label,
      playerLevel,
      playerXpIntoLevel,
      playerXpToNextLevel,
      playerLevelProgressPercent,
      playerRankLabel,
      playerRankMmr,
      playerRankToNextTier,
      allowsRankProgression,
      streak,
      comboMultiplier,
      bestStreak,
      isPlaying,
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
      powerupCharges,
      streak,
    },
    readyOverlayProps: {
      onStart: startRoundWithCountdown,
      modes: MODES,
      selectedModeId,
      onSelectMode: handleModeSelect,
      canChangeMode,
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
      playerLevel,
      playerXpIntoLevel,
      playerXpToNextLevel,
      roundXpEarned,
      roundCoinsEarned,
      allowsCoinRewards,
      allowsLevelProgression,
      playerRankMmr,
      roundRankDelta,
      allowsRankProgression,
      selectedModeId,
      onPlayAgain: returnToReadyOverlay,
      onChooseMode: returnToReadyOverlay,
    },
  }
}
