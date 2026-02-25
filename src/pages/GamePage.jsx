import { useEffect, useMemo, useRef, useState } from "react"
import MovingButton from "../components/MovingButton.jsx"

const GAME_DURATION_SECONDS = 15
const INITIAL_BUTTON_SIZE = 100
const MIN_BUTTON_SIZE = 10
const BUTTON_SHRINK_FACTOR = 0.97
const TIMER_TICK_MS = 1000
const FEEDBACK_LIFETIME_MS = 550
const FEEDBACK_OFFSET = { x: 12, y: -12 }

// Returns the max top/left value that still keeps the button fully inside the arena.
function clampToArena(arenaSize, itemSize) {
  return Math.max(0, arenaSize - itemSize)
}

// Calculates center point so each new round starts consistently.
function getCenteredPosition(rect, itemSize) {
  return {
    x: Math.max(0, Math.floor((rect.width - itemSize) / 2)),
    y: Math.max(0, Math.floor((rect.height - itemSize) / 2)),
  }
}

// Picks a random in-bounds position each time the button is successfully clicked.
function getRandomPosition(rect, itemSize) {
  const maxX = clampToArena(rect.width, itemSize)
  const maxY = clampToArena(rect.height, itemSize)

  return {
    x: Math.floor(Math.random() * (maxX + 1)),
    y: Math.floor(Math.random() * (maxY + 1)),
  }
}

// Difficulty curve: shrink the button gradually but never below the minimum size.
function getNextButtonSize(currentSize) {
  return Math.max(MIN_BUTTON_SIZE, Math.floor(currentSize * BUTTON_SHRINK_FACTOR))
}

export default function GamePage() {
  const arenaRef = useRef(null)
  const feedbackTimeoutsRef = useRef([])

  const [score, setScore] = useState(0)
  const [ppc] = useState(1)

  const [size, setSize] = useState(INITIAL_BUTTON_SIZE) // px
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SECONDS)
  const [hasStarted, setHasStarted] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [clickFeedback, setClickFeedback] = useState([])

  const style = useMemo(() => ({
    width: `${size}px`,
    height: `${size}px`,
    left: `${pos.x}px`,
    top: `${pos.y}px`,
  }), [size, pos])

  function centerPosition(nextSize) {
    const arena = arenaRef.current
    if (!arena) return

    const rect = arena.getBoundingClientRect()
    setPos(getCenteredPosition(rect, nextSize))
  }

  function randomizePosition(nextSize) {
    const arena = arenaRef.current
    if (!arena) return

    const rect = arena.getBoundingClientRect()
    setPos(getRandomPosition(rect, nextSize))
  }

  function clearFeedbackTimeouts() {
    // Prevent dangling timers on replay/unmount (avoids stale state updates).
    feedbackTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId))
    feedbackTimeoutsRef.current = []
  }

  function addClickFeedback(clientX, clientY, value, type) {
    const arena = arenaRef.current
    if (!arena) return

    const rect = arena.getBoundingClientRect()
    const x = clientX - rect.left + FEEDBACK_OFFSET.x
    const y = clientY - rect.top + FEEDBACK_OFFSET.y
    const id = `${Date.now()}-${Math.random()}`

    // Store transient visual feedback so hit/miss results are obvious to the player.
    setClickFeedback((items) => [...items, { id, x, y, value, type }])

    const timeoutId = setTimeout(() => {
      setClickFeedback((items) => items.filter((item) => item.id !== id))
      feedbackTimeoutsRef.current = feedbackTimeoutsRef.current.filter((t) => t !== timeoutId)
    }, FEEDBACK_LIFETIME_MS)

    feedbackTimeoutsRef.current.push(timeoutId)
  }

  function handleButtonClick(e) {
    // Prevent arena miss handler from firing when the button itself is clicked.
    e.stopPropagation()

    if (isGameOver) return

    if (!hasStarted) {
      setHasStarted(true)
    }

    // later: call API sendIncrement(delta)
    setScore((s) => s + ppc)
    addClickFeedback(e.clientX, e.clientY, `+${ppc}`, "positive")

    setSize((current) => {
      const next = getNextButtonSize(current)
      // Reposition after size update so bounds calculations use the new diameter.
      setTimeout(() => randomizePosition(next), 0)
      return next
    })
  }

  function handleArenaClick(e) {
    if (!hasStarted || isGameOver) return
    setScore((s) => Math.max(0, s - ppc))
    addClickFeedback(e.clientX, e.clientY, `-${ppc}`, "negative")
  }

  function handlePlayAgain() {
    // Round reset is local-only for now; backend score persistence can hook in later.
    setScore(0)
    setSize(INITIAL_BUTTON_SIZE)
    setTimeLeft(GAME_DURATION_SECONDS)
    setHasStarted(false)
    setIsGameOver(false)
    setClickFeedback([])
    clearFeedbackTimeouts()
    centerPosition(INITIAL_BUTTON_SIZE)
  }

  useEffect(() => {
    if (!hasStarted || isGameOver) return

    // Timer starts on first successful click and stops when the round ends.
    const timer = setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          clearInterval(timer)
          setIsGameOver(true)
          setHasStarted(false)
          return 0
        }

        return current - 1
      })
    }, TIMER_TICK_MS)

    return () => clearInterval(timer)
  }, [hasStarted, isGameOver])

  useEffect(() => {
    // Initial round always starts from center for predictable UX.
    centerPosition(size)
  }, [])

  useEffect(() => {
    return () => {
      clearFeedbackTimeouts()
    }
  }, [])

  return (
    <div className="gameScreen">
      <div className="scoreNumber">{score}</div>
      <div className="timerText">Time Left: {timeLeft}s</div>

      <div className="arena" ref={arenaRef} onClick={handleArenaClick}>
        <MovingButton style={style} onClick={handleButtonClick} disabled={isGameOver} />
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

      <div className="ppcText">Points Per Click: {ppc}</div>

      {isGameOver ? (
        <div className="gameOverOverlay" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
          <section className="gameOverCard">
            <h2 id="game-over-title">Game Over</h2>
            <p>Final Score: {score}</p>
            <button className="primaryButton" onClick={handlePlayAgain}>Play Again</button>
          </section>
        </div>
      ) : null}
    </div>
  )
}
