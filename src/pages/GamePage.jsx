import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { DEFAULT_DIFFICULTY_ID, DIFFICULTIES, getDifficultyById } from "../constants/difficultyConfig.js"
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
} from "../constants/gameConstants.js"
import {
  formatAccuracy,
  getButtonLabel,
  getButtonLabelFontSize,
  getCenteredPosition,
  getComboMultiplier,
  getNextButtonSize,
  getRandomPosition,
  getStreakAtmosphereTier,
} from "../utils/gameMath.js"
import GameArena from "../features/game/components/GameArena.jsx"
import GameHud from "../features/game/components/GameHud.jsx"
import PowerupTray from "../features/game/components/PowerupTray.jsx"
import {
  CountdownOverlay,
  GameOverOverlay,
  ReadyOverlay,
} from "../features/game/components/RoundOverlays.jsx"

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

export default function GamePage({
  onRoundComplete,
  selectedDifficultyId = DEFAULT_DIFFICULTY_ID,
  onDifficultyChange,
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

  const selectedDifficulty = useMemo(
    () => getDifficultyById(selectedDifficultyId),
    [selectedDifficultyId]
  )

  const [phase, setPhase] = useState(ROUND_PHASE.READY)
  const [countdownValue, setCountdownValue] = useState(READY_COUNTDOWN_START)
  const [isShakeActive, setIsShakeActive] = useState(false)

  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [powerupsUsed, setPowerupsUsed] = useState(0)

  const [roundDifficulty, setRoundDifficulty] = useState(selectedDifficulty)
  const [buttonSize, setButtonSize] = useState(selectedDifficulty.initialButtonSize)
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 })
  const [timeLeft, setTimeLeft] = useState(selectedDifficulty.durationSeconds)
  const [clickFeedbackItems, setClickFeedbackItems] = useState([])
  const [powerupCharges, setPowerupCharges] = useState(buildInitialPowerupCharges)

  const isPlaying = phase === ROUND_PHASE.PLAYING
  const canChangeDifficulty =
    phase === ROUND_PHASE.READY || phase === ROUND_PHASE.GAME_OVER

  const comboMultiplier = useMemo(
    () => getComboMultiplier(streak, roundDifficulty.comboStep),
    [roundDifficulty.comboStep, streak]
  )

  const accuracy = useMemo(() => formatAccuracy(hits, misses), [hits, misses])
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
    (difficultySettings) => {
      setScore(0)
      setStreak(0)
      setBestStreak(0)
      setHits(0)
      setMisses(0)
      setPowerupsUsed(0)
      setButtonSize(difficultySettings.initialButtonSize)
      setTimeLeft(difficultySettings.durationSeconds)
      setClickFeedbackItems([])
      setPowerupCharges(buildInitialPowerupCharges())
      freezeMovementUntilRef.current = 0
      setIsShakeActive(false)
      clearShakeTimeout()
      clearFeedbackTimeouts()
      centerButtonPosition(difficultySettings.initialButtonSize)
    },
    [centerButtonPosition, clearFeedbackTimeouts, clearShakeTimeout]
  )

  const startRoundWithCountdown = useCallback(() => {
    const nextRoundDifficulty = selectedDifficulty

    setRoundDifficulty(nextRoundDifficulty)
    resetRoundState(nextRoundDifficulty)
    hasAwardedRoundRef.current = false
    setCountdownValue(READY_COUNTDOWN_START)
    setPhase(ROUND_PHASE.COUNTDOWN)
  }, [resetRoundState, selectedDifficulty])

  const applyPowerup = useCallback(
    (powerupId) => {
      if (powerupId === "time_boost") {
        setTimeLeft((currentTime) =>
          Math.min(roundDifficulty.maxTimeBufferSeconds, currentTime + 2)
        )
        addCenterFeedback("+2s", "positive")
        return
      }

      if (powerupId === "size_boost") {
        setButtonSize((currentButtonSize) => {
          const nextButtonSize = Math.min(
            roundDifficulty.initialButtonSize,
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
    [addCenterFeedback, roundDifficulty]
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
      setPowerupsUsed((currentPowerupsUsed) => currentPowerupsUsed + 1)
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
        roundDifficulty.basePointsPerHit *
        getComboMultiplier(nextStreak, roundDifficulty.comboStep)

      setStreak(nextStreak)
      setBestStreak((currentBestStreak) => Math.max(currentBestStreak, nextStreak))
      setHits((currentHits) => currentHits + 1)
      setScore((currentScore) => currentScore + pointsEarned)

      addClickFeedback(event.clientX, event.clientY, `+${pointsEarned}`, "positive")
      awardPowerupCharges(nextStreak)

      setButtonSize((currentButtonSize) => {
        const nextButtonSize = getNextButtonSize(currentButtonSize, roundDifficulty)
        queueButtonReposition(nextButtonSize)
        return nextButtonSize
      })
    },
    [
      addClickFeedback,
      awardPowerupCharges,
      isPlaying,
      queueButtonReposition,
      roundDifficulty,
      streak,
    ]
  )

  const handleArenaClick = useCallback(
    (event) => {
      if (!isPlaying) return

      const missPenalty = roundDifficulty.missPenalty
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
    [addClickFeedback, isPlaying, roundDifficulty, triggerScreenShake]
  )

  const handleDifficultySelect = useCallback(
    (difficultyId) => {
      onDifficultyChange?.(difficultyId)
      if (phase !== ROUND_PHASE.READY) return

      const nextDifficulty = getDifficultyById(difficultyId)
      setRoundDifficulty(nextDifficulty)
      setButtonSize(nextDifficulty.initialButtonSize)
      setTimeLeft(nextDifficulty.durationSeconds)
      centerButtonPosition(nextDifficulty.initialButtonSize)
    },
    [centerButtonPosition, onDifficultyChange, phase]
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
    if (!isPlaying) return

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
  }, [isPlaying])

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
      difficultyId: roundDifficulty.id,
      coinMultiplier: roundDifficulty.coinMultiplier,
    })
  }, [
    bestStreak,
    hits,
    misses,
    onRoundComplete,
    phase,
    roundDifficulty.coinMultiplier,
    roundDifficulty.id,
    score,
  ])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.repeat) return
      tryUsePowerupKey(event.key)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [tryUsePowerupKey])

  useEffect(() => {
    centerButtonPosition(selectedDifficulty.initialButtonSize)
  }, [centerButtonPosition, selectedDifficulty.initialButtonSize])

  useEffect(() => {
    return () => {
      clearShakeTimeout()
      clearFeedbackTimeouts()
    }
  }, [clearFeedbackTimeouts, clearShakeTimeout])

  return (
    <div className={gameScreenClassName}>
      <GameHud
        score={score}
        timeLeft={timeLeft}
        difficultyLabel={roundDifficulty.label}
        streak={streak}
        comboMultiplier={comboMultiplier}
        bestStreak={bestStreak}
      />

      <GameArena
        arenaRef={arenaRef}
        arenaThemeClass={arenaThemeClass}
        onArenaClick={handleArenaClick}
        buttonStyle={buttonStyle}
        onButtonClick={handleButtonClick}
        isButtonDisabled={!isPlaying}
        buttonLabel={buttonLabel}
        buttonLabelFontSize={buttonLabelFontSize}
        buttonSkinClass={buttonSkinClass}
        buttonSkinImageSrc={buttonSkinImageSrc}
        buttonSkinImageScale={buttonSkinImageScale}
        clickFeedbackItems={clickFeedbackItems}
      />

      <PowerupTray powerupCharges={powerupCharges} />

      {phase === ROUND_PHASE.READY ? (
        <ReadyOverlay
          onStart={startRoundWithCountdown}
          difficulties={DIFFICULTIES}
          selectedDifficultyId={selectedDifficultyId}
          onSelectDifficulty={handleDifficultySelect}
          canChangeDifficulty={canChangeDifficulty}
        />
      ) : null}

      {phase === ROUND_PHASE.COUNTDOWN ? (
        <CountdownOverlay countdownValue={countdownValue} />
      ) : null}

      {phase === ROUND_PHASE.GAME_OVER ? (
        <GameOverOverlay
          score={score}
          hits={hits}
          misses={misses}
          bestStreak={bestStreak}
          powerupsUsed={powerupsUsed}
          accuracy={accuracy}
          difficultyLabel={roundDifficulty.label}
          difficulties={DIFFICULTIES}
          selectedDifficultyId={selectedDifficultyId}
          onSelectDifficulty={handleDifficultySelect}
          canChangeDifficulty={canChangeDifficulty}
          onPlayAgain={startRoundWithCountdown}
        />
      ) : null}
    </div>
  )
}
