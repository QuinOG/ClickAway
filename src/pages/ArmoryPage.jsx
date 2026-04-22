import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import {
  DEFAULT_SAVED_LOADOUTS,
  LOADOUT_POWERUPS,
  MODULE_SLOTS,
  PASSIVE_LOADOUT_MODULES,
  getLoadoutById,
  getPassiveModuleById,
  getPowerupById,
} from "../constants/buildcraft.js"
import { BUILD_WALKTHROUGH_STATUS } from "../constants/buildWalkthrough.js"
import {
  buildLoadoutPresentation,
  getModuleOptionPresentation,
  getPowerupOptionPresentation,
} from "../constants/buildcraftPresentation.js"
import {
  BuildIdentityGlyph,
  ModuleSlotGlyph,
  PowerupGlyph,
} from "../features/buildcraft/buildcraftGlyphs.jsx"

const ARMORY_STEPS = [
  { id: "slot", label: "Build Slot", lead: "Name it, make it active, or reset it." },
  { id: "passives", label: "Passive Stack", lead: "Tune the 3 systems that shape the round." },
  { id: "hotbar", label: "Hotbar", lead: "Choose the tools on keys 1, 2, and 3." },
  { id: "review", label: "Review Sim", lead: "See how the build feels in the current mode." },
]

const WALKTHROUGH_STEPS = [
  {
    id: "welcome",
    title: "Builds live here",
    instruction: "Armory changes your active build. Ready just launches whatever is active next round.",
    note: "This walkthrough edits the real slot on your account, and every change saves instantly.",
  },
  {
    id: "slot",
    armoryStepId: "slot",
    targetId: "slot",
    title: "This is your live build slot",
    instruction: "Rename it if you want, or keep the current name and move on.",
    note: "Ready will use this exact slot next round.",
  },
  {
    id: "tempo",
    armoryStepId: "passives",
    targetId: "passives",
    moduleSlotId: "tempoCore",
    title: "Tempo Core shapes pace",
    instruction: "Pick the target pace you want, or keep the current option.",
    note: "This lane changes target size, shrink pressure, and score pace.",
  },
  {
    id: "streak",
    armoryStepId: "passives",
    targetId: "passives",
    moduleSlotId: "streakLens",
    title: "Streak Lens changes combo risk",
    instruction: "Choose how fast combo grows and how punishing misses feel.",
    note: "Safer options recover better. Greedier options score harder.",
  },
  {
    id: "rig",
    armoryStepId: "passives",
    targetId: "passives",
    moduleSlotId: "powerRig",
    title: "Power Rig controls charge tempo",
    instruction: "Pick how your round tools arrive, or keep the current rig.",
    note: "Some rigs start charged. Others make later charges faster or slower.",
  },
  {
    id: "hotbar-1",
    armoryStepId: "hotbar",
    targetId: "hotbar",
    powerSlotIndex: 0,
    title: "Key 1 is your first tool",
    instruction: "Choose any unlocked power for key 1.",
    note: "Duplicates are blocked automatically, so each key stays distinct.",
  },
  {
    id: "hotbar-2",
    armoryStepId: "hotbar",
    targetId: "hotbar",
    powerSlotIndex: 1,
    title: "Key 2 is your backup tool",
    instruction: "Pick a second power that complements the first.",
    note: "Think in moments: stabilizer, bailout, or score push.",
  },
  {
    id: "hotbar-3",
    armoryStepId: "hotbar",
    targetId: "hotbar",
    powerSlotIndex: 2,
    title: "Key 3 finishes the loadout",
    instruction: "Choose the last power, or keep the one already equipped.",
    note: "Your hotbar is the live 1 / 2 / 3 tray you will see in-round.",
  },
  {
    id: "review",
    armoryStepId: "review",
    targetId: "review",
    title: "Quick confidence check",
    instruction: "This is the readout for your current mode. Glance at the feel summary, strengths, tradeoffs, and hotbar cadence.",
    note: "If it feels right, head back to Ready. If not, keep tuning here.",
  },
]

function getUnlockText(unlockLevel = 1) {
  return `Unlocks at Level ${unlockLevel}`
}

function normalizeDraftName(name = "", fallbackName = "Loadout") {
  const trimmed = String(name || "").trim().replace(/\s+/g, " ").slice(0, 24)
  return trimmed || fallbackName
}

function formatSignedPercent(multiplier = 1) {
  const delta = Math.round((Number(multiplier) - 1) * 100)
  if (delta === 0) return "No score change"
  return `${delta > 0 ? "+" : ""}${delta}% score`
}

function formatSignedNumber(value = 0, digits = 0) {
  const normalizedValue = Number(value) || 0
  return `${normalizedValue > 0 ? "+" : ""}${normalizedValue.toFixed(digits)}`
}

function buildCommittedNameResult(loadouts = [], activeLoadout = null, nameDraft = "") {
  const nextName = normalizeDraftName(nameDraft, activeLoadout?.name || "Loadout")

  if (!activeLoadout || nextName === activeLoadout.name) {
    return { nextSavedLoadouts: loadouts, nextName, didChange: false }
  }

  return {
    nextSavedLoadouts: loadouts.map((loadout) => (
      loadout.id === activeLoadout.id ? { ...loadout, name: nextName } : loadout
    )),
    nextName,
    didChange: true,
  }
}

function getModuleExactChips(module = null) {
  const effects = module?.effects ?? {}
  const chips = []

  if (effects.initialButtonSize) chips.push(`Start size ${formatSignedNumber(effects.initialButtonSize)}`)
  if (effects.minButtonSize) chips.push(`Min size ${formatSignedNumber(effects.minButtonSize)}`)
  if (effects.shrinkFactor) chips.push(`Shrink ${formatSignedNumber(effects.shrinkFactor, 2)}`)
  if (effects.comboStep) chips.push(`Combo step ${formatSignedNumber(effects.comboStep)}`)
  if (effects.missPenalty) chips.push(`Miss penalty ${formatSignedNumber(effects.missPenalty)}`)
  if (effects.scoreMultiplier) chips.push(formatSignedPercent(effects.scoreMultiplier))
  if (effects.powerupAwardMultiplier) {
    chips.push(`Charge rate x${Number(effects.powerupAwardMultiplier).toFixed(2)}`)
  }
  if (effects.startingPowerupCharges) chips.push(`Start +${effects.startingPowerupCharges} charge`)

  return chips.length ? chips : ["No exact stat changes"]
}

