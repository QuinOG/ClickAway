import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { getModeLabelFromModeConfig } from "../../../../utils/modeUtils.js"
import { usePrefersReducedMotion } from "./useOverlayMotion.js"

const MODE_ORDER = ["Practice", "Casual", "Ranked"]
const MODE_COPY = [
  {
    name: "Practice",
    description: "Train mechanics.",
    glyph: "1",
  },
  {
    name: "Casual",
    description: "Earn XP + coins.",
    glyph: "2",
  },
  {
    name: "Ranked",
    description: "Earn XP + coins + rank. Harder penalties.",
    glyph: "3",
  },
]

const MODE_COPY_BY_NAME = MODE_COPY.reduce((accumulator, mode) => {
  accumulator[mode.name] = mode
  return accumulator
}, {})

function getShrinkPaceLabel(shrinkFactor) {
  if (shrinkFactor >= 0.98) return "Relaxed"
  if (shrinkFactor >= 0.96) return "Balanced"
  return "Aggressive"
}

function getModeFooterText(mode) {
  if (!mode) return ""
  const bonusPercent = Math.round((mode.coinMultiplier - 1) * 100)
  const coinBonusText = bonusPercent > 0 ? `Coin bonus +${bonusPercent}%` : "Coin bonus none"
  return `Combo every ${mode.comboStep} hits, ${coinBonusText}`
}

function toModeSlide(mode) {
  if (!mode) return null
  const name = getModeLabelFromModeConfig(mode)
  const copy = MODE_COPY_BY_NAME[name]
  const round = mode.isTimedRound === false ? "No limit" : `${mode.durationSeconds}s`
  const miss = mode.missPenalty > 0 ? `-${mode.missPenalty}` : "None"

  return {
    id: mode.id,
    name,
    tone: name.toLowerCase(),
    glyph: copy?.glyph ?? name.charAt(0),
    description: copy?.description ?? mode.playerHint,
    round,
    miss,
    shrink: getShrinkPaceLabel(mode.shrinkFactor),
    footer: getModeFooterText(mode),
  }
}

function ModePreviewContent({ mode, animationClass = "" }) {
  if (!mode) return null

  return (
    <article className={`modeCard modeCard-${mode.tone} ${animationClass}`}>
      <header className="modeCardHeader">
        <div className="modeCardTitleGroup">
          <span className="modeCardGlyph" aria-hidden="true">{mode.glyph}</span>
          <h3 className="modeCardTitle">{mode.name}</h3>
        </div>
      </header>
      <p className="modeCardDescription">{mode.description}</p>
      <div className="modeCardStats">
        <div className="modeCardStat">
          <span className="modeCardStatLabel">Round</span>
          <strong className="modeCardStatValue">{mode.round}</strong>
        </div>
        <div className="modeCardStat">
          <span className="modeCardStatLabel">Miss</span>
          <strong className="modeCardStatValue">{mode.miss}</strong>
        </div>
        <div className="modeCardStat">
          <span className="modeCardStatLabel">Shrink</span>
          <strong className="modeCardStatValue">{mode.shrink}</strong>
        </div>
      </div>
      {mode.footer ? <p className="modeCardFooter">{mode.footer}</p> : null}
    </article>
  )
}

