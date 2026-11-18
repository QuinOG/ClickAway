import { motion } from "motion/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"

import { CoinIcon, GemIcon, ModeEmblem, PowerEmblem } from "../../../../components/art/GameIcons.jsx"
import ArenaWorldArt from "../../../../components/art/ArenaWorldArt.jsx"

import { Tooltip } from "../../../../components/ui/index.js"
import { formatDrillBestMetric } from "../../../../utils/drillStatsUtils.js"
import { getRankImageSrc, getRankToneClassName } from "../../../../utils/rankUtils.js"
import { usePrefersReducedMotion } from "./gameRoundOverlayMotionHooks.js"
import { getProfileStats } from "../../../armory/armorySpecRatings.js"

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

const LOBBY_SPEC_LABELS = { size: "Target", shrink: "Shrink", combo: "Combo", charge: "Charge" }

function LobbyStage({ targetPreview, tone, loadoutName, loadoutDetail, powerSlots, showArmoryBadge, roundRules }) {
  const specs = roundRules ? getProfileStats(roundRules).filter((stat) => LOBBY_SPEC_LABELS[stat.key]) : []
  const hasImage = Boolean(targetPreview?.imageSrc)
  const targetStyle = hasImage
    ? { backgroundImage: `url(${targetPreview.imageSrc})`, backgroundSize: `${targetPreview.imageScale ?? 100}%` }
    : undefined

  return (
    <div className={`lobbyStage lobbyStage-${tone} ${targetPreview?.arenaThemeClass ?? "theme-default"}`}>
      <ArenaWorldArt />
      <span className="lobbyStageFloor" aria-hidden="true" />
      <span className="lobbyStageBeam" aria-hidden="true" />
      <span className="lobbyStageOrbit isOuter" aria-hidden="true" />
      <span className="lobbyStageOrbit isInner" aria-hidden="true" />
      <img className="lobbyStageRig" src="/art/play/target-stand.png" alt="" aria-hidden="true" width="640" height="571" decoding="async" />
      <span
        aria-hidden="true"
        className={`lobbyStageTarget bigCircleButton ${hasImage ? "hasImage" : targetPreview?.skinClass ?? "skin-default"}`}
        style={targetStyle}
      >
        {hasImage ? null : (
          <span className="targetFace">
            <i className="targetFaceRing" />
            <i className="targetFaceCore" />
          </span>
        )}
      </span>
      <div className="lobbyStageLoadout" aria-label="Current active build">
        <Tooltip content={loadoutDetail} placement="top">
          <strong tabIndex="0">{loadoutName || "Loadout"}</strong>
        </Tooltip>
        <Link className="lobbyTextLink lobbyStageEdit" to="/armory">
          View in Armory
          {showArmoryBadge ? <b>New</b> : null}
        </Link>
        <span className="lobbyStagePowers" aria-hidden="true">
          {powerSlots.slice(0, 3).map((slot, index) => (
            <span key={`${slot.id ?? index}`} className="lobbyStagePower">
              <PowerEmblem powerupId={slot.id} size={22} />
              <kbd>{index + 1}</kbd>
            </span>
          ))}
        </span>
        {specs.length ? (
          <span className="lobbyStageSpecs" aria-label="Build ratings">
            {specs.map((stat) => (
              <span key={stat.key} className={`lobbyStageSpec ${stat.rating >= 7 ? "isHigh" : stat.rating <= 3 ? "isLow" : ""}`}>
                <small>{LOBBY_SPEC_LABELS[stat.key]}</small>
                <b>{stat.value}</b>
                <i aria-hidden="true">
                  {Array.from({ length: 10 }, (_, index) => <em key={index} className={index < stat.rating ? "isOn" : ""} />)}
                </i>
              </span>
            ))}
          </span>
        ) : null}
      </div>
    </div>
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
        <ModeEmblem className="lobbyModeEmblem" tone={mode.tone} size={56} />
        <span className="lobbyModeName">{mode.label}</span>
        <span className="lobbyModeSummary">{mode.roundLabel} · {mode.goalLabel}</span>
        <span className="lobbyModeReward">{mode.rewardLabel}</span>
        {isSelected ? (
          <span className="lobbyModeBrief" aria-hidden="true">
            <span className="lobbyModeBriefStat"><small>Time</small><b>{mode.roundLabel}</b></span>
            <span className="lobbyModeBriefStat"><small>Miss</small><b>{mode.missPenalty > 0 ? `-${mode.missPenalty}` : "Free"}</b></span>
            <span className="lobbyModeBriefStat">
              <small>Pressure</small>
              <b className="lobbyModeBriefPips">
                {[1, 2, 3].map((level) => <i key={level} className={level <= mode.pressureLevel ? "isOn" : ""} />)}
              </b>
            </span>
          </span>
        ) : null}
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

// The selected mode's track record as a mini scoreboard: best / average /
// rounds tiles over a bar chart of the last ten scores (oldest left).
// The current time, refreshed every minute while the lobby is open, so the
// reset countdown moves and goals from a day that has ended are replaced.
function useMinuteClock() {
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 60000)
    return () => window.clearInterval(intervalId)
  }, [])
  return nowMs
}