function getPowerupExactChips(powerup = null, adjustedAwardEvery = 0) {
  if (!powerup) return ["Choose a power to see the exact behavior."]

  const cadenceChip = `Charge every ${adjustedAwardEvery || powerup.awardEvery} streak`

  if (powerup.effectType === "time_boost") return ["+2 seconds in timed rounds", cadenceChip]
  if (powerup.effectType === "size_boost") return ["+10 current size", "Stops at round start size", cadenceChip]
  if (powerup.effectType === "freeze_movement") return ["Freeze movement for 1 second", cadenceChip]
  if (powerup.effectType === "magnet_center") {
    return ["Snap target to center", "+6 size and 0.4s freeze", cadenceChip]
  }
  if (powerup.effectType === "combo_surge") {
    return ["Next 4 hits score as streak +4", "Real streak stays unchanged", cadenceChip]
  }
  if (powerup.effectType === "guard_charge") {
    return ["Next miss within 8 seconds is ignored", "Guard is consumed on miss", cadenceChip]
  }

  return [cadenceChip]
}

function getStepSummary(stepId, activeLoadout, activePresentation, selectedMode) {
  if (stepId === "slot") return activeLoadout?.name || "Saved build"
  if (stepId === "passives") {
    return activePresentation?.moduleStack?.map((module) => module.label).join(" / ") || "3 passive systems"
  }
  if (stepId === "hotbar") {
    return activePresentation?.powerSlots?.map((powerSlot) => `${powerSlot.slotKey}: ${powerSlot.label}`).join(" / ") || "3 hotbar tools"
  }

  return selectedMode?.label ? `${selectedMode.label} preview` : "Current mode preview"
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function measureSpotlightRect(shellElement, targetElement) {
  if (!shellElement || !targetElement) return null

  const shellRect = shellElement.getBoundingClientRect()
  const targetRect = targetElement.getBoundingClientRect()
  const padding = 14
  const left = clamp(targetRect.left - shellRect.left - padding, 8, shellRect.width - 8)
  const top = clamp(targetRect.top - shellRect.top - padding, 8, shellRect.height - 8)
  const right = clamp(targetRect.right - shellRect.left + padding, 8, shellRect.width - 8)
  const bottom = clamp(targetRect.bottom - shellRect.top + padding, 8, shellRect.height - 8)

  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  }
}

function ArmoryStepGlyph({ stepId = "", className = "" }) {
  if (stepId === "passives") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6.5h12" />
        <path d="M6 12h12" />
        <path d="M6 17.5h12" />
        <circle cx="9" cy="6.5" r="1.5" />
        <circle cx="15" cy="12" r="1.5" />
        <circle cx="11" cy="17.5" r="1.5" />
      </svg>
    )
  }

  if (stepId === "hotbar") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="6" width="16" height="12" rx="3" />
        <path d="M9 10.5h0" />
        <path d="M12 10.5h0" />
        <path d="M15 10.5h0" />
      </svg>
    )
  }

  if (stepId === "review") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="2" />
        <path d="M12 3v2.5" />
        <path d="M12 18.5V21" />
        <path d="M3 12h2.5" />
        <path d="M18.5 12H21" />
      </svg>
    )
  }

  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 7.5h12" />
      <path d="M6 12h12" />
      <path d="M6 16.5h8" />
      <path d="M16.5 16.5h1" />
    </svg>
  )
}

function ArmoryRailStepButton({ step, index, isActive = false, onClick }) {
  return (
    <button
      type="button"
      className={`armoryRailStepButton ${isActive ? "isActive" : ""}`}
      onClick={onClick}
    >
      <span className="armoryRailStepIndex">{index + 1}</span>
      <span className="armoryRailStepGlyph" aria-hidden="true">
        <ArmoryStepGlyph stepId={step.id} className="armoryRailStepGlyphIcon" />
      </span>
      <span className="armoryRailStepBody">
        <strong className="armoryRailStepTitle">{step.label}</strong>
        <span className="armoryRailStepLead">{step.lead}</span>
      </span>
    </button>
  )
}

function ArmorySlotRailButton({ loadout, index, presentation, isActive = false, onClick }) {
  return (
    <button
      type="button"
      className={`armorySlotRailButton ${isActive ? "isActive" : ""}`}
      onClick={onClick}
    >
      <span className="armorySlotRailIndex">{index + 1}</span>
      <span className="armorySlotRailBody">
        <span className="armorySlotRailLabel">Build {index + 1}</span>
        <strong className="armorySlotRailName">{loadout.name}</strong>
      </span>
      <span className="armorySlotRailGlyph" aria-hidden="true">
        <BuildIdentityGlyph
          identity={presentation?.identity.label}
          className="armorySlotRailGlyphIcon"
        />
      </span>
    </button>
  )
}

function ArmoryStepCard({ step, index, summary, isActive = false, onActivate, children }) {
  return (
    <section className={`armoryStepCard armoryStepCard-${step.id} ${isActive ? "isActive" : ""}`}>
      <button
        type="button"
        className="armoryStepToggle"
        onClick={onActivate}
        aria-expanded={isActive}
      >
        <span className="armoryStepIndex">{index + 1}</span>
        <span className="armoryStepGlyph" aria-hidden="true">
          <ArmoryStepGlyph stepId={step.id} className="armoryStepGlyphIcon" />
        </span>
        <span className="armoryStepHeading">
          <strong className="armoryStepTitle">{step.label}</strong>
          <span className="armoryStepLead">{step.lead}</span>
        </span>
        <span className="armoryStepSummary">{summary}</span>
      </button>
      {isActive ? <div className="armoryStepContent">{children}</div> : null}
    </section>
  )
}