export function ReadyOverlay({
  onStart,
  modes = [],
  selectedModeId,
  onSelectMode,
  canChangeMode = true,
  onClose,
}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const modeSlides = useMemo(() => {
    const orderedModes = MODE_ORDER.map((modeName) =>
      modes.find((mode) => getModeLabelFromModeConfig(mode) === modeName)
    ).filter(Boolean)
    return orderedModes.map((mode) => toModeSlide(mode)).filter(Boolean)
  }, [modes])
  const modeCount = modeSlides.length
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const initialIndex = modeSlides.findIndex((mode) => mode.id === selectedModeId)
    return initialIndex >= 0 ? initialIndex : 0
  })
  const [transitionDirection, setTransitionDirection] = useState("right")
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationClass, setAnimationClass] = useState("")
  const overlayCardRef = useRef(null)
  const animationTimeoutRef = useRef(null)

  const activeIndex = modeCount ? Math.min(selectedIndex, modeCount - 1) : 0
  const selectedMode = modeSlides[activeIndex] ?? null

  useEffect(() => {
    overlayCardRef.current?.focus()

    return () => {
      if (animationTimeoutRef.current) {
        window.clearTimeout(animationTimeoutRef.current)
      }
    }
  }, [])

  function startTransition(direction) {
    if (prefersReducedMotion) return

    if (animationTimeoutRef.current) {
      window.clearTimeout(animationTimeoutRef.current)
    }

    setTransitionDirection(direction)
    setAnimationClass(`slide-in-${direction}`)
    setIsAnimating(true)

    animationTimeoutRef.current = window.setTimeout(() => {
      setIsAnimating(false)
      setAnimationClass("")
    }, 230)
  }

  function selectModeByIndex(index, direction) {
    if (!canChangeMode || !modeCount || isAnimating) return

    const wrappedIndex = ((index % modeCount) + modeCount) % modeCount
    if (wrappedIndex === activeIndex) return

    const nextMode = modeSlides[wrappedIndex]
    if (!nextMode) return

    setSelectedIndex(wrappedIndex)
    onSelectMode?.(nextMode.id)
    startTransition(direction)
  }

  function goPrev() {
    selectModeByIndex((activeIndex - 1 + modeCount) % modeCount, "left")
  }

  function goNext() {
    selectModeByIndex((activeIndex + 1) % modeCount, "right")
  }

  function handleStartSelectedMode() {
    if (!selectedMode || isAnimating) return
    onStart?.()
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      goPrev()
      return
    }

    if (event.key === "ArrowRight") {
      event.preventDefault()
      goNext()
      return
    }

    if (event.key === "Enter") {
      event.preventDefault()
      handleStartSelectedMode()
      return
    }

    if (event.key === "Escape") {
      onClose?.()
    }
  }

  const startButtonLabel = selectedMode ? `Start ${selectedMode.name}` : "Start Round"
  const currentModePosition = modeCount ? activeIndex + 1 : 0

  return (
    <div
      className="gameOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="round-ready-title"
    >
      <section
        className="gameOverCard readyCard readyCardStack readyCardChoosing"
        ref={overlayCardRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <h2 id="round-ready-title" className="readyTitle">
          Choose Mode
        </h2>
        <p className="readyLead">
          Use left and right to cycle modes, then press Enter to start.
        </p>
        <div className="modeProgressDots" aria-label={`Mode ${currentModePosition} of ${modeCount}`}>
          {modeSlides.map((mode, index) => (
            <span
              key={`mode-dot-${mode.id}`}
              className={`modeProgressDot ${index === activeIndex ? "active" : ""}`}
              aria-hidden="true"
            />
          ))}
        </div>

        <div className="modeCarousel" aria-label="Mode navigation controls">
          <button
            className="modeArrowButton"
            type="button"
            onClick={goPrev}
            disabled={!canChangeMode || !modeCount || isAnimating}
            aria-label="Select previous mode"
          >
            <span aria-hidden="true">&#8249;</span>
          </button>

          <div className="modeDeckViewport" role="listbox" aria-label="Mode carousel">
            <p className="modeSelectionLive" aria-live="polite">
              Selected mode: {selectedMode?.name ?? "Unknown"}
            </p>
            <div className="modeDeckCard" role="option" aria-selected="true">
              <ModePreviewContent
                mode={selectedMode}
                animationClass={prefersReducedMotion ? "" : animationClass}
                key={`${selectedMode?.id ?? "unknown"}-${transitionDirection}`}
              />
            </div>
          </div>

          <button
            className="modeArrowButton"
            type="button"
            onClick={goNext}
            disabled={!canChangeMode || !modeCount || isAnimating}
            aria-label="Select next mode"
          >
            <span aria-hidden="true">&#8250;</span>
          </button>
        </div>

        <div className="overlayActions readyActions">
          <div className="readyPrimaryActionGroup">
            <button className="primaryButton" onClick={handleStartSelectedMode} disabled={!selectedMode || isAnimating}>
              {startButtonLabel}
            </button>
            <Link className="secondaryButton readyHelpLink" to="/help">
              How To Play
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
