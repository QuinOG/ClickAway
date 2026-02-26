import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import MovingButton from "../components/MovingButton.jsx"

const GAME_DURATION_SECONDS = 15
const INITIAL_BUTTON_SIZE = 100
const MIN_BUTTON_SIZE = 10
const BUTTON_SHRINK_FACTOR = 0.97
const TIMER_TICK_MS = 1000
const FEEDBACK_LIFETIME_MS = 550
const FEEDBACK_OFFSET = { x: 12, y: -12 }
const MIN_LABEL_FONT_SIZE = 8
const MAX_LABEL_FONT_SIZE = 18
const LABEL_SCALE_FACTOR = 0.18
const LABEL_HIDE_SIZE_THRESHOLD = 40
const MAX_TIME_BUFFER_SECONDS = 30

const ROUND_PHASE = {
  READY: "ready",
  COUNTDOWN: "countdown",
  PLAYING: "playing",
  GAME_OVER: "game_over",
}

const POWERUPS = [
  {
    id: "time_boost",
    key: "1",
    label: "Time +2s",
    awardEvery: 5,
    description: "Adds 2 seconds to the timer.",
  },
  {
    id: "size_boost",
    key: "2",
    label: "Grow +10",
    awardEvery: 10,
    description: "Temporarily makes the target larger.",
  },
  {
    id: "bonus_points",
    key: "3",
    label: "Bonus +5",
    awardEvery: 15,
    description: "Instantly grants 5 points.",
  },
]

const POWERUP_BY_KEY = POWERUPS.reduce((map, powerup) => {
  map[powerup.key] = powerup
  return map
}, {})

function buildInitialPowerupCharges() {
  return POWERUPS.reduce((acc, powerup) => {
    acc[powerup.id] = 0
    return acc
  }, {})
}

function clampToArena(arenaSize, itemSize) {
  return Math.max(0, arenaSize - itemSize)
}

function getCenteredPosition(rect, itemSize) {
  return {
    x: Math.max(0, Math.floor((rect.width - itemSize) / 2)),
    y: Math.max(0, Math.floor((rect.height - itemSize) / 2)),
  }
}

function getRandomPosition(rect, itemSize) {
  const maxX = clampToArena(rect.width, itemSize)
  const maxY = clampToArena(rect.height, itemSize)

  return {
    x: Math.floor(Math.random() * (maxX + 1)),
    y: Math.floor(Math.random() * (maxY + 1)),
  }
}



function getNextButtonSize(currentSize) {
  return Math.max(MIN_BUTTON_SIZE, Math.floor(currentSize * BUTTON_SHRINK_FACTOR))
}

function getComboMultiplier(streak) {
  return 1 + Math.floor(streak / 5)
}

function formatAccuracy(hits, misses) {
  const totalAttempts = hits + misses
  if (totalAttempts === 0) return "0%"
  return `${Math.round((hits / totalAttempts) * 100)}%`
}