function ArmoryChoiceCard({
  tone = "",
  icon = null,
  label,
  impact = "",
  hint = "",
  isSelected = false,
  isDisabled = false,
  onClick,
}) {
  return (
    <button
      type="button"
      className={`armoryChoiceCard ${tone} ${isSelected ? "isSelected" : ""}`}
      disabled={isDisabled}
      onClick={onClick}
    >
      <span className="armoryChoiceIcon" aria-hidden="true">{icon}</span>
      <span className="armoryChoiceBody">
        <strong className="armoryChoiceLabel">{label}</strong>
        <span className="armoryChoiceImpact">{impact}</span>
      </span>
      {hint ? <span className="armoryChoiceHint">{hint}</span> : null}
    </button>
  )
}

function ArmoryDetailPanel({ eyebrow = "", title = "", lead = "", rows = [], exactChips = [] }) {
  return (
    <section className="armoryDetailPanel" aria-label={title}>
      <div className="armoryDetailHeader">
        <p className="armoryDetailEyebrow">{eyebrow}</p>
        <h3 className="armoryDetailTitle">{title}</h3>
        <p className="armoryDetailLead">{lead}</p>
      </div>

      <div className="armoryDetailRows">
        {rows.map((row) => (
          <div key={row.label} className="armoryDetailRow">
            <span className="armoryDetailLabel">{row.label}</span>
            <span className="armoryDetailValue">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="armoryExactList" aria-label="Exact values">
        {exactChips.map((chip) => (
          <span key={chip} className="armoryExactChip">{chip}</span>
        ))}
      </div>
    </section>
  )
}

function ArmoryHotbarButton({ powerupId, index, cadenceLabel = "", isActive = false, onClick }) {
  const powerup = getPowerupById(powerupId)

  return (
    <button
      type="button"
      className={`armoryHotbarButton ${isActive ? "isActive" : ""}`}
      onClick={onClick}
    >
      <span className="armoryHotbarKey">{index + 1}</span>
      <span className="armoryHotbarGlyph" aria-hidden="true">
        <PowerupGlyph powerupId={powerupId} />
      </span>
      <span className="armoryHotbarBody">
        <strong className="armoryHotbarLabel">{powerup?.label ?? "Choose Power"}</strong>
        <span className="armoryHotbarMeta">{cadenceLabel || "No cadence"}</span>
      </span>
    </button>
  )
}

function ReviewModeButton({ mode, isActive = false, onClick }) {
  return (
    <button
      type="button"
      className={`armoryModeButton ${isActive ? "isActive" : ""}`}
      onClick={onClick}
    >
      <span className="armoryModeButtonLabel">{mode.label}</span>
      <span className="armoryModeButtonMeta">
        {mode.isTimedRound === false ? "No timer" : `${mode.durationSeconds}s`}
      </span>
    </button>
  )
}

function ArmoryWalkthroughOverlay({
  step = null,
  stepIndex = 0,
  stepCount = 0,
  spotlightRect = null,
  selectedModeLabel = "",
  isManual = false,
  onSkip,
  onBack,
  onNext,
  onKeepCurrentName,
  onSaveName,
  onGoToReady,
  onKeepTuning,
}) {
  if (!step) return null

  const dismissLabel = isManual ? "Close" : "Skip"
  const note = step.id === "review" && selectedModeLabel
    ? `${step.note} This preview is using ${selectedModeLabel}.`
    : step.note

  return (
    <div className="armoryWalkthroughOverlay" role="dialog" aria-modal="true" aria-labelledby="armory-walkthrough-title">
      {spotlightRect ? (
        <>
          <div className="armoryWalkthroughBlocker" style={{ inset: `0 0 calc(100% - ${spotlightRect.top}px) 0` }} />
          <div className="armoryWalkthroughBlocker" style={{ left: 0, top: spotlightRect.top, width: spotlightRect.left, height: spotlightRect.height }} />
          <div className="armoryWalkthroughBlocker" style={{ left: spotlightRect.right, top: spotlightRect.top, right: 0, height: spotlightRect.height }} />
          <div className="armoryWalkthroughBlocker" style={{ inset: `${spotlightRect.bottom}px 0 0 0` }} />
          <div
            className="armoryWalkthroughSpotlight"
            style={{ left: spotlightRect.left, top: spotlightRect.top, width: spotlightRect.width, height: spotlightRect.height }}
            aria-hidden="true"
          />
        </>
      ) : (
        <div className="armoryWalkthroughBlocker armoryWalkthroughBlockerFull" />
      )}

      <section className={`armoryWalkthroughPanel ${spotlightRect ? "" : "isCentered"}`}>
        <div className="armoryWalkthroughPanelHeader">
          <p className="armoryWalkthroughEyebrow">Walkthrough {stepIndex + 1} / {stepCount}</p>
          <button type="button" className="armoryWalkthroughDismiss" onClick={onSkip}>
            {dismissLabel}
          </button>
        </div>

        <div className="armoryWalkthroughCopy">
          <h2 id="armory-walkthrough-title" className="armoryWalkthroughTitle">{step.title}</h2>
          <p className="armoryWalkthroughLead">{step.instruction}</p>
          {note ? <p className="armoryWalkthroughNote">{note}</p> : null}
        </div>

        <div className="armoryWalkthroughActions">
          {step.id === "welcome" ? <button type="button" className="primaryButton" onClick={onNext}>Start Walkthrough</button> : null}
          {step.id === "slot" ? (
            <>
              <button type="button" className="secondaryButton" onClick={onKeepCurrentName}>Keep Current Name</button>
              <button type="button" className="primaryButton" onClick={onSaveName}>Save Name</button>
            </>
          ) : null}
          {(step.id.startsWith("hotbar") || step.id === "tempo" || step.id === "streak" || step.id === "rig") ? (
            <>
              <button type="button" className="secondaryButton" onClick={onBack}>Back</button>
              <button type="button" className="primaryButton" onClick={onNext}>Continue</button>
            </>
          ) : null}
          {step.id === "review" ? (
            <>
              <button type="button" className="secondaryButton" onClick={onBack}>Back</button>
              <button type="button" className="secondaryButton" onClick={onKeepTuning}>Keep Tuning</button>
              <button type="button" className="primaryButton" onClick={onGoToReady}>Go to Ready</button>
            </>
          ) : null}
        </div>
      </section>
    </div>
  )
}

export default function ArmoryPage({
  modes = [],
  selectedModeId = "",
  onModeChange,
  playerLevel = 1,
  savedLoadouts = [],
  activeLoadoutId = "",
  onLoadoutStateChange,
  buildWalkthrough = null,
  onBuildWalkthroughChange,
}) {
  const navigate = useNavigate()
  const shellRef = useRef(null)
  const workspaceRef = useRef(null)
  const slotEditorRef = useRef(null)
  const passiveLaneRef = useRef(null)
  const hotbarEditorRef = useRef(null)
  const reviewPanelRef = useRef(null)
  const walkthroughSessionRef = useRef({
    isVisible: false,
    source: null,
    status: BUILD_WALKTHROUGH_STATUS.DISMISSED,
  })

  const [localSavedLoadouts, setLocalSavedLoadouts] = useState(savedLoadouts)
  const [localActiveLoadoutId, setLocalActiveLoadoutId] = useState(activeLoadoutId)
  const [activeStepId, setActiveStepId] = useState("slot")
  const [activeModuleSlotId, setActiveModuleSlotId] = useState(MODULE_SLOTS[0]?.id ?? "tempoCore")
  const [editingPowerSlotIndex, setEditingPowerSlotIndex] = useState(0)
  const [nameDraft, setNameDraft] = useState("")
  const [showReviewDetails, setShowReviewDetails] = useState(false)
  const [isWalkthroughVisible, setIsWalkthroughVisible] = useState(false)
  const [walkthroughSource, setWalkthroughSource] = useState(null)
  const [walkthroughStepIndex, setWalkthroughStepIndex] = useState(0)
  const [walkthroughSpotlightRect, setWalkthroughSpotlightRect] = useState(null)

  const buildWalkthroughStatus = buildWalkthrough?.status ?? BUILD_WALKTHROUGH_STATUS.DISMISSED
  const currentWalkthroughStep = isWalkthroughVisible
    ? WALKTHROUGH_STEPS[walkthroughStepIndex] ?? WALKTHROUGH_STEPS[0]
    : null

  useEffect(() => {
    setLocalSavedLoadouts(savedLoadouts)
  }, [savedLoadouts])

  useEffect(() => {
    setLocalActiveLoadoutId(activeLoadoutId)
  }, [activeLoadoutId])

  const selectedMode = useMemo(() => (
    modes.find((mode) => mode.id === selectedModeId) ?? modes[0] ?? null
  ), [modes, selectedModeId])

  const moduleOptionsBySlot = useMemo(() => (
    Object.fromEntries(
      MODULE_SLOTS.map((slot) => [
        slot.id,
        PASSIVE_LOADOUT_MODULES.filter((module) => module.slotId === slot.id),
      ])
    )
  ), [])

  const loadoutPresentations = useMemo(() => {
    if (!selectedMode) return {}

    return Object.fromEntries(
      localSavedLoadouts.map((loadout) => [
        loadout.id,
        buildLoadoutPresentation(selectedMode, loadout),
      ])
    )
  }, [localSavedLoadouts, selectedMode])

  const activeLoadout = useMemo(
    () => getLoadoutById(localSavedLoadouts, localActiveLoadoutId),
    [localActiveLoadoutId, localSavedLoadouts]
  )
  const activePresentation = activeLoadout?.id ? loadoutPresentations[activeLoadout.id] : null

  useEffect(() => {
    setNameDraft(activeLoadout?.name ?? "")
    setEditingPowerSlotIndex(0)
  }, [activeLoadout])

  const selectedModuleSlot = useMemo(
    () => MODULE_SLOTS.find((slot) => slot.id === activeModuleSlotId) ?? MODULE_SLOTS[0] ?? null,
    [activeModuleSlotId]
  )
  const selectedModule = selectedModuleSlot && activeLoadout
    ? getPassiveModuleById(activeLoadout.moduleIds?.[selectedModuleSlot.key])
    : null
  const selectedModuleCopy = getModuleOptionPresentation(selectedModule?.id)

  const selectedPowerupId = activeLoadout?.powerupIds?.[editingPowerSlotIndex] ?? ""
  const selectedPowerup = getPowerupById(selectedPowerupId)
  const selectedPowerCopy = getPowerupOptionPresentation(selectedPowerupId)
  const selectedPowerSlotPresentation = activePresentation?.powerSlots?.[editingPowerSlotIndex] ?? null

  const measureWalkthroughTarget = useCallback(() => {
    if (!currentWalkthroughStep?.targetId) {
      setWalkthroughSpotlightRect(null)
      return
    }

    const shellElement = shellRef.current
    let targetElement = null

    if (currentWalkthroughStep.targetId === "slot") targetElement = slotEditorRef.current
    if (currentWalkthroughStep.targetId === "passives") targetElement = passiveLaneRef.current
    if (currentWalkthroughStep.targetId === "hotbar") targetElement = hotbarEditorRef.current
    if (currentWalkthroughStep.targetId === "review") targetElement = reviewPanelRef.current

    setWalkthroughSpotlightRect(measureSpotlightRect(shellElement, targetElement))
  }, [currentWalkthroughStep])

  const commitLoadoutState = useCallback((nextSavedLoadouts, nextActiveLoadoutId = localActiveLoadoutId) => {
    setLocalSavedLoadouts(nextSavedLoadouts)
    setLocalActiveLoadoutId(nextActiveLoadoutId)
    onLoadoutStateChange?.({
      savedLoadouts: nextSavedLoadouts,
      activeLoadoutId: nextActiveLoadoutId,
    })
  }, [localActiveLoadoutId, onLoadoutStateChange])

  const commitActiveLoadoutName = useCallback(() => {
    const { nextSavedLoadouts, nextName, didChange } = buildCommittedNameResult(
      localSavedLoadouts,
      activeLoadout,
      nameDraft
    )

    setNameDraft(nextName)

    if (didChange) commitLoadoutState(nextSavedLoadouts, localActiveLoadoutId)
  }, [activeLoadout, commitLoadoutState, localActiveLoadoutId, localSavedLoadouts, nameDraft])

  function updateSingleLoadout(targetLoadoutId, recipe) {
    const nextSavedLoadouts = localSavedLoadouts.map((loadout) => (
      loadout.id === targetLoadoutId ? recipe(loadout) : loadout
    ))
    commitLoadoutState(nextSavedLoadouts)
  }

  function handleActivateLoadout(nextLoadoutId) {
    if (!nextLoadoutId) return

    const { nextSavedLoadouts, nextName } = buildCommittedNameResult(
      localSavedLoadouts,
      activeLoadout,
      nameDraft
    )

    setNameDraft(nextName)

    if (nextLoadoutId === localActiveLoadoutId && nextSavedLoadouts === localSavedLoadouts) {
      return
    }

    commitLoadoutState(nextSavedLoadouts, nextLoadoutId)
  }

  function handleSelectModule(slotKey, moduleId) {
    if (!activeLoadout) return

    updateSingleLoadout(activeLoadout.id, (loadout) => ({
      ...loadout,
      moduleIds: {
        ...loadout.moduleIds,
        [slotKey]: moduleId,
      },
    }))
  }

  function handleSelectPowerup(powerupId) {
    if (!activeLoadout) return

    const nextPowerupIds = [...activeLoadout.powerupIds]
    nextPowerupIds[editingPowerSlotIndex] = powerupId

    updateSingleLoadout(activeLoadout.id, (loadout) => ({
      ...loadout,
      powerupIds: nextPowerupIds,
    }))
  }

  function handleResetLoadout() {
    if (!activeLoadout) return

    const starterLoadout = DEFAULT_SAVED_LOADOUTS.find((loadout) => loadout.id === activeLoadout.id)
    if (!starterLoadout) return

    setNameDraft(starterLoadout.name)
    updateSingleLoadout(activeLoadout.id, () => ({
      id: starterLoadout.id,
      name: starterLoadout.name,
      moduleIds: { ...starterLoadout.moduleIds },
      powerupIds: [...starterLoadout.powerupIds],
    }))
  }

  function handleOpenStep(nextStepId) {
    commitActiveLoadoutName()
    setActiveStepId(nextStepId)
  }

  const openWalkthrough = useCallback((source = "manual") => {
    setWalkthroughSource(source)
    setWalkthroughStepIndex(0)
    setIsWalkthroughVisible(true)
    setShowReviewDetails(false)
  }, [])

  const closeWalkthrough = useCallback(() => {
    if (
      walkthroughSource === "auto" &&
      buildWalkthroughStatus === BUILD_WALKTHROUGH_STATUS.NOT_STARTED
    ) {
      onBuildWalkthroughChange?.({ status: BUILD_WALKTHROUGH_STATUS.DISMISSED })
    }

    setIsWalkthroughVisible(false)
    setWalkthroughSource(null)
    setWalkthroughSpotlightRect(null)
  }, [buildWalkthroughStatus, onBuildWalkthroughChange, walkthroughSource])

  const goToNextWalkthroughStep = useCallback(() => {
    setWalkthroughStepIndex((currentIndex) => Math.min(currentIndex + 1, WALKTHROUGH_STEPS.length - 1))
  }, [])

  const goToPreviousWalkthroughStep = useCallback(() => {
    setWalkthroughStepIndex((currentIndex) => Math.max(currentIndex - 1, 0))
  }, [])

  const handleWalkthroughKeepCurrentName = useCallback(() => {
    setNameDraft(activeLoadout?.name ?? "")
    goToNextWalkthroughStep()
  }, [activeLoadout?.name, goToNextWalkthroughStep])

  const handleWalkthroughSaveName = useCallback(() => {
    commitActiveLoadoutName()
    goToNextWalkthroughStep()
  }, [commitActiveLoadoutName, goToNextWalkthroughStep])

  const handleWalkthroughKeepTuning = useCallback(() => {
    setIsWalkthroughVisible(false)
    setWalkthroughSource(null)
    setWalkthroughSpotlightRect(null)
  }, [])

  const handleWalkthroughGoToReady = useCallback(() => {
    setIsWalkthroughVisible(false)
    setWalkthroughSource(null)
    setWalkthroughSpotlightRect(null)
    navigate("/game")
  }, [navigate])

  useEffect(() => {
    if (
      buildWalkthroughStatus === BUILD_WALKTHROUGH_STATUS.NOT_STARTED &&
      !isWalkthroughVisible
    ) {
      openWalkthrough("auto")
    }
  }, [buildWalkthroughStatus, isWalkthroughVisible, openWalkthrough])

  useEffect(() => {
    if (!currentWalkthroughStep) return

    if (currentWalkthroughStep.armoryStepId) setActiveStepId(currentWalkthroughStep.armoryStepId)
    if (currentWalkthroughStep.moduleSlotId) setActiveModuleSlotId(currentWalkthroughStep.moduleSlotId)
    if (Number.isInteger(currentWalkthroughStep.powerSlotIndex)) {
      setEditingPowerSlotIndex(currentWalkthroughStep.powerSlotIndex)
    }
    if (
      currentWalkthroughStep.id === "review" &&
      buildWalkthroughStatus === BUILD_WALKTHROUGH_STATUS.NOT_STARTED
    ) {
      onBuildWalkthroughChange?.({ status: BUILD_WALKTHROUGH_STATUS.COMPLETED })
    }
  }, [buildWalkthroughStatus, currentWalkthroughStep, onBuildWalkthroughChange])

  useLayoutEffect(() => {
    if (!isWalkthroughVisible) {
      setWalkthroughSpotlightRect(null)
      return undefined
    }

    const frameId = window.requestAnimationFrame(() => {
      measureWalkthroughTarget()
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [
    activeModuleSlotId,
    activeStepId,
    currentWalkthroughStep,
    editingPowerSlotIndex,
    isWalkthroughVisible,
    measureWalkthroughTarget,
    localActiveLoadoutId,
    localSavedLoadouts,
    selectedModeId,
  ])

  useEffect(() => {
    if (!isWalkthroughVisible) return undefined

    const handleReposition = () => measureWalkthroughTarget()
    const workspaceElement = workspaceRef.current

    window.addEventListener("resize", handleReposition)
    workspaceElement?.addEventListener("scroll", handleReposition, { passive: true })

    return () => {
      window.removeEventListener("resize", handleReposition)
      workspaceElement?.removeEventListener("scroll", handleReposition)
    }
  }, [isWalkthroughVisible, measureWalkthroughTarget])

  useEffect(() => {
    walkthroughSessionRef.current = {
      isVisible: isWalkthroughVisible,
      source: walkthroughSource,
      status: buildWalkthroughStatus,
    }
  }, [buildWalkthroughStatus, isWalkthroughVisible, walkthroughSource])

  useEffect(() => () => {
    const activeSession = walkthroughSessionRef.current

    if (
      activeSession.isVisible &&
      activeSession.source === "auto" &&
      activeSession.status === BUILD_WALKTHROUGH_STATUS.NOT_STARTED
    ) {
      onBuildWalkthroughChange?.({ status: BUILD_WALKTHROUGH_STATUS.DISMISSED })
    }
  }, [onBuildWalkthroughChange])

  if (!selectedMode || !activeLoadout || !activePresentation || !selectedModuleSlot) {
    return null
  }

  const slotStepSummary = getStepSummary("slot", activeLoadout, activePresentation, selectedMode)
  const passiveStepSummary = getStepSummary("passives", activeLoadout, activePresentation, selectedMode)
  const hotbarStepSummary = getStepSummary("hotbar", activeLoadout, activePresentation, selectedMode)
  const reviewStepSummary = getStepSummary("review", activeLoadout, activePresentation, selectedMode)

  return (
    <div className="pageCenter armoryPage">
      <section className="cardWide armoryShell" ref={shellRef}>
        <aside className="armoryRail">
          <div className="armoryRailTop">
            <p className="armoryRailEyebrow">Armory</p>
            <div className="armoryRailIdentity">
              <span className="armoryRailIdentityGlyph" aria-hidden="true">
                <BuildIdentityGlyph
                  identity={activePresentation.identity.label}
                  className="armoryRailIdentityGlyphIcon"
                />
              </span>
              <div className="armoryRailIdentityCopy">
                <span className="armoryRailLabel">Active build</span>
                <strong className="armoryRailName">{activeLoadout.name}</strong>
                <span className="armoryRailHint">Saves instantly. Ready uses this slot next round.</span>
              </div>
            </div>
          </div>

          <div className="armoryRailProgress" aria-label="Armory steps">
            {ARMORY_STEPS.map((step, index) => (
              <ArmoryRailStepButton
                key={step.id}
                step={step}
                index={index}
                isActive={step.id === activeStepId}
                onClick={() => handleOpenStep(step.id)}
              />
            ))}
          </div>

          <div className="armoryRailSection">
            <span className="armoryRailSectionLabel">Saved builds</span>
            <div className="armorySlotRailList" aria-label="Saved build slots">
              {localSavedLoadouts.map((loadout, index) => (
                <ArmorySlotRailButton
                  key={loadout.id}
                  loadout={loadout}
                  index={index}
                  presentation={loadoutPresentations[loadout.id]}
                  isActive={loadout.id === localActiveLoadoutId}
                  onClick={() => handleActivateLoadout(loadout.id)}
                />
              ))}
            </div>
          </div>

          <div className="armoryRailActions">
            <button type="button" className="secondaryButton" onClick={() => openWalkthrough("manual")}>
              Restart Walkthrough
            </button>
            <Link className="secondaryButton secondaryButton-lg" to="/game">
              Back to Game
            </Link>
          </div>
        </aside>

        <div className="armoryWorkspace" ref={workspaceRef}>
          <div className="armoryStepStack">
            <ArmoryStepCard
              step={ARMORY_STEPS[0]}
              index={0}
              summary={slotStepSummary}
              isActive={activeStepId === "slot"}
              onActivate={() => handleOpenStep("slot")}
            >
              <div className="armorySlotEditor" ref={slotEditorRef}>
                <label className="armoryField" htmlFor="armory-build-name">
                  <span className="armoryFieldLabel">Build name</span>
                  <input
                    id="armory-build-name"
                    className="armoryNameInput"
                    value={nameDraft}
                    maxLength={24}
                    onChange={(event) => setNameDraft(event.target.value)}
                    onBlur={commitActiveLoadoutName}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        commitActiveLoadoutName()
                        event.currentTarget.blur()
                      }
                    }}
                  />
                </label>

                <div className="armoryStatusRow">
                  <span className="armoryStatusChip">Active in Ready</span>
                  <span className="armoryStatusChip">{activePresentation.identity.label}</span>
                </div>

                <div className="armoryActionRow">
                  <button type="button" className="secondaryButton" onClick={handleResetLoadout}>
                    Reset This Slot
                  </button>
                </div>

                <div className="armorySnapshotGrid" aria-label="Current build snapshot">
                  <section className="armorySnapshotPanel">
                    <span className="armorySnapshotLabel">Passive stack</span>
                    <div className="armoryChipRow">
                      {activePresentation.moduleStack.map((module) => (
                        <span key={module.slotKey} className={`armorySnapshotChip tone-${module.slotId}`}>
                          <ModuleSlotGlyph slotId={module.slotId} className="armorySnapshotChipIcon" />
                          {module.label}
                        </span>
                      ))}
                    </div>
                  </section>

                  <section className="armorySnapshotPanel">
                    <span className="armorySnapshotLabel">Hotbar</span>
                    <div className="armoryChipRow">
                      {activePresentation.powerSlots.map((powerSlot, index) => (
                        <span key={`${powerSlot.id}-${index + 1}`} className="armorySnapshotChip tone-power">
                          <span className="armorySnapshotKey">{index + 1}</span>
                          <PowerupGlyph powerupId={powerSlot.id} className="armorySnapshotChipIcon" />
                          {powerSlot.label}
                        </span>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </ArmoryStepCard>

            <ArmoryStepCard
              step={ARMORY_STEPS[1]}
              index={1}
              summary={passiveStepSummary}
              isActive={activeStepId === "passives"}
              onActivate={() => handleOpenStep("passives")}
            >
              <div className="armoryLaneTabs" aria-label="Passive systems">
                {MODULE_SLOTS.map((slot) => {
                  const selectedModuleId = activeLoadout.moduleIds?.[slot.key]
                  const selectedModuleOption = getPassiveModuleById(selectedModuleId)

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      className={`armoryLaneTab ${slot.id === selectedModuleSlot.id ? "isActive" : ""} tone-${slot.id}`}
                      onClick={() => setActiveModuleSlotId(slot.id)}
                    >
                      <span className={`armoryLaneTabIcon tone-${slot.id}`} aria-hidden="true">
                        <ModuleSlotGlyph slotId={slot.id} />
                      </span>
                      <span className="armoryLaneTabBody">
                        <strong className="armoryLaneTabLabel">{slot.label}</strong>
                        <span className="armoryLaneTabMeta">{selectedModuleOption?.label ?? slot.label}</span>
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className={`armoryLanePanel tone-${selectedModuleSlot.id}`} ref={passiveLaneRef}>
                <div className="armoryLanePanelHeader">
                  <span className={`armoryLanePanelIcon tone-${selectedModuleSlot.id}`} aria-hidden="true">
                    <ModuleSlotGlyph slotId={selectedModuleSlot.id} />
                  </span>
                  <div className="armoryLanePanelCopy">
                    <h3 className="armoryLanePanelTitle">{selectedModuleSlot.label}</h3>
                    <p className="armoryLanePanelLead">{selectedModuleSlot.description}</p>
                  </div>
                </div>

                <div className="armoryChoiceGrid">
                  {moduleOptionsBySlot[selectedModuleSlot.id].map((module) => {
                    const isLocked = playerLevel < module.unlockLevel
                    const hint = isLocked
                      ? getUnlockText(module.unlockLevel)
                      : activeLoadout.moduleIds?.[selectedModuleSlot.key] === module.id
                        ? "Equipped"
                        : ""

                    return (
                      <ArmoryChoiceCard
                        key={module.id}
                        tone={`tone-${selectedModuleSlot.id}`}
                        icon={<ModuleSlotGlyph slotId={selectedModuleSlot.id} />}
                        label={module.label}
                        impact={module.description}
                        hint={hint}
                        isSelected={activeLoadout.moduleIds?.[selectedModuleSlot.key] === module.id}
                        isDisabled={isLocked}
                        onClick={() => handleSelectModule(selectedModuleSlot.key, module.id)}
                      />
                    )
                  })}
                </div>

                <ArmoryDetailPanel
                  eyebrow="Selected passive"
                  title={selectedModule?.label ?? selectedModuleSlot.label}
                  lead={selectedModuleCopy.youGet}
                  rows={[
                    { label: "Tradeoff", value: selectedModuleCopy.youGiveUp },
                    { label: "Best in", value: selectedModuleCopy.bestIn },
                  ]}
                  exactChips={getModuleExactChips(selectedModule)}
                />
              </div>
            </ArmoryStepCard>

            <ArmoryStepCard
              step={ARMORY_STEPS[2]}
              index={2}
              summary={hotbarStepSummary}
              isActive={activeStepId === "hotbar"}
              onActivate={() => handleOpenStep("hotbar")}
            >
              <div className="armoryHotbarEditor" ref={hotbarEditorRef}>
                <div className="armoryHotbarTabs" aria-label="Hotbar slots">
                  {activePresentation.powerSlots.map((powerSlot, index) => (
                    <ArmoryHotbarButton
                      key={`${powerSlot.id}-${index + 1}`}
                      powerupId={powerSlot.id}
                      index={index}
                      cadenceLabel={powerSlot.cadenceLabel}
                      isActive={editingPowerSlotIndex === index}
                      onClick={() => setEditingPowerSlotIndex(index)}
                    />
                  ))}
                </div>

                <div className="armoryChoiceGrid armoryChoiceGrid-powers">
                  {LOADOUT_POWERUPS.map((powerup) => {
                    const isLocked = playerLevel < powerup.unlockLevel
                    const takenSlotIndex = activeLoadout.powerupIds.findIndex((equippedId, index) => (
                      index !== editingPowerSlotIndex && equippedId === powerup.id
                    ))
                    const isSelected = selectedPowerupId === powerup.id
                    const isTakenElsewhere = takenSlotIndex !== -1
                    const isDisabled = isLocked || isTakenElsewhere
                    let hint = `Key ${editingPowerSlotIndex + 1}`

                    if (isLocked) {
                      hint = getUnlockText(powerup.unlockLevel)
                    } else if (isTakenElsewhere && !isSelected) {
                      hint = `On key ${takenSlotIndex + 1}`
                    } else if (isSelected) {
                      hint = "Equipped"
                    }

                    return (
                      <ArmoryChoiceCard
                        key={powerup.id}
                        tone="tone-power"
                        icon={<PowerupGlyph powerupId={powerup.id} />}
                        label={powerup.label}
                        impact={powerup.description}
                        hint={hint}
                        isSelected={isSelected}
                        isDisabled={isDisabled}
                        onClick={() => handleSelectPowerup(powerup.id)}
                      />
                    )
                  })}
                </div>

                <ArmoryDetailPanel
                  eyebrow={`Key ${editingPowerSlotIndex + 1}`}
                  title={selectedPowerup?.label ?? "Choose Power"}
                  lead={selectedPowerCopy.youGet}
                  rows={[
                    { label: "Tradeoff", value: selectedPowerCopy.youGiveUp },
                    { label: "Best in", value: selectedPowerCopy.bestIn },
                    {
                      label: "Charge",
                      value: selectedPowerSlotPresentation?.cadenceLabel ?? "No cadence",
                    },
                  ]}
                  exactChips={getPowerupExactChips(
                    selectedPowerup,
                    selectedPowerSlotPresentation?.awardEvery ?? selectedPowerup?.awardEvery ?? 0
                  )}
                />
              </div>
            </ArmoryStepCard>

            <ArmoryStepCard
              step={ARMORY_STEPS[3]}
              index={3}
              summary={reviewStepSummary}
              isActive={activeStepId === "review"}
              onActivate={() => handleOpenStep("review")}
            >
              <div ref={reviewPanelRef}>
                <div className="armoryReviewModeRow" aria-label="Mode preview">
                  {modes.map((mode) => (
                    <ReviewModeButton
                      key={mode.id}
                      mode={mode}
                      isActive={mode.id === selectedMode.id}
                      onClick={() => onModeChange?.(mode.id)}
                    />
                  ))}
                </div>

                <section className="armoryReviewHero">
                  <div className="armoryReviewHeroCopy">
                    <p className="armoryReviewEyebrow">Current mode</p>
                    <h3 className="armoryReviewTitle">
                      {selectedMode.label} / {activeLoadout.name}
                    </h3>
                    <p className="armoryReviewLead">{activePresentation.glanceText}</p>
                    <p className="armoryReviewNote">{activePresentation.bestFor}</p>
                  </div>
                  <button
                    type="button"
                    className="secondaryButton armoryReviewToggle"
                    onClick={() => setShowReviewDetails((currentValue) => !currentValue)}
                    aria-expanded={showReviewDetails}
                  >
                    {showReviewDetails ? "Hide Exact Values" : "Show Exact Values"}
                  </button>
                </section>

                <div className="armoryReviewMetrics" aria-label="Mode simulation metrics">
                  {activePresentation.summaryStats.map((stat) => (
                    <article key={stat.label} className="armoryMetricCard">
                      <span className="armoryMetricLabel">{stat.label}</span>
                      <strong className="armoryMetricValue">{stat.value}</strong>
                    </article>
                  ))}
                </div>

                <div className="armoryReviewGrid">
                  <section className="armoryReviewPanel">
                    <span className="armoryReviewPanelTitle">Strengths</span>
                    <div className="armoryChipRow">
                      {activePresentation.strengths.map((item) => (
                        <span key={item} className="armorySnapshotChip tone-good">{item}</span>
                      ))}
                    </div>
                  </section>

                  <section className="armoryReviewPanel">
                    <span className="armoryReviewPanelTitle">Tradeoffs</span>
                    <div className="armoryChipRow">
                      {activePresentation.tradeoffs.map((item) => (
                        <span key={item} className="armorySnapshotChip tone-risk">{item}</span>
                      ))}
                    </div>
                  </section>

                  <section className="armoryReviewPanel">
                    <span className="armoryReviewPanelTitle">Hotbar cadence</span>
                    <div className="armoryReviewPowerList">
                      {activePresentation.powerSlots.map((powerSlot, index) => (
                        <div key={`${powerSlot.id}-${index + 1}`} className="armoryReviewPowerItem">
                          <span className="armoryReviewPowerKey">{index + 1}</span>
                          <span className="armoryReviewPowerGlyph" aria-hidden="true">
                            <PowerupGlyph powerupId={powerSlot.id} />
                          </span>
                          <span className="armoryReviewPowerBody">
                            <strong className="armoryReviewPowerLabel">{powerSlot.label}</strong>
                            <span className="armoryReviewPowerMeta">{powerSlot.cadenceLabel}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                {showReviewDetails ? (
                  <section className="armoryReviewDetails">
                    <div className="armoryDetailRows">
                      <div className="armoryDetailRow">
                        <span className="armoryDetailLabel">Start size</span>
                        <span className="armoryDetailValue">{activePresentation.roundRules.initialButtonSize}</span>
                      </div>
                      <div className="armoryDetailRow">
                        <span className="armoryDetailLabel">Min size</span>
                        <span className="armoryDetailValue">{activePresentation.roundRules.minButtonSize}</span>
                      </div>
                      <div className="armoryDetailRow">
                        <span className="armoryDetailLabel">Shrink factor</span>
                        <span className="armoryDetailValue">{Number(activePresentation.roundRules.shrinkFactor).toFixed(2)}</span>
                      </div>
                      <div className="armoryDetailRow">
                        <span className="armoryDetailLabel">Combo step</span>
                        <span className="armoryDetailValue">{activePresentation.roundRules.comboStep}</span>
                      </div>
                      <div className="armoryDetailRow">
                        <span className="armoryDetailLabel">Miss penalty</span>
                        <span className="armoryDetailValue">{activePresentation.roundRules.missPenalty}</span>
                      </div>
                      <div className="armoryDetailRow">
                        <span className="armoryDetailLabel">Score multiplier</span>
                        <span className="armoryDetailValue">{formatSignedPercent(activePresentation.roundRules.scoreMultiplier)}</span>
                      </div>
                      <div className="armoryDetailRow">
                        <span className="armoryDetailLabel">Charge rate</span>
                        <span className="armoryDetailValue">x{Number(activePresentation.roundRules.powerupAwardMultiplier).toFixed(2)}</span>
                      </div>
                      <div className="armoryDetailRow">
                        <span className="armoryDetailLabel">Starting charges</span>
                        <span className="armoryDetailValue">{activePresentation.roundRules.startingPowerupCharges}</span>
                      </div>
                    </div>
                  </section>
                ) : null}
              </div>
            </ArmoryStepCard>
          </div>
        </div>

        <ArmoryWalkthroughOverlay
          step={currentWalkthroughStep}
          stepIndex={walkthroughStepIndex}
          stepCount={WALKTHROUGH_STEPS.length}
          spotlightRect={walkthroughSpotlightRect}
          selectedModeLabel={selectedMode.label}
          isManual={walkthroughSource === "manual"}
          onSkip={closeWalkthrough}
          onBack={goToPreviousWalkthroughStep}
          onNext={goToNextWalkthroughStep}
          onKeepCurrentName={handleWalkthroughKeepCurrentName}
          onSaveName={handleWalkthroughSaveName}
          onGoToReady={handleWalkthroughGoToReady}
          onKeepTuning={handleWalkthroughKeepTuning}
        />
      </section>
    </div>
  )
}
