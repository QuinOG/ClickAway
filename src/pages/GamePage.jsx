import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import MovingButton from "../components/MovingButton.jsx"
import GameStatusRow from "../features/game/components/GameStatusRow.jsx"
import PowerupTray from "../features/game/components/PowerupTray.jsx"
import {
  CountdownOverlay,
  GameOverOverlay,
  ReadyOverlay,
} from "../features/game/components/RoundOverlays.jsx"
import {
  FEEDBACK_LIFETIME_MS,
  FEEDBACK_OFFSET,
  POWERUPS,
  POWERUP_BY_KEY,
  READY_COUNTDOWN_START,
  ROUND_PHASE,
  TIMER_TICK_MS,
  buildInitialPowerupCharges,
} from "../features/game/gameConfig.js"
import {
  DIFFICULTIES,
  DEFAULT_DIFFICULTY_ID,
  getDifficultyById,
} from "../features/game/difficultyConfig.js"
import {
  formatAccuracy,
  getButtonLabel,
  getButtonLabelFontSize,
  getCenteredPosition,
  getComboMultiplier,
  getNextButtonSize,
  getRandomPosition,
  getStreakAtmosphereTier,
} from "../features/game/gameUtils.js"

const SHAKE_STREAK_MILESTONE = 10
const SHAKE_DURATION_MS = 260

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
  const feedbackTimeoutsRef = useRef([])
  const hasAwardedRoundRef = useRef(false)
  const shakeTimeoutRef = useRef(null)

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
  const [size, setSize] = useState(selectedDifficulty.initialButtonSize)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [timeLeft, setTimeLeft] = useState(selectedDifficulty.durationSeconds)
  const [clickFeedback, setClickFeedback] = useState([])
  const [powerupCharges, setPowerupCharges] = useState(buildInitialPowerupCharges)

  const isPlaying = phase === ROUND_PHASE.PLAYING
  const canChangeDifficulty =
    phase === ROUND_PHASE.READY || phase === ROUND_PHASE.GAME_OVER
  const comboMultiplier = useMemo(
    () => getComboMultiplier(streak, roundDifficulty.comboStep),
    [streak, roundDifficulty.comboStep]
  )
  const accuracy = useMemo(() => formatAccuracy(hits, misses), [hits, misses])
  const atmosphereTier = useMemo(() => getStreakAtmosphereTier(streak), [streak])
  const gameScreenClassName = useMemo(() => {
    const shakeClass = isShakeActive ? "isShaking" : ""
    return `gameScreen streakTier${atmosphereTier} ${shakeClass}`.trim()
  }, [atmosphereTier, isShakeActive])

  const buttonStyle = useMemo(
    () => ({
      width: `${size}px`,
      height: `${size}px`,
      left: `${pos.x}px`,
      top: `${pos.y}px`,
    }),
    [size, pos]
  )

  const buttonLabel = getButtonLabel(size)
  const buttonLabelFontSize = getButtonLabelFontSize(size)

  const clearFeedbackTimeouts = useCallback(() => {
    feedbackTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId))
    feedbackTimeoutsRef.current = []
  }, [])

  const clearShakeTimeout = useCallback(() => {
    if (!shakeTimeoutRef.current) return

    clearTimeout(shakeTimeoutRef.current)
    shakeTimeoutRef.current = null
  }, [])

  const triggerComboShake = useCallback(() => {
    clearShakeTimeout()
    setIsShakeActive(true)

    shakeTimeoutRef.current = setTimeout(() => {
      setIsShakeActive(false)
      shakeTimeoutRef.current = null
    }, SHAKE_DURATION_MS)
  }, [clearShakeTimeout])

  const centerPosition = useCallback((nextSize) => {
    const arena = arenaRef.current
    if (!arena) return

    const rect = arena.getBoundingClientRect()
    setPos(getCenteredPosition(rect, nextSize))
  }, [])

  const randomizePosition = useCallback((nextSize) => {
    const arena = arenaRef.current
    if (!arena) return

    const rect = arena.getBoundingClientRect()
    setPos(getRandomPosition(rect, nextSize))
  }, [])

  const addClickFeedback = useCallback((clientX, clientY, value, type) => {
    const arena = arenaRef.current
    if (!arena) return

    const rect = arena.getBoundingClientRect()
    const x = clientX - rect.left + FEEDBACK_OFFSET.x
    const y = clientY - rect.top + FEEDBACK_OFFSET.y
    const id = `${Date.now()}-${Math.random()}`

    setClickFeedback((items) => [...items, { id, x, y, value, type }])

    const timeoutId = setTimeout(() => {
      setClickFeedback((items) => items.filter((item) => item.id !== id))
      feedbackTimeoutsRef.current = feedbackTimeoutsRef.current.filter((t) => t !== timeoutId)
    }, FEEDBACK_LIFETIME_MS)

    feedbackTimeoutsRef.current.push(timeoutId)
  }, [])

  const addCenterFeedback = useCallback(
    (value, type) => {
      const arena = arenaRef.current
      if (!arena) return

      const rect = arena.getBoundingClientRect()
      addClickFeedback(rect.left + rect.width / 2, rect.top + rect.height / 2, value, type)
    },
    [addClickFeedback]
  )

  const grantPowerupCharge = useCallback(
    (powerup) => {
      setPowerupCharges((current) => ({
        ...current,
        [powerup.id]: current[powerup.id] + 1,
      }))
      addCenterFeedback(`${powerup.key}+`, "positive")
    },
    [addCenterFeedback]
  )

  const awardPowerups = useCallback(
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
      setSize(difficultySettings.initialButtonSize)
      setTimeLeft(difficultySettings.durationSeconds)
      setClickFeedback([])
      setPowerupCharges(buildInitialPowerupCharges())
      setIsShakeActive(false)
      clearShakeTimeout()
      clearFeedbackTimeouts()
      centerPosition(difficultySettings.initialButtonSize)
    },
    [centerPosition, clearFeedbackTimeouts, clearShakeTimeout]
  )

  const startRoundWithCountdown = useCallback(() => {
    const difficultyForRound = selectedDifficulty
    setRoundDifficulty(difficultyForRound)
    resetRoundState(difficultyForRound)
    hasAwardedRoundRef.current = false
    setCountdownValue(READY_COUNTDOWN_START)
    setPhase(ROUND_PHASE.COUNTDOWN)
  }, [resetRoundState, selectedDifficulty])

  const applyPowerup = useCallback(
    (powerupId) => {
      if (powerupId === "time_boost") {
        setTimeLeft((current) =>
          Math.min(roundDifficulty.maxTimeBufferSeconds, current + 2)
        )
        addCenterFeedback("+2s", "positive")
        return
      }

      if (powerupId === "size_boost") {
        setSize((current) => {
          const next = Math.min(roundDifficulty.initialButtonSize, current + 10)
          setTimeout(() => randomizePosition(next), 0)
          return next
        })
        addCenterFeedback("Grow", "positive")
        return
      }

      if (powerupId === "bonus_points") {
        setScore((current) => current + 5)
        addCenterFeedback("+5", "positive")
      }
    },
    [addCenterFeedback, randomizePosition, roundDifficulty]
  )

  const tryUsePowerupKey = useCallback(
    (key) => {
      if (!isPlaying) return

      const powerup = POWERUP_BY_KEY[key]
      if (!powerup) return

      const charges = powerupCharges[powerup.id] ?? 0
      if (charges <= 0) return

      setPowerupCharges((current) => ({
        ...current,
        [powerup.id]: Math.max(0, (current[powerup.id] ?? 0) - 1),
      }))
      setPowerupsUsed((current) => current + 1)
      applyPowerup(powerup.id)
    },
    [isPlaying, powerupCharges, applyPowerup]
  )

  const handleButtonClick = useCallback(
    (event) => {
      event.stopPropagation()
      if (!isPlaying) return

      const nextStreak = streak + 1
      const points =
        roundDifficulty.basePointsPerHit *
        getComboMultiplier(nextStreak, roundDifficulty.comboStep)

      setStreak(nextStreak)
      setBestStreak((current) => Math.max(current, nextStreak))
      setHits((current) => current + 1)
      setScore((current) => current + points)

      addClickFeedback(event.clientX, event.clientY, `+${points}`, "positive")
      awardPowerups(nextStreak)

      if (nextStreak % SHAKE_STREAK_MILESTONE === 0) {
        triggerComboShake()
      }

      setSize((current) => {
        const next = getNextButtonSize(current, roundDifficulty)
        setTimeout(() => randomizePosition(next), 0)
        return next
      })
    },
    [
      addClickFeedback,
      awardPowerups,
      isPlaying,
      randomizePosition,
      roundDifficulty,
      streak,
      triggerComboShake,
    ]
  )

  const handleArenaClick = useCallback(
    (event) => {
      if (!isPlaying) return

      const missPenalty = roundDifficulty.missPenalty

      setStreak(0)
      setMisses((current) => current + 1)

      if (missPenalty > 0) {
        setScore((current) => Math.max(0, current - missPenalty))
        addClickFeedback(event.clientX, event.clientY, `-${missPenalty}`, "negative")
        return
      }

      addClickFeedback(event.clientX, event.clientY, "Miss", "negative")
    },
    [addClickFeedback, isPlaying, roundDifficulty]
  )

  const handleDifficultySelect = useCallback(
    (difficultyId) => {
      onDifficultyChange?.(difficultyId)

      if (phase !== ROUND_PHASE.READY) return

      const nextDifficulty = getDifficultyById(difficultyId)
      setRoundDifficulty(nextDifficulty)
      setSize(nextDifficulty.initialButtonSize)
      setTimeLeft(nextDifficulty.durationSeconds)
      centerPosition(nextDifficulty.initialButtonSize)
    },
    [centerPosition, onDifficultyChange, phase]
  )

  useEffect(() => {
    if (phase !== ROUND_PHASE.COUNTDOWN) return

    const timer = setInterval(() => {
      setCountdownValue((current) => {
        if (current <= 1) {
          clearInterval(timer)
          setPhase(ROUND_PHASE.PLAYING)
          return 0
        }
        return current - 1
      })
    }, TIMER_TICK_MS)

    return () => clearInterval(timer)
  }, [phase])

  useEffect(() => {
    if (!isPlaying) return

    const timer = setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          clearInterval(timer)
          setPhase(ROUND_PHASE.GAME_OVER)
          return 0
        }
        return current - 1
      })
    }, TIMER_TICK_MS)

    return () => clearInterval(timer)
  }, [isPlaying])

  useEffect(() => {
    if (phase !== ROUND_PHASE.GAME_OVER) return
    if (hasAwardedRoundRef.current) return

    hasAwardedRoundRef.current = true
    onRoundComplete?.({
      clicksScored: hits,
      score,
      difficultyId: roundDifficulty.id,
      coinMultiplier: roundDifficulty.coinMultiplier,
    })
  }, [phase, hits, score, onRoundComplete, roundDifficulty.id, roundDifficulty.coinMultiplier])

  useEffect(() => {
    function onKeyDown(event) {
      if (event.repeat) return
      tryUsePowerupKey(event.key)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [tryUsePowerupKey])

  useEffect(() => {
    centerPosition(selectedDifficulty.initialButtonSize)
  }, [centerPosition, selectedDifficulty.initialButtonSize])

  useEffect(() => {
    return () => {
      clearShakeTimeout()
      clearFeedbackTimeouts()
    }
  }, [clearFeedbackTimeouts, clearShakeTimeout])

  return (
    <div className={gameScreenClassName}>
      <div className="scoreNumber">{score}</div>
      <div className="timerText">Time Left: {timeLeft}s</div>
      <div className="difficultyHudTag" aria-label={`Difficulty ${roundDifficulty.label}`}>
        {roundDifficulty.label}
      </div>

      <GameStatusRow
        streak={streak}
        comboMultiplier={comboMultiplier}
        bestStreak={bestStreak}
      />

      <div className={`arena ${arenaThemeClass}`} ref={arenaRef} onClick={handleArenaClick}>
        <MovingButton
          style={buttonStyle}
          onClick={handleButtonClick}
          disabled={!isPlaying}
          label={buttonLabel}
          labelFontSize={buttonLabelFontSize}
          skinClass={buttonSkinClass}
          skinImageSrc={buttonSkinImageSrc}
          skinImageScale={buttonSkinImageScale}
        />

        {clickFeedback.map((feedback) => (
          <span
            key={feedback.id}
            className={`clickFeedback ${feedback.type}`}
            style={{ left: `${feedback.x}px`, top: `${feedback.y}px` }}
          >
            {feedback.value}
          </span>
        ))}
      </div>

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
