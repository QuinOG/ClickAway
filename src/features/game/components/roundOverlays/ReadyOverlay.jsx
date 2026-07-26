import { motion } from "motion/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"

import { Tooltip } from "../../../../components/ui/index.js"
import { formatDrillBestMetric } from "../../../../utils/drillStatsUtils.js"
import { getRankImageSrc, getRankToneClassName } from "../../../../utils/rankUtils.js"
import { usePrefersReducedMotion } from "./gameRoundOverlayMotionHooks.js"

const MotionSection = motion.section
const MotionDiv = motion.div
const OVERLAY_EASE = [0.22, 1, 0.36, 1]

const lobbyVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.994 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.24, ease: OVERLAY_EASE },
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.16 } },
}

function getShrinkPaceLabel(shrinkFactor) {
  if (shrinkFactor >= 0.98) return "Relaxed"
  if (shrinkFactor >= 0.96) return "Balanced"
  return "Aggressive"
}

function getModeTone(mode = {}) {
  return String(mode.label || mode.id || "mode").toLowerCase()
}

function getRewardLabel(mode = {}) {
  if (mode.readyRewardLabel) return mode.readyRewardLabel
  if (mode.allowsRankProgression) return "XP + coins + rank"
  if (mode.allowsCoinRewards || mode.allowsLevelProgression) return "XP + coins"
  return "Training only"
}

function getGoalLabel(mode = {}) {
  if (mode.readyGoalLabel) return mode.readyGoalLabel
  if (mode.allowsRankProgression) return "Climb your division"
  if (mode.allowsCoinRewards) return "Set a new score best"
  return "Build clean aim"
}

function toLobbyMode(mode) {
  if (!mode) return null

  return {
    ...mode,
    tone: getModeTone(mode),
    glyph: mode.readyGlyph ?? String(mode.label || "M").charAt(0),
    roundLabel: mode.isTimedRound === false ? "No limit" : `${mode.durationSeconds}s`,
    missLabel: mode.missPenalty > 0 ? `-${mode.missPenalty} score` : "No penalty",
    shrinkLabel: getShrinkPaceLabel(mode.shrinkFactor),
    rewardLabel: getRewardLabel(mode),
    goalLabel: getGoalLabel(mode),
    stakesLevel: mode.allowsRankProgression ? 3 : (mode.allowsCoinRewards ? 1 : 0),
    rewardLevel: mode.allowsRankProgression ? 3 : (mode.allowsCoinRewards || mode.allowsLevelProgression ? 2 : 0),
    pressureLevel: mode.shrinkFactor >= 0.98 ? 1 : (mode.shrinkFactor >= 0.96 ? 2 : 3),
  }
}

function getModeRules(mode) {
  return `${mode.roundLabel}. ${mode.missLabel}. ${mode.shrinkLabel} target pressure. ${mode.rewardLabel}.`
}