function areDailyGoalsExpired(dailyGoals, nowMs) {
  const resetsAtMs = Date.parse(dailyGoals?.resetsAt)
  return Number.isFinite(resetsAtMs) && nowMs >= resetsAtMs
}

function formatResetsIn(resetsAt, nowMs) {
  const remainingMs = Date.parse(resetsAt) - nowMs
  // Outside one day the clock disagrees with the server's; say nothing rather than something wrong.
  if (!(remainingMs > 0) || remainingMs > 86400000) return ""
  const hours = Math.floor(remainingMs / 3600000)
  return hours >= 1 ? `New goals in ${hours}h` : `New goals in ${Math.max(1, Math.ceil(remainingMs / 60000))}m`
}


// Today's three goals with their progress, as of the last progress read (every
// round save brings a fresh copy). Once their day has ended they're replaced by
// a note until the next save brings the new day's goals.
function DailyGoals({ dailyGoals, nowMs, isPracticeSelected, dailyBonusAvailable }) {
  if (!dailyGoals?.goals?.length) return null
  if (areDailyGoalsExpired(dailyGoals, nowMs)) {
    return (
      <section className="lobbyDailyGoals" aria-label="Daily goals">
        <header className="lobbyDailyGoalsHeader"><span>Daily goals</span></header>
        <p className="lobbyDailyGoalsNote">New goals are ready. They'll show after your next round.</p>
      </section>
    )
  }
  const resetsIn = dailyGoals.resetsAt ? formatResetsIn(dailyGoals.resetsAt, nowMs) : ""
  const doneCount = dailyGoals.goals.filter((goal) => goal.isComplete).length
  const note = isPracticeSelected
    ? "Practice rounds don't count toward goals."
    : dailyBonusAvailable ? "Your first round today earns 2× XP." : ""

  return (
    <section className="lobbyDailyGoals" aria-label="Daily goals">
      <header className="lobbyDailyGoalsHeader">
        <span>Daily goals · {doneCount}/{dailyGoals.goals.length}</span>
        <small>{resetsIn}</small>
      </header>
      <ul>
        {dailyGoals.goals.map((goal) => (
          <li key={goal.id} className={goal.isComplete ? "isComplete" : ""}>
            <span className="lobbyDailyGoalMark" aria-hidden="true">{goal.isComplete ? "✓" : ""}</span>
            <span className="lobbyDailyGoalLabel">
              {goal.label}
              <span className="uiVisuallyHidden">{goal.isComplete ? ", done" : `, ${goal.progress} of ${goal.target}`}</span>
            </span>
            <span className="lobbyDailyGoalProgress" aria-hidden="true">
              {goal.isComplete ? "Done" : `${goal.progress}/${goal.target}`}
            </span>
            <span className="lobbyDailyGoalReward">
              <span className="uiVisuallyHidden">Reward: {goal.reward.coins} coins and {goal.reward.xp} XP</span>
              <span aria-hidden="true"><CoinIcon size={14} />{goal.reward.coins}</span>
              <span aria-hidden="true"><GemIcon size={14} />{goal.reward.xp}</span>
            </span>
          </li>
        ))}
      </ul>
      {note ? <p className={`lobbyDailyGoalsNote ${isPracticeSelected ? "" : "isBonus"}`}>{note}</p> : null}
    </section>
  )
}

// Phones only: the full list sits below Start, so one line above it says the
// goals are there and what's next.
function DailyGoalsSummary({ dailyGoals, nowMs }) {
  if (!dailyGoals?.goals?.length) return null
  if (areDailyGoalsExpired(dailyGoals, nowMs)) {
    return <p className="lobbyDailyGoalsSummary" aria-hidden="true"><span>Daily goals</span><b>New goals after your next round</b></p>
  }
  const doneCount = dailyGoals.goals.filter((goal) => goal.isComplete).length
  const nextGoal = dailyGoals.goals.find((goal) => !goal.isComplete)
  return (
    <p className="lobbyDailyGoalsSummary" aria-hidden="true">
      <span>Daily goals {doneCount}/{dailyGoals.goals.length}</span>
      {nextGoal ? <b>{nextGoal.label} · {nextGoal.progress}/{nextGoal.target}</b> : <b>All done today</b>}
    </p>
  )
}