export default function GamePage({
  onRoundComplete,
  buttonSkinClass = "skin-default",
  buttonSkinImageSrc = "",
  buttonSkinImageScale = 100,
  arenaThemeClass = "theme-default",
}) {
  const arenaRef = useRef(null)
  const feedbackTimeoutsRef = useRef([])
  const hasAwardedRoundRef = useRef(false)

  const [phase, setPhase] = useState(ROUND_PHASE.READY)
  const [countdownValue, setCountdownValue] = useState(3)

  const [score, setScore] = useState(0)
  const [ppc] = useState(1)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [powerupsUsed, setPowerupsUsed] = useState(0)

  const [size, setSize] = useState(INITIAL_BUTTON_SIZE)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SECONDS)
  const [clickFeedback, setClickFeedback] = useState([])
  const [powerupCharges, setPowerupCharges] = useState(buildInitialPowerupCharges)

  const isPlaying = phase === ROUND_PHASE.PLAYING
  const comboMultiplier = useMemo(() => getComboMultiplier(streak), [streak])

  const buttonStyle = useMemo(
    () => ({
      width: `${size}px`,
      height: `${size}px`,
      left: `${pos.x}px`,
      top: `${pos.y}px`,
    }),
    [size, pos]
  )

  const buttonLabel = size >= LABEL_HIDE_SIZE_THRESHOLD ? "Click Here" : ""
  const buttonLabelFontSize = Math.min(
    MAX_LABEL_FONT_SIZE,
    Math.max(MIN_LABEL_FONT_SIZE, Math.floor(size * LABEL_SCALE_FACTOR))
  )

  const clearFeedbackTimeouts = useCallback(() => {
    feedbackTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId))
    feedbackTimeoutsRef.current = []
  }, [])

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

  const resetRoundState = useCallback(() => {
    setScore(0)
    setStreak(0)
    setBestStreak(0)
    setHits(0)
    setMisses(0)
    setPowerupsUsed(0)
    setSize(INITIAL_BUTTON_SIZE)
    setTimeLeft(GAME_DURATION_SECONDS)
    setClickFeedback([])
    setPowerupCharges(buildInitialPowerupCharges())
    clearFeedbackTimeouts()
    centerPosition(INITIAL_BUTTON_SIZE)
  }, [centerPosition, clearFeedbackTimeouts])

  function startRoundWithCountdown() {
    resetRoundState()
    hasAwardedRoundRef.current = false
    setCountdownValue(3)
    setPhase(ROUND_PHASE.COUNTDOWN)
  }

  const applyPowerup = useCallback((powerupId) => {
    if (powerupId === "time_boost") {
      setTimeLeft((current) => Math.min(MAX_TIME_BUFFER_SECONDS, current + 2))
      addCenterFeedback("+2s", "positive")
      return
    }

    if (powerupId === "size_boost") {
      setSize((current) => {
        const next = Math.min(INITIAL_BUTTON_SIZE, current + 10)
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
  }, [addCenterFeedback, randomizePosition])

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

  function handleButtonClick(event) {
    event.stopPropagation()
    if (!isPlaying) return

    const nextStreak = streak + 1
    const points = ppc * getComboMultiplier(nextStreak)

    setStreak(nextStreak)
    setBestStreak((current) => Math.max(current, nextStreak))
    setHits((current) => current + 1)
    setScore((current) => current + points)

    addClickFeedback(event.clientX, event.clientY, `+${points}`, "positive")
    awardPowerups(nextStreak)

    setSize((current) => {
      const next = getNextButtonSize(current)
      setTimeout(() => randomizePosition(next), 0)
      return next
    })
  }

  function handleArenaClick(event) {
    if (!isPlaying) return

    setStreak(0)
    setMisses((current) => current + 1)
    setScore((current) => Math.max(0, current - ppc))
    addClickFeedback(event.clientX, event.clientY, `-${ppc}`, "negative")
  }

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
    onRoundComplete?.({ clicksScored: hits, score })
  }, [phase, hits, score, onRoundComplete])

  useEffect(() => {
    function onKeyDown(event) {
      if (event.repeat) return
      tryUsePowerupKey(event.key)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [tryUsePowerupKey])

  useEffect(() => {
    centerPosition(INITIAL_BUTTON_SIZE)
  }, [centerPosition])

  useEffect(() => {
    return () => {
      clearFeedbackTimeouts()
    }
  }, [clearFeedbackTimeouts])

  return (
    <div className="gameScreen">
      <div className="scoreNumber">{score}</div>
      <div className="timerText">Time Left: {timeLeft}s</div>

      <div className="gameStatusRow">
        <span className="statusChip">Streak: {streak}</span>
        <span className="statusChip">Combo: x{comboMultiplier}</span>
        <span className="statusChip">Best: {bestStreak}</span>
      </div>

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

      <div className="ppcText">Base Points Per Click: {ppc}</div>

      <div className="powerupTray" aria-label="Power-ups">
        {POWERUPS.map((powerup) => {
          const charges = powerupCharges[powerup.id] ?? 0
          return (
            <div key={powerup.id} className={`powerupItem ${charges > 0 ? "ready" : ""}`}>
              <div className="powerupKey">{powerup.key}</div>
              <div className="powerupBody">
                <strong>{powerup.label}</strong>
                <span>{powerup.description}</span>
              </div>
              <div className="powerupCount">x{charges}</div>
            </div>
          )
        })}
      </div>

      {phase === ROUND_PHASE.READY ? (
        <div className="gameOverlay" role="dialog" aria-modal="true" aria-labelledby="round-ready-title">
          <section className="gameOverCard">
            <h2 id="round-ready-title">Ready?</h2>
            <p>Hit streaks to earn key-activated power-ups.</p>
            <button className="primaryButton" onClick={startRoundWithCountdown}>Start Round</button>
          </section>
        </div>
      ) : null}

      {phase === ROUND_PHASE.COUNTDOWN ? (
        <div className="gameOverlay" role="status" aria-live="polite">
          <section className="countdownCard">
            <p>Starting In</p>
            <div className="countdownNumber">{countdownValue}</div>
          </section>
        </div>
      ) : null}

      {phase === ROUND_PHASE.GAME_OVER ? (
        <div className="gameOverlay" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
          <section className="gameOverCard">
            <h2 id="game-over-title">Game Over</h2>
            <p>Final Score: {score}</p>
            <div className="roundSummary">
              <div>Hits: {hits}</div>
              <div>Misses: {misses}</div>
              <div>Accuracy: {formatAccuracy(hits, misses)}</div>
              <div>Best Streak: {bestStreak}</div>
              <div>Power-ups Used: {powerupsUsed}</div>
            </div>
            <button className="primaryButton" onClick={startRoundWithCountdown}>Play Again</button>
          </section>
        </div>
      ) : null}
    </div>
  )
}