function RankedPreflight({
  preflight,
  rankProgress,
  loadoutName,
  loadoutPresentation,
  warmupSuggestion,
  onStartWarmup,
}) {
  if (!preflight) return null

  const rankLabel = rankProgress?.tierLabel ?? "Rank unavailable"
  const rankImageSrc = getRankImageSrc(rankProgress)
  const showsPlacementPips = ["unranked", "placement", "reveal-pending"].includes(preflight.state)
  const progressPercent = preflight.progressMax > 0
    ? Math.min(100, Math.max(0, (preflight.progressValue / preflight.progressMax) * 100))
    : 0

  return (
    <section
      className={`rankedPreflight ${getRankToneClassName(rankProgress)}`}
      data-state={preflight.state}
      aria-label="Ranked preflight"
    >
      <div className="rankedPreflightHero">
        <div className="rankedPreflightCrest" aria-hidden="true">
          {rankImageSrc ? <img src={rankImageSrc} alt="" width="128" height="128" decoding="async" /> : <span>R</span>}
        </div>
        <div className="rankedPreflightIdentity">
          <span>Ranked preflight</span>
          <strong>{rankLabel}</strong>
          <small>{preflight.headline}</small>
        </div>
      </div>

      <details className="rankedPreflightDetails">
        <summary>Review Ranked status and build</summary>
        <div className="rankedPreflightDetailsBody">
          <div className="rankedPreflightProgress">
            {showsPlacementPips ? (
              <div className="rankedPlacementPips" aria-hidden="true">
                {Array.from({ length: preflight.progressMax }, (_, index) => (
                  <span key={index} className={index < preflight.progressValue ? "isComplete" : ""} />
                ))}
              </div>
            ) : (
              <span className="rankedRrTrack" aria-hidden="true">
                <span style={{ width: `${progressPercent}%` }} />
              </span>
            )}
            <span
              className="rankedProgressSemantic"
              role="progressbar"
              aria-valuemin="0"
              aria-valuemax={preflight.progressMax}
              aria-valuenow={preflight.progressValue}
              aria-valuetext={preflight.progressText}
            >
              {preflight.progressText}
            </span>
            <p>{preflight.detail}</p>
          </div>

          <div className="rankedPreflightReadouts">
            <div>
              <span>Recent trend</span>
              <strong className={`is-${preflight.recentTrend.tone}`}>{preflight.recentTrend.label}</strong>
            </div>
            <div>
              <span>Active build</span>
              <strong>{loadoutName}</strong>
              {loadoutPresentation?.titleLine ? <small>{loadoutPresentation.titleLine}</small> : null}
            </div>
          </div>

          <p className="rankedStakesCopy">
            Your score, accuracy, streak, and misses determine the RR result. No fixed change is guaranteed.
          </p>

          {warmupSuggestion ? (
            <div className="rankedWarmupAction">
              <p><strong>{warmupSuggestion.label}</strong> is recommended. {warmupSuggestion.description}</p>
              <button type="button" className="readyWarmupButton" onClick={onStartWarmup}>
                Warm up in Practice
              </button>
            </div>
          ) : null}
        </div>
      </details>
    </section>
  )
}

function ModeChoice({ mode, isSelected, disabled, onSelect }) {
  const modeRules = getModeRules(mode)

  return (
    <Tooltip content={modeRules} placement="bottom">
      <button
        type="button"
        className={`lobbyModeChoice lobbyModeChoice-${mode.tone} ${isSelected ? "isSelected" : ""}`}
        data-mode={mode.id}
        aria-label={`Select ${mode.label}`}
        aria-pressed={isSelected}
        aria-describedby={`lobby-mode-summary-${mode.id}`}
        disabled={disabled}
        onClick={() => onSelect(mode.id)}
      >
        <span className="lobbyModeChoiceTopline">
          <span className="lobbyModeGlyph" aria-hidden="true">{mode.glyph}</span>
          <span className="lobbyModeName">{mode.label}</span>
          <span className="lobbyModeSelectedMark" aria-hidden="true">✓</span>
        </span>
        <span className="lobbyModeSummary">{mode.roundLabel} · {mode.goalLabel}</span>
        <span className="lobbyModeReward">{mode.rewardLabel}</span>
        <span id={`lobby-mode-summary-${mode.id}`} className="uiVisuallyHidden">{modeRules}</span>
      </button>
    </Tooltip>
  )
}