function ModeRecord({ mode, recentRounds = [] }) {
  const rounds = recentRounds.filter((round) => round.modeId === mode.id).slice(0, 10)
  if (!rounds.length) return null
  const scores = rounds.map((round) => Number(round.score) || 0).reverse()
  const best = Math.max(...scores)
  const chartCeiling = Math.max(1, best)
  const average = Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
  const latest = scores[scores.length - 1]
  const trend = scores.length > 1 ? latest - scores[scores.length - 2] : 0

  return (
    <section className="lobbyModeRecord" aria-label={`${mode.label} record`}>
      <header className="lobbyModeRecordHeader">
        <span>{mode.label} record</span>
        <small className={trend >= 0 ? "isUp" : "isDown"}>Last {latest.toLocaleString()} {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toLocaleString()}</small>
      </header>
      <div className="lobbyModeRecordTiles">
        <span className="isBest"><small>Best</small><b>{best.toLocaleString()}</b></span>
        <span><small>Average</small><b>{average.toLocaleString()}</b></span>
        <span><small>Rounds</small><b>{rounds.length}</b></span>
      </div>
      <div className="lobbyModeRecordChart" aria-hidden="true">
        <i className="lobbyModeRecordAvg" style={{ bottom: `${(average / chartCeiling) * 100}%` }} />
        {Array.from({ length: 10 - scores.length }, (_, index) => <b key={`empty-${index}`} className="isEmpty" />)}
        {scores.map((value, index) => (
          <b
            key={index}
            className={`${value === best ? "isBest" : ""} ${index === scores.length - 1 ? "isLatest" : ""}`}
            style={{ height: `${Math.max(6, (value / chartCeiling) * 100)}%` }}
          />
        ))}
      </div>
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
  dailyBonusAvailable = false,
  dailyGoals = null,
  trainingDrills = [],
  selectedDrillId = null,
  onSelectDrill,
  drillStats = {},
  warmupSuggestion = null,
  rankedPreflight = null,
  rankProgress = null,
  onStartRankedWarmup,
  onClose,
  targetPreview = null,
  recentRounds = [],
}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const dailyGoalsNowMs = useMinuteClock()
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
      if (event.shiftKey && (document.activeElement === first || document.activeElement === lobbyRef.current)) {
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
              {onboardingCoach.stepLabel ? <span className="readyOnboardingCoachStep">{onboardingCoach.stepLabel}</span> : null}
              {onboardingCoach.instruction ? <p className="readyOnboardingCoachNote">{onboardingCoach.instruction}</p> : null}
              {onboardingCoach.note ? <p className="readyOnboardingCoachNote">{onboardingCoach.note}</p> : null}
            </div>
          ) : null}
        </header>

        <LobbyStage
          targetPreview={targetPreview}
          tone={selectedMode?.tone ?? "casual"}
          loadoutName={activeLoadoutName}
          loadoutDetail={loadoutDetail}
          powerSlots={activeLoadoutPresentation?.powerSlots ?? []}
          showArmoryBadge={showArmoryWalkthroughBadge}
          roundRules={activeLoadoutPresentation?.roundRules}
        />

        <div className="lobbyModeSelector">
          <div className="lobbyModeRail" aria-label="Choose a game mode">
            {(onboardingCoach?.singleMode ? lobbyModes.filter((mode) => mode.id === selectedMode?.id) : lobbyModes).map((mode) => (
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

        {selectedMode?.id === "normal" ? <ModeRecord mode={selectedMode} recentRounds={recentRounds} /> : null}

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

        <DailyGoalsSummary dailyGoals={dailyGoals} nowMs={dailyGoalsNowMs} />
        <DailyGoals dailyGoals={dailyGoals} nowMs={dailyGoalsNowMs} isPracticeSelected={selectedMode?.id === "easy"} dailyBonusAvailable={dailyBonusAvailable} />

        <footer className="arenaLobbyFooter">

          <div className="arenaLobbyActions">
            {/* On wide screens the goals list carries this note; phones keep it here, above Start. */}
            {dailyBonusAvailable ? <p className={`arenaLobbyDailyBonus ${dailyGoals?.goals?.length ? "hasDailyGoals" : ""}`}>First round today earns double XP</p> : null}
            <button
              type="button"
              className="primaryButton arenaLobbyStart"
              aria-label={startButtonLabel}
              onClick={() => selectedMode && onStart?.(selectedMode.id)}
              disabled={!selectedMode}
            >
              <span>{startButtonLabel}</span>
            </button>
          </div>
        </footer>
      </MotionSection>
    </MotionDiv>
  )
}
