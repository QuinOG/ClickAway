import { AnimatePresence, motion } from "motion/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"

import { usePrefersReducedMotion } from "./gameRoundOverlayMotionHooks.js"
import { formatDrillBestMetric } from "../../../utils/drillStatsUtils.js"

const MotionSection = motion.section
const MotionDiv = motion.div
const OVERLAY_EASE = [0.22, 1, 0.36, 1]
const MODE_CARD_EASE = [0.2, 0.9, 0.28, 1]

const readyCardVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.994 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.24,
      ease: OVERLAY_EASE,
      when: "beforeChildren",
      delayChildren: 0.02,
      staggerChildren: 0.035,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.998,
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
  },
}

const readySectionVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.16, ease: OVERLAY_EASE },
  },
}

const modeCardVariants = {
  enter: (direction) => ({
    opacity: 0,
    x: direction >= 0 ? 26 : -26,
    scale: 0.988,
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
  },
  exit: (direction) => ({
    opacity: 0,
    x: direction >= 0 ? -22 : 22,
    scale: 0.992,
  }),
}

function getShrinkPaceLabel(shrinkFactor) {
  if (shrinkFactor >= 0.98) return "Relaxed"
  if (shrinkFactor >= 0.96) return "Balanced"
  return "Aggressive"
}

function toModeSlide(mode) {
  if (!mode) return null

  return {
    ...mode,
    tone: String(mode.label || "").toLowerCase(),
    glyph: mode.readyGlyph ?? String(mode.label || "M").charAt(0),
    round: mode.isTimedRound === false ? "No limit" : `${mode.durationSeconds}s`,
    miss: mode.missPenalty > 0 ? `-${mode.missPenalty}` : "None",
    shrink: getShrinkPaceLabel(mode.shrinkFactor),
    footer: mode.playerHint,
  }
}

function ModePreviewContent({ mode }) {
  if (!mode) return null

  return (
    <article className={`modeCard modeCard-${mode.tone}`}>
      <header className="modeCardHeader">
        <div className="modeCardTitleGroup">
          <span className="modeCardGlyph" aria-hidden="true">{mode.glyph}</span>
          <h3 className="modeCardTitle">{mode.label}</h3>
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

function formatSessionRR(netRR = 0) {
  if (netRR === 0) return "Even"
  return `${netRR > 0 ? "+" : ""}${netRR} RR`
}

export function ReadyOverlay({
  onStart,
  modes = [],
  selectedModeId,
  onSelectMode,
  canChangeMode = true,
  activeLoadoutName = "Loadout",
  showArmoryWalkthroughBadge = false,
  onboardingCoach = null,
  showTrainingSuite = false,
  trainingDrills = [],
  selectedDrillId = null,
  onSelectDrill,
  drillStats = {},
  warmupSuggestion = null,
  sessionStats = null,
  onClose,
}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const overlayCardRef = useRef(null)
  const [localSelectedModeId, setLocalSelectedModeId] = useState(selectedModeId)
  const [modeTransitionDirection, setModeTransitionDirection] = useState(1)

  useEffect(() => {
    setLocalSelectedModeId(selectedModeId)
  }, [selectedModeId])

  useEffect(() => {
    overlayCardRef.current?.focus()
  }, [])

  const modeSlides = useMemo(
    () => modes.map((mode) => toModeSlide(mode)).filter(Boolean),
    [modes]
  )
  const modeCount = modeSlides.length
  const activeModeIndex = Math.max(0, modeSlides.findIndex((mode) => mode.id === localSelectedModeId))
  const selectedMode = modeSlides[activeModeIndex] ?? modeSlides[0] ?? null

  function goPrevMode() {
    if (!canChangeMode || !modeCount) return

    const nextIndex = (activeModeIndex - 1 + modeCount) % modeCount
    const nextMode = modeSlides[nextIndex]
    setModeTransitionDirection(-1)
    setLocalSelectedModeId(nextMode.id)
    onSelectMode?.(nextMode.id)
  }

  function goNextMode() {
    if (!canChangeMode || !modeCount) return

    const nextIndex = (activeModeIndex + 1) % modeCount
    const nextMode = modeSlides[nextIndex]
    setModeTransitionDirection(1)
    setLocalSelectedModeId(nextMode.id)
    onSelectMode?.(nextMode.id)
  }

  function handleStartSelectedMode() {
    if (!selectedMode) return
    onStart?.(selectedMode.id)
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault()
      onClose?.()
      return
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault()
      goPrevMode()
      return
    }

    if (event.key === "ArrowRight") {
      event.preventDefault()
      goNextMode()
      return
    }

    if (event.key === "Enter") {
      event.preventDefault()
      handleStartSelectedMode()
    }
  }

  const startButtonLabel = onboardingCoach?.startLabel
    ?? (selectedMode ? `Start ${selectedMode.label}` : "Start Round")
  const currentModePosition = modeCount ? activeModeIndex + 1 : 0
  const readyTitle = onboardingCoach?.title ?? "Choose Round"
  const readyLead = onboardingCoach?.instruction
    ?? "Pick your mode and start. Armory is where you change the build."

  return (
    <MotionDiv
      className="gameOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="round-ready-title"
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={prefersReducedMotion ? undefined : { opacity: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.18, ease: OVERLAY_EASE }}
    >
      <MotionSection
        className={`gameOverCard readyCard readyCardStack readyCardChoosing difficultyMood-${localSelectedModeId}`}
        ref={overlayCardRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        variants={prefersReducedMotion ? undefined : readyCardVariants}
        initial={prefersReducedMotion ? false : "hidden"}
        animate="visible"
        exit={prefersReducedMotion ? undefined : "exit"}
      >
        <MotionDiv variants={prefersReducedMotion ? undefined : readySectionVariants}>
          <h2 id="round-ready-title" className="readyTitle">
            {readyTitle}
          </h2>
          <p className="readyLead">
            {readyLead}
          </p>
          {onboardingCoach ? (
            <div className="readyOnboardingCoach" aria-label="First session onboarding">
              <span className="readyOnboardingCoachStep">{onboardingCoach.stepLabel}</span>
              {onboardingCoach.note ? (
                <p className="readyOnboardingCoachNote">{onboardingCoach.note}</p>
              ) : null}
            </div>
          ) : null}
        </MotionDiv>

        <MotionDiv
          className="modeProgressDots"
          aria-label={`Mode ${currentModePosition} of ${modeCount}`}
          variants={prefersReducedMotion ? undefined : readySectionVariants}
        >
          {modeSlides.map((mode, index) => (
            <span
              key={`mode-dot-${mode.id}`}
              className={`modeProgressDot ${index === activeModeIndex ? "active" : ""}`}
              aria-hidden="true"
            />
          ))}
        </MotionDiv>

        <MotionDiv
          className="modeCarousel"
          aria-label="Mode navigation controls"
          variants={prefersReducedMotion ? undefined : readySectionVariants}
        >
          <button
            className="modeArrowButton"
            type="button"
            onClick={goPrevMode}
            disabled={!canChangeMode || !modeCount}
            aria-label="Select previous mode"
          >
            <span aria-hidden="true">&#8249;</span>
          </button>

          <div className="modeDeckViewport" role="listbox" aria-label="Mode carousel">
            <p className="modeSelectionLive" aria-live="polite">
              Selected mode: {selectedMode?.label ?? "Unknown"}
            </p>
            <div className="modeDeckCard">
              <AnimatePresence initial={false} custom={modeTransitionDirection} mode="popLayout">
                {selectedMode ? (
                  <MotionDiv
                    key={selectedMode.id}
                    className="modeDeckMotionCard"
                    role="option"
                    aria-selected="true"
                    custom={modeTransitionDirection}
                    variants={prefersReducedMotion ? undefined : modeCardVariants}
                    initial={prefersReducedMotion ? false : "enter"}
                    animate="center"
                    exit={prefersReducedMotion ? undefined : "exit"}
                    transition={prefersReducedMotion ? { duration: 0 } : {
                      duration: 0.24,
                      ease: MODE_CARD_EASE,
                    }}
                  >
                    <ModePreviewContent mode={selectedMode} />
                  </MotionDiv>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          <button
            className="modeArrowButton"
            type="button"
            onClick={goNextMode}
            disabled={!canChangeMode || !modeCount}
            aria-label="Select next mode"
          >
            <span aria-hidden="true">&#8250;</span>
          </button>
        </MotionDiv>

        {warmupSuggestion ? (
          <MotionDiv
            className="readyWarmupSuggestion"
            variants={prefersReducedMotion ? undefined : readySectionVariants}
          >
            <span className="readyWarmupEyebrow">Warm-up suggestion</span>
            <p className="readyWarmupCopy">
              Try <strong>{warmupSuggestion.label}</strong> in Practice before Ranked.{" "}
              {warmupSuggestion.description}
            </p>
          </MotionDiv>
        ) : null}

        {showTrainingSuite ? (
          <MotionDiv
            className="readyTrainingSuite"
            variants={prefersReducedMotion ? undefined : readySectionVariants}
            aria-label="Training drills"
          >
            <div className="readyTrainingHeader">
              <span className="readyTrainingEyebrow">Training drills</span>
              <p className="readyTrainingLead">Pick a focused drill or run free Practice.</p>
            </div>
            <div className="readyTrainingGrid">
              <button
                type="button"
                className={`readyTrainingCard ${selectedDrillId ? "" : "isActive"}`}
                onClick={() => onSelectDrill?.(null)}
              >
                <strong className="readyTrainingCardTitle">Free Practice</strong>
                <span className="readyTrainingCardMeta">No timer pressure or drill goal.</span>
              </button>
              {trainingDrills.map((drill) => {
                const bestLabel = formatDrillBestMetric(drill, drillStats[drill.id])
                return (
                  <button
                    key={drill.id}
                    type="button"
                    className={`readyTrainingCard ${selectedDrillId === drill.id ? "isActive" : ""}`}
                    onClick={() => onSelectDrill?.(drill.id)}
                  >
                    <strong className="readyTrainingCardTitle">{drill.label}</strong>
                    <span className="readyTrainingCardMeta">{drill.description}</span>
                    <span className="readyTrainingCardBest">Best: {bestLabel}</span>
                  </button>
                )
              })}
            </div>
          </MotionDiv>
        ) : null}

        {sessionStats ? (
          <MotionDiv
            className="readySessionStrip"
            variants={prefersReducedMotion ? undefined : readySectionVariants}
            aria-label="Session summary"
          >
            <span className="readySessionLabel">This session</span>
            <span className="readySessionStat">
              {sessionStats.rounds} {sessionStats.rounds === 1 ? "round" : "rounds"}
            </span>
            <span className="readySessionDivider" aria-hidden="true" />
            <span className="readySessionStat">
              Best: {Number(sessionStats.bestScore).toLocaleString()}
            </span>
            {sessionStats.netRR !== 0 ? (
              <>
                <span className="readySessionDivider" aria-hidden="true" />
                <span className={`readySessionStat ${sessionStats.netRR > 0 ? "isPositive" : "isNegative"}`}>
                  {formatSessionRR(sessionStats.netRR)}
                </span>
              </>
            ) : null}
          </MotionDiv>
        ) : null}

        <MotionDiv
          className="overlayActions readyActions"
          variants={prefersReducedMotion ? undefined : readySectionVariants}
        >
          <div className="readyPrimaryActionGroup">
            <div className="readyActionButtonRow">
              <button
                className="primaryButton primaryButton-lg"
                onClick={handleStartSelectedMode}
                disabled={!selectedMode}
              >
                {startButtonLabel}
              </button>
              <Link className="readyBuildButton" to="/armory">
                Open Armory
                {showArmoryWalkthroughBadge ? (
                  <span className="readyBuildButtonBadge">New</span>
                ) : null}
              </Link>
            </div>
            <p className="readyPassiveBuildLabel" aria-label="Current active build">
              Active build: <strong>{activeLoadoutName || "Loadout"}</strong>
            </p>
            {!onboardingCoach ? (
              <Link className="secondaryButton readyHelpLink" to="/help">
                How To Play
              </Link>
            ) : null}
          </div>
        </MotionDiv>
      </MotionSection>
    </MotionDiv>
  )
}