function PracticeDrawer({
  isOpen,
  onToggle,
  drills,
  selectedDrillId,
  onSelectDrill,
  drillStats,
  warmupSuggestion,
}) {
  return (
    <section className={`practiceDrawer ${isOpen ? "isOpen" : ""}`} aria-label="Practice training">
      <button
        type="button"
        className="practiceDrawerTrigger"
        aria-expanded={isOpen}
        aria-controls="practice-drawer-content"
        onClick={onToggle}
      >
        <span>
          <span className="practiceDrawerEyebrow">Practice lab</span>
          <strong>{selectedDrillId ? "Focused drill selected" : "Free Practice selected"}</strong>
        </span>
        <span aria-hidden="true">{isOpen ? "Close" : "Choose drill"}</span>
      </button>

      {isOpen ? (
        <div id="practice-drawer-content" className="practiceDrawerContent">
          {warmupSuggestion ? (
            <p className="practiceWarmupNote">
              Recommended: <strong>{warmupSuggestion.label}</strong> — {warmupSuggestion.description}
            </p>
          ) : null}
          <div className="practiceDrillGrid">
            <button
              type="button"
              className={`practiceDrillChoice ${selectedDrillId ? "" : "isSelected"}`}
              aria-pressed={!selectedDrillId}
              onClick={() => onSelectDrill?.(null)}
            >
              <strong>Free Practice</strong>
              <span>No timer pressure or drill goal.</span>
              <small>Open training</small>
            </button>
            {drills.map((drill) => (
              <button
                key={drill.id}
                type="button"
                className={`practiceDrillChoice ${selectedDrillId === drill.id ? "isSelected" : ""}`}
                aria-pressed={selectedDrillId === drill.id}
                onClick={() => onSelectDrill?.(drill.id)}
              >
                <strong>{drill.label}</strong>
                <span>{drill.description}</span>
                <small>Best: {formatDrillBestMetric(drill, drillStats[drill.id])}</small>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

export function ReadyOverlay({
  onStart,
  modes = [],
  selectedModeId,
  onSelectMode,
  canChangeMode = true,
  activeLoadoutName = "Loadout",
  activeLoadoutPresentation = null,
  showArmoryWalkthroughBadge = false,
  onboardingCoach = null,
  showTrainingSuite = false,
  trainingDrills = [],
  selectedDrillId = null,
  onSelectDrill,
  drillStats = {},
  warmupSuggestion = null,
  rankedPreflight = null,
  rankProgress = null,
  onStartRankedWarmup,
  onClose,
}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const lobbyRef = useRef(null)
  const previousFocusRef = useRef(null)
  const [localSelectedModeId, setLocalSelectedModeId] = useState(selectedModeId)
  const [isPracticeDrawerOpen, setIsPracticeDrawerOpen] = useState(false)

  useEffect(() => {
    setLocalSelectedModeId(selectedModeId)
  }, [selectedModeId])

  useEffect(() => {
    previousFocusRef.current = document.activeElement
    lobbyRef.current?.focus()
    return () => previousFocusRef.current?.focus?.()
  }, [])

  const lobbyModes = useMemo(() => modes.map(toLobbyMode).filter(Boolean), [modes])
  const selectedIndex = Math.max(0, lobbyModes.findIndex((mode) => mode.id === localSelectedModeId))
  const selectedMode = lobbyModes[selectedIndex] ?? lobbyModes[0] ?? null
  const selectedModeRules = selectedMode ? getModeRules(selectedMode) : ""

  useEffect(() => {
    if (!showTrainingSuite) setIsPracticeDrawerOpen(false)
  }, [showTrainingSuite])

  function selectMode(modeId) {
    if (!canChangeMode) return
    setLocalSelectedModeId(modeId)
    onSelectMode?.(modeId)
  }

  function moveMode(direction) {
    if (!canChangeMode || !lobbyModes.length) return
    const nextIndex = (selectedIndex + direction + lobbyModes.length) % lobbyModes.length
    selectMode(lobbyModes[nextIndex].id)
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      if (isPracticeDrawerOpen) {
        event.preventDefault()
        setIsPracticeDrawerOpen(false)
      } else if (onClose) {
        event.preventDefault()
        onClose()
      }
      return
    }

    if (event.key === "Tab") {
      const focusable = [...lobbyRef.current.querySelectorAll(
        'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'
      )]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
      return
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault()
      moveMode(event.key === "ArrowLeft" ? -1 : 1)
      return
    }

    if (event.key === "Enter" && event.target === lobbyRef.current) {
      event.preventDefault()
      if (selectedMode) onStart?.(selectedMode.id)
    }
  }

  const startButtonLabel = onboardingCoach?.startLabel
    ?? (selectedMode ? `Start ${selectedMode.label}` : "Start Round")
  const readyTitle = onboardingCoach?.title ?? "Enter the arena"
  const readyLead = onboardingCoach?.instruction
    ?? "Choose how you want to play. Your build is locked in when the round begins."
  const loadoutDetail = activeLoadoutPresentation?.glanceText
    || activeLoadoutPresentation?.identity?.description
    || "Ready with your equipped modules and powers."

  return (
    <MotionDiv
      className={`gameOverlay arenaLobbyBackdrop arenaLobbyMood-${selectedMode?.tone ?? "casual"}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="round-ready-title"
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={prefersReducedMotion ? undefined : { opacity: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: OVERLAY_EASE }}
    >
      <MotionSection
        className="readyCard arenaLobby"
        ref={lobbyRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        variants={prefersReducedMotion ? undefined : lobbyVariants}
        initial={prefersReducedMotion ? false : "hidden"}
        animate="visible"
        exit={prefersReducedMotion ? undefined : "exit"}
      >
        <header className="arenaLobbyHeader">
          <div>
            <span className="arenaLobbyKicker">Round lobby</span>
            <h2 id="round-ready-title">{readyTitle}</h2>
            <p>{readyLead}</p>
          </div>
          {onboardingCoach ? (
            <div className="readyOnboardingCoach" aria-label="First session onboarding">
              <span className="readyOnboardingCoachStep">{onboardingCoach.stepLabel}</span>
              {onboardingCoach.note ? <p className="readyOnboardingCoachNote">{onboardingCoach.note}</p> : null}
            </div>
          ) : null}
        </header>

        <div className="lobbyModeSelector">
          <div className="lobbyModeRail" aria-label="Choose a game mode">
            {lobbyModes.map((mode) => (
              <ModeChoice
                key={mode.id}
                mode={mode}
                isSelected={mode.id === selectedMode?.id}
                disabled={!canChangeMode && mode.id !== selectedMode?.id}
                onSelect={selectMode}
              />
            ))}
          </div>
        </div>

        <p className="uiVisuallyHidden" aria-live="polite">
          {selectedMode ? `${selectedMode.label} selected. ${selectedModeRules}` : "No mode selected."}
        </p>

        {selectedMode?.id === "hard" ? (
          <RankedPreflight
            preflight={rankedPreflight}
            rankProgress={rankProgress}
            loadoutName={activeLoadoutName}
            loadoutPresentation={activeLoadoutPresentation}
            warmupSuggestion={warmupSuggestion}
            onStartWarmup={onStartRankedWarmup}
          />
        ) : null}

        {showTrainingSuite ? (
          <PracticeDrawer
            isOpen={isPracticeDrawerOpen}
            onToggle={() => setIsPracticeDrawerOpen((isOpen) => !isOpen)}
            drills={trainingDrills}
            selectedDrillId={selectedDrillId}
            onSelectDrill={onSelectDrill}
            drillStats={drillStats}
            warmupSuggestion={warmupSuggestion}
          />
        ) : null}

        <footer className="arenaLobbyFooter">
          <div className="lobbyBuildReadiness" aria-label="Current active build">
            <span className="lobbyBuildStatus" aria-hidden="true" />
            <Tooltip content={loadoutDetail} placement="top">
              <span className="lobbyBuildIdentity" tabIndex="0">
                <small>Build ready</small>
                <strong>{activeLoadoutName || "Loadout"}</strong>
              </span>
            </Tooltip>
            <Link className="lobbyTextLink" to="/armory">
              View in Armory
              {showArmoryWalkthroughBadge ? <b>New</b> : null}
            </Link>
          </div>

          <div className="arenaLobbyActions">
            <button
              type="button"
              className="primaryButton arenaLobbyStart"
              aria-label={startButtonLabel}
              onClick={() => selectedMode && onStart?.(selectedMode.id)}
              disabled={!selectedMode}
            >
              <span>{startButtonLabel}</span>
              <small>{selectedMode?.roundLabel} · {selectedMode?.rewardLabel}</small>
            </button>
          </div>
        </footer>
      </MotionSection>
    </MotionDiv>
  )
}
