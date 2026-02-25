import { useEffect, useMemo, useRef, useState } from "react"
import MovingButton from "../components/MovingButton.jsx"

const GAME_DURATION_SECONDS = 15
const INITIAL_BUTTON_SIZE = 100

export default function GamePage() {
  const arenaRef = useRef(null)

  const [score, setScore] = useState(0)
  const [ppc] = useState(1)

  const [size, setSize] = useState(INITIAL_BUTTON_SIZE) // px
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SECONDS)
  const [hasStarted, setHasStarted] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)

  const minSize = 10

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
    const x = Math.max(0, Math.floor((rect.width - nextSize) / 2))
    const y = Math.max(0, Math.floor((rect.height - nextSize) / 2))
    setPos({ x, y })
  }

  function randomizePosition(nextSize) {
    const arena = arenaRef.current
    if (!arena) return

    const rect = arena.getBoundingClientRect()
    const maxX = Math.max(0, rect.width - nextSize)
    const maxY = Math.max(0, rect.height - nextSize)

    const x = Math.floor(Math.random() * (maxX + 1))
    const y = Math.floor(Math.random() * (maxY + 1))
    setPos({ x, y })
  }

  function handleButtonClick(e) {
    e.stopPropagation()

    if (isGameOver) return

    if (!hasStarted) {
      setHasStarted(true)
    }

    // later: call API sendIncrement(delta)
    setScore((s) => s + ppc)

    setSize((current) => {
      const next = Math.max(minSize, Math.floor(current * 0.97))
      // after size changes, reposition
      setTimeout(() => randomizePosition(next), 0)
      return next
    })
  }

  function handleArenaClick() {
    if (!hasStarted || isGameOver) return
    setScore((s) => Math.max(0, s - 1))
  }

  function handlePlayAgain() {
    setScore(0)
    setSize(INITIAL_BUTTON_SIZE)
    setTimeLeft(GAME_DURATION_SECONDS)
    setHasStarted(false)
    setIsGameOver(false)
    centerPosition(INITIAL_BUTTON_SIZE)
  }

  useEffect(() => {
    if (!hasStarted || isGameOver) return

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
    }, 1000)

    return () => clearInterval(timer)
  }, [hasStarted, isGameOver])

  useEffect(() => {
    centerPosition(size)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="gameScreen">
      <div className="scoreNumber">{score}</div>
      <div className="timerText">Time Left: {timeLeft}s</div>

      <div className="arena" ref={arenaRef} onClick={handleArenaClick}>
        <MovingButton style={style} onClick={handleButtonClick} disabled={isGameOver} />
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
