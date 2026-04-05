import { AnimatePresence, motion } from "motion/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"

import { getLoadoutById } from "../../../../constants/buildcraft.js"
import { buildLoadoutPresentation } from "../../../../constants/buildcraftPresentation.js"
import { BuildIdentityGlyph } from "../../../buildcraft/buildcraftGlyphs.jsx"
import { usePrefersReducedMotion } from "./useOverlayMotion.js"

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

function ReadyQuickBuildCard({
  loadout,
  index,
  presentation,
  isActive = false,
  onClick,
}) {
  return (
    <button
      type="button"
      className={`readyQuickBuildCard ${isActive ? "isActive" : ""}`}
      onClick={onClick}
    >
      <span className="readyQuickBuildGlyph" aria-hidden="true">
        <BuildIdentityGlyph
          identity={presentation?.identity.label}
          className="readyQuickBuildGlyphIcon"
        />
      </span>
      <div className="readyQuickBuildBody">
        <span className="readyQuickBuildLabel">Build {index + 1}</span>
        <strong className="readyQuickBuildName">{loadout.name}</strong>
        <span className="readyQuickBuildMeta">{presentation?.titleLine ?? "Balanced"}</span>
      </div>
    </button>
  )
}

export function ReadyOverlay({
  onStart,
  modes = [],
  selectedModeId,
  onSelectMode,
  canChangeMode = true,
  savedLoadouts = [],
  activeLoadoutId = "",
  onLoadoutStateChange,
  onClose,
}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const overlayCardRef = useRef(null)
  const [localSelectedModeId, setLocalSelectedModeId] = useState(selectedModeId)
  const [localActiveLoadoutId, setLocalActiveLoadoutId] = useState(activeLoadoutId)
  const [modeTransitionDirection, setModeTransitionDirection] = useState(1)

  useEffect(() => {
    setLocalSelectedModeId(selectedModeId)
  }, [selectedModeId])

  useEffect(() => {
    setLocalActiveLoadoutId(activeLoadoutId)
  }, [activeLoadoutId])

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
  const activeLoadout = useMemo(
    () => getLoadoutById(savedLoadouts, localActiveLoadoutId),
    [localActiveLoadoutId, savedLoadouts]
  )
  const loadoutPresentations = useMemo(() => {
    if (!selectedMode) return {}

    return Object.fromEntries(
      savedLoadouts.map((loadout) => [
        loadout.id,
        buildLoadoutPresentation(selectedMode, loadout),
      ])
    )
  }, [savedLoadouts, selectedMode])
  const activePresentation = activeLoadout?.id ? loadoutPresentations[activeLoadout.id] : null

  function handleActivateLoadout(nextLoadoutId) {
    if (!nextLoadoutId || nextLoadoutId === localActiveLoadoutId) return
    setLocalActiveLoadoutId(nextLoadoutId)
    onLoadoutStateChange?.({
      savedLoadouts,
      activeLoadoutId: nextLoadoutId,
    })
  }

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
    onStart?.(selectedMode.id, localActiveLoadoutId)
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

  const startButtonLabel = selectedMode ? `Start ${selectedMode.label}` : "Start Round"
  const currentModePosition = modeCount ? activeModeIndex + 1 : 0

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
            Choose Round
          </h2>
          <p className="readyLead">
            Pick a mode, glance at your active build, and start. Open Armory only when you want to retune the build itself.
          </p>
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

        {activeLoadout && activePresentation ? (
          <MotionDiv
            className="readyBuildStrip readyBuildStripV2"
            aria-label="Current build"
            variants={prefersReducedMotion ? undefined : readySectionVariants}
          >
            <div className="readyBuildStripIdentity">
              <span className="readyBuildStripGlyph" aria-hidden="true">
                <BuildIdentityGlyph
                  identity={activePresentation.identity.label}
                  className="readyBuildStripGlyphIcon"
                />
              </span>
              <div className="readyBuildStripCopy">
                <span className="readyBuildStripLabel">Current Build</span>
                <strong className="readyBuildStripName">
                  {activeLoadout.name} • {activePresentation.titleLine}
                </strong>
                <span className="readyBuildStripSummary">
                  {activePresentation.glanceText} • {activePresentation.bestFor}
                </span>
              </div>
            </div>
          </MotionDiv>
        ) : null}

        {selectedMode ? (
          <MotionDiv
            className="readyQuickBuildRow"
            variants={prefersReducedMotion ? undefined : readySectionVariants}
          >
            {savedLoadouts.map((loadout, index) => (
              <ReadyQuickBuildCard
                key={loadout.id}
                loadout={loadout}
                index={index}
                presentation={loadoutPresentations[loadout.id]}
                isActive={loadout.id === localActiveLoadoutId}
                onClick={() => handleActivateLoadout(loadout.id)}
              />
            ))}
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
              </Link>
            </div>
            <Link className="secondaryButton readyHelpLink" to="/help">
              How To Play
            </Link>
          </div>
        </MotionDiv>
      </MotionSection>
    </MotionDiv>
  )
}
