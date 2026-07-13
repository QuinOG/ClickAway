import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

import {
  DEFAULT_SAVED_LOADOUTS,
  MODULE_SLOTS,
  PASSIVE_LOADOUT_MODULES,
  getLoadoutById,
} from "../../../constants/buildcraft.js"
import { BUILD_WALKTHROUGH_STATUS, shouldAutoStartArmoryWalkthrough } from "../../../constants/buildWalkthrough.js"
import { buildLoadoutPresentation } from "../../../constants/buildcraftPresentation.js"
import { ARMORY_STEPS, DEFAULT_ARMORY_STEP_ID, WALKTHROUGH_STEPS } from "../armoryConstants.js"
import {
  buildCommittedNameResult,
  buildSwappedPowerupIds,
  getHotbarInstallPitch,
  getLaneInstallPitch,
  getStepSummary,
} from "../armoryUtils.js"
import { useArmoryUrlState } from "../useArmoryUrlState.js"
import { useArmoryWalkthrough } from "../useArmoryWalkthrough.js"
import {
  FIRST_TOUCH_TIP_MESSAGES,
  loadSeenFirstTouchTipIds,
  saveSeenFirstTouchTipIds,
} from "../armoryFirstTouchTips.js"
import { selectLoadoutStatsEntry } from "../../../utils/armoryFieldDataUtils.js"
import { FEEDBACK_EVENTS } from "../../../constants/feedbackEvents.js"
import { getUnseenUnlockedParts, normalizeSeenUnlockPartIds } from "../../../utils/unlockWallUtils.js"
import { encodeBlueprint, importBlueprint } from "../../../utils/blueprintCodeUtils.js"

export function useArmoryScreenController({
  modes = [],
  selectedModeId = "",
  onModeChange,
  playerLevel = 1,
  savedLoadouts = [],
  activeLoadoutId = "",
  onLoadoutStateChange,
  buildWalkthrough = null,
  onBuildWalkthroughChange,
  buttonSkinClass = "",
  buttonSkinImageSrc = "",
  buttonSkinImageScale = 100,
  arenaThemeClass = "theme-default",
  loadoutStats = [],
  emitFeedback = null,
  seenUnlockPartIds = [],
  onSeenUnlockPartIdsChange,
}) {
  const navigate = useNavigate()
  const shellRef = useRef(null)
  const workspaceRef = useRef(null)
  const nameplateRef = useRef(null)
  const machineRef = useRef(null)
  const passiveLaneRef = useRef(null)
  const hotbarEditorRef = useRef(null)
  const reviewPanelRef = useRef(null)
  const [localSavedLoadouts, setLocalSavedLoadouts] = useState(savedLoadouts)
  const [localActiveLoadoutId, setLocalActiveLoadoutId] = useState(activeLoadoutId)
  const [activeStepId, setActiveStepId] = useState(DEFAULT_ARMORY_STEP_ID)
  const [activeModuleSlotId, setActiveModuleSlotId] = useState(MODULE_SLOTS[0]?.id ?? "tempoCore")
  const [editingPowerSlotIndex, setEditingPowerSlotIndex] = useState(0)
  const [nameDraft, setNameDraft] = useState("")
  // Pre-commit part preview (Phase 5): { slotKey, moduleId } or null. Purely
  // derived presentation below — never persisted through the loadout path.
  const [previewedPart, setPreviewedPart] = useState(null)
  // Pre-commit tool preview (Phase 6): powerup id aimed at the editing key.
  const [previewedPowerId, setPreviewedPowerId] = useState(null)
  const [isEditingNameplate, setIsEditingNameplate] = useState(false)
  // One pending workshop confirm at a time: { type: "reset" } or { type: "copy", targetLoadoutId }.
  const [pendingBayAction, setPendingBayAction] = useState(null)
  const [showReviewDetails, setShowReviewDetails] = useState(false)
  // Test Range (Phase 7): an ephemeral, unrewarded live sample. `rangeRunToken`
  // bumps on "Run it again" to restart the throwaway round from scratch.
  const [isRangeOpen, setIsRangeOpen] = useState(false)
  const [rangeRunToken, setRangeRunToken] = useState(0)
  const [isSpecSheetOpen, setIsSpecSheetOpen] = useState(false)
  // Compare Bench (Phase 8): "bay" ghosts another bay against the active
  // build; "matrix" reads the active build across all three modes. Neither
  // view holds persisted state — both presentations are derived on demand.
  const [isCompareOpen, setIsCompareOpen] = useState(false)
  const [compareView, setCompareView] = useState("bay")
  const [compareGhostLoadoutId, setCompareGhostLoadoutId] = useState(null)
  const [isWalkthroughVisible, setIsWalkthroughVisible] = useState(false)
  const [walkthroughSource, setWalkthroughSource] = useState(null)
  const [walkthroughStepIndex, setWalkthroughStepIndex] = useState(0)
  const [walkthroughSpotlightRect, setWalkthroughSpotlightRect] = useState(null)
  // First-touch tips (Phase 12): local-only, "shown once ever per browser".
  const [, setSeenFirstTouchTipIds] = useState(loadSeenFirstTouchTipIds)
  const [activeFirstTouchTipId, setActiveFirstTouchTipId] = useState(null)
  // Unlock ceremony queue (Phase 11): frozen at mount, so a visit reveals
  // whatever crossed the unlock wall since the last time this page opened.
  const [ceremonyQueue, setCeremonyQueue] = useState(
    () => getUnseenUnlockedParts(playerLevel, seenUnlockPartIds)
  )
  const [isUnlockWallOpen, setIsUnlockWallOpen] = useState(false)
  const [blueprintNotice, setBlueprintNotice] = useState(null)

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

  const hasSyncedActiveLoadoutRef = useRef(false)

  useEffect(() => {
    setNameDraft(activeLoadout?.name ?? "")

    // Skip the initial run so a ?powerSlot= deep link isn't clobbered on mount.
    if (!hasSyncedActiveLoadoutRef.current) {
      hasSyncedActiveLoadoutRef.current = true
      return
    }

    setEditingPowerSlotIndex(0)
  }, [activeLoadout])

  // Hypothetical presentation for the previewed part. Null while the preview
  // matches the installed module so consumers can treat "no preview" and
  // "previewing the installed part" the same way.
  const previewPresentation = useMemo(() => {
    if (!previewedPart || !activeLoadout || !selectedMode) return null
    if (activeLoadout.moduleIds?.[previewedPart.slotKey] === previewedPart.moduleId) return null

    return buildLoadoutPresentation(selectedMode, {
      ...activeLoadout,
      moduleIds: {
        ...activeLoadout.moduleIds,
        [previewedPart.slotKey]: previewedPart.moduleId,
      },
    })
  }, [activeLoadout, previewedPart, selectedMode])

  // The would-be hotbar while a power is previewed on the editing key: the
  // previewed tool lands on that key and any key it currently occupies takes
  // the displaced tool (a swap). Null when it matches the racked arrangement.
  const powerPreviewPresentation = useMemo(() => {
    if (!previewedPowerId || !activeLoadout || !selectedMode) return null
    if (activeLoadout.powerupIds?.[editingPowerSlotIndex] === previewedPowerId) return null

    return buildLoadoutPresentation(selectedMode, {
      ...activeLoadout,
      powerupIds: buildSwappedPowerupIds(
        activeLoadout.powerupIds,
        editingPowerSlotIndex,
        previewedPowerId
      ),
    })
  }, [activeLoadout, editingPowerSlotIndex, previewedPowerId, selectedMode])

  // A preview aimed at one lane/key/build/mode means nothing in another context.
  useEffect(() => {
    setPreviewedPart(null)
    setPreviewedPowerId(null)
  }, [activeModuleSlotId, activeStepId, editingPowerSlotIndex, localActiveLoadoutId, selectedModeId])

  const selectedModuleSlot = useMemo(
    () => MODULE_SLOTS.find((slot) => slot.id === activeModuleSlotId) ?? MODULE_SLOTS[0] ?? null,
    [activeModuleSlotId]
  )

  const selectedPowerupId = activeLoadout?.powerupIds?.[editingPowerSlotIndex] ?? ""

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

  const updateSingleLoadout = useCallback((targetLoadoutId, recipe) => {
    const nextSavedLoadouts = localSavedLoadouts.map((loadout) => (
      loadout.id === targetLoadoutId ? recipe(loadout) : loadout
    ))
    commitLoadoutState(nextSavedLoadouts)
  }, [commitLoadoutState, localSavedLoadouts])

  const triggerFirstTouchTip = useCallback((tipId) => {
    setSeenFirstTouchTipIds((currentIds) => {
      if (currentIds.includes(tipId)) return currentIds

      const nextIds = [...currentIds, tipId]
      saveSeenFirstTouchTipIds(nextIds)
      setActiveFirstTouchTipId(tipId)
      return nextIds
    })
  }, [])

  const dismissFirstTouchTip = useCallback(() => {
    setActiveFirstTouchTipId(null)
  }, [])

  const handleActivateLoadout = useCallback((nextLoadoutId) => {
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

    if (nextLoadoutId !== localActiveLoadoutId) {
      emitFeedback?.(FEEDBACK_EVENTS.ARMORY_BAY_ACTIVATE)
      triggerFirstTouchTip("baySwitch")
    }
    commitLoadoutState(nextSavedLoadouts, nextLoadoutId)
  }, [activeLoadout, commitLoadoutState, emitFeedback, localActiveLoadoutId, localSavedLoadouts, nameDraft, triggerFirstTouchTip])

  const savedLoadoutIds = useMemo(
    () => localSavedLoadouts.map((loadout) => loadout.id),
    [localSavedLoadouts]
  )

  useArmoryUrlState({
    buildWalkthroughStatus,
    isWalkthroughVisible,
    activeStepId,
    setActiveStepId,
    activeModuleSlotId,
    setActiveModuleSlotId,
    editingPowerSlotIndex,
    setEditingPowerSlotIndex,
    savedLoadoutIds,
    activateLoadout: handleActivateLoadout,
  })

  // Rolling a different machine onto the stage abandons any half-finished
  // rename or confirm aimed at the previous build.
  useEffect(() => {
    setIsEditingNameplate(false)
    setPendingBayAction(null)
    setIsRangeOpen(false)
    setIsSpecSheetOpen(false)
    setIsCompareOpen(false)
  }, [localActiveLoadoutId])

  const startNameplateEdit = useCallback(() => {
    setNameDraft(activeLoadout?.name ?? "")
    setIsEditingNameplate(true)
  }, [activeLoadout?.name])

  const commitNameplateEdit = useCallback(() => {
    commitActiveLoadoutName()
    setIsEditingNameplate(false)
  }, [commitActiveLoadoutName])

  const cancelNameplateEdit = useCallback(() => {
    setNameDraft(activeLoadout?.name ?? "")
    setIsEditingNameplate(false)
  }, [activeLoadout?.name])

  const handleSelectModule = useCallback((slotKey, moduleId) => {
    if (!activeLoadout) return

    updateSingleLoadout(activeLoadout.id, (loadout) => ({
      ...loadout,
      moduleIds: {
        ...loadout.moduleIds,
        [slotKey]: moduleId,
      },
    }))
    emitFeedback?.(FEEDBACK_EVENTS.ARMORY_PART_INSTALL, {
      pitch: getLaneInstallPitch(activeModuleSlotId),
    })
  }, [activeLoadout, activeModuleSlotId, emitFeedback, updateSingleLoadout])

  const handlePreviewModule = useCallback((moduleId) => {
    if (!selectedModuleSlot) return
    setPreviewedPart({ slotKey: selectedModuleSlot.key, moduleId })
    emitFeedback?.(FEEDBACK_EVENTS.ARMORY_PART_HOVER, { eventId: moduleId })
  }, [emitFeedback, selectedModuleSlot])

  const clearModulePreview = useCallback(() => {
    setPreviewedPart(null)
  }, [])

  const handleInspectLockedPart = useCallback(() => {
    triggerFirstTouchTip("lockedPart")
  }, [triggerFirstTouchTip])

  // Clicking a module housing on the machine opens that lane's parts gallery.
  const openModuleLane = useCallback((slotId) => {
    commitActiveLoadoutName()
    setActiveStepId("passives")
    setActiveModuleSlotId(slotId)
  }, [commitActiveLoadoutName])

  // Installing a tool that is racked on another key swaps the two keys in one
  // action instead of dead-ending on a disabled card.
  const handleInstallPower = useCallback((powerupId) => {
    if (!activeLoadout || !powerupId) return
    if (activeLoadout.powerupIds?.[editingPowerSlotIndex] === powerupId) return

    updateSingleLoadout(activeLoadout.id, (loadout) => ({
      ...loadout,
      powerupIds: buildSwappedPowerupIds(loadout.powerupIds, editingPowerSlotIndex, powerupId),
    }))
    emitFeedback?.(FEEDBACK_EVENTS.ARMORY_PART_INSTALL, { pitch: getHotbarInstallPitch() })
  }, [activeLoadout, editingPowerSlotIndex, emitFeedback, updateSingleLoadout])

  // Desktop drag between rack slots (and any explicit "swap with key N" action).
  const handleSwapPowerSlots = useCallback((fromIndex, toIndex) => {
    if (!activeLoadout || fromIndex === toIndex) return
    if (!activeLoadout.powerupIds?.[fromIndex] || !activeLoadout.powerupIds?.[toIndex]) return

    updateSingleLoadout(activeLoadout.id, (loadout) => {
      const nextPowerupIds = [...loadout.powerupIds]
      ;[nextPowerupIds[fromIndex], nextPowerupIds[toIndex]] = [
        nextPowerupIds[toIndex],
        nextPowerupIds[fromIndex],
      ]

      return { ...loadout, powerupIds: nextPowerupIds }
    })
  }, [activeLoadout, updateSingleLoadout])

  const handlePreviewPower = useCallback((powerupId) => {
    setPreviewedPowerId(powerupId)
    emitFeedback?.(FEEDBACK_EVENTS.ARMORY_PART_HOVER, { eventId: powerupId })
  }, [emitFeedback])

  const clearPowerPreview = useCallback(() => {
    setPreviewedPowerId(null)
  }, [])

  const handleResetLoadout = useCallback(() => {
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
  }, [activeLoadout, updateSingleLoadout])

  const handleCopyToBay = useCallback((targetLoadoutId) => {
    if (!activeLoadout || !targetLoadoutId || targetLoadoutId === activeLoadout.id) return

    updateSingleLoadout(targetLoadoutId, (loadout) => ({
      id: loadout.id,
      name: activeLoadout.name,
      moduleIds: { ...activeLoadout.moduleIds },
      powerupIds: [...activeLoadout.powerupIds],
    }))
  }, [activeLoadout, updateSingleLoadout])

  const markUnlockPartsSeen = useCallback((partIds) => {
    onSeenUnlockPartIdsChange?.(normalizeSeenUnlockPartIds([...seenUnlockPartIds, ...partIds]))
  }, [onSeenUnlockPartIdsChange, seenUnlockPartIds])

  const advanceCeremonyQueue = useCallback((seenPart) => {
    markUnlockPartsSeen([seenPart.id])
    setCeremonyQueue((queue) => queue.slice(1))
  }, [markUnlockPartsSeen])

  // "Install now" wires the new part straight into the active build: a
  // module goes to its own housing, a power lands on key 1 (swapping
  // whichever tool currently sits there) via the same swap contract the
  // hotbar gallery uses.
  const installCeremonyPartNow = useCallback((part) => {
    if (activeLoadout) {
      if (part.kind === "module") {
        const slot = MODULE_SLOTS.find((moduleSlot) => moduleSlot.id === part.slotId)
        if (slot) {
          updateSingleLoadout(activeLoadout.id, (loadout) => ({
            ...loadout,
            moduleIds: { ...loadout.moduleIds, [slot.key]: part.id },
          }))
        }
      } else if (part.kind === "power") {
        updateSingleLoadout(activeLoadout.id, (loadout) => ({
          ...loadout,
          powerupIds: buildSwappedPowerupIds(loadout.powerupIds, 0, part.id),
        }))
      }
    }

    emitFeedback?.(FEEDBACK_EVENTS.ARMORY_PART_INSTALL, {
      pitch: part.kind === "module" ? getLaneInstallPitch(part.slotId) : getHotbarInstallPitch(),
    })
    advanceCeremonyQueue(part)
  }, [activeLoadout, advanceCeremonyQueue, emitFeedback, updateSingleLoadout])

  const rackCeremonyPart = useCallback((part) => {
    advanceCeremonyQueue(part)
  }, [advanceCeremonyQueue])

  const skipCeremonyQueue = useCallback(() => {
    markUnlockPartsSeen(ceremonyQueue.map((part) => part.id))
    setCeremonyQueue([])
  }, [ceremonyQueue, markUnlockPartsSeen])

  const openUnlockWall = useCallback(() => {
    setIsUnlockWallOpen(true)
  }, [])

  const closeUnlockWall = useCallback(() => {
    setIsUnlockWallOpen(false)
  }, [])

  // Blueprint codes (Phase 11): client-only export/import. Import re-runs the
  // requested build through the same level-clamped normalizer the server
  // trusts, so a code from a higher-level friend degrades gracefully.
  const exportActiveBlueprint = useCallback(() => {
    if (!activeLoadout) return ""

    const code = encodeBlueprint(activeLoadout)
    setBlueprintNotice({ type: "export", code, notes: [] })
    return code
  }, [activeLoadout])

  const importBlueprintToActiveBay = useCallback((code) => {
    if (!activeLoadout) return

    const result = importBlueprint(code, playerLevel)
    if (!result.ok) {
      setBlueprintNotice({ type: "import-error", error: result.error })
      return
    }

    updateSingleLoadout(activeLoadout.id, (loadout) => ({
      ...loadout,
      name: result.name,
      moduleIds: result.moduleIds,
      powerupIds: result.powerupIds,
    }))
    setNameDraft(result.name)
    setBlueprintNotice({ type: "import", notes: result.notes })
  }, [activeLoadout, playerLevel, updateSingleLoadout])

  const clearBlueprintNotice = useCallback(() => {
    setBlueprintNotice(null)
  }, [])

  const requestResetLoadout = useCallback(() => {
    setPendingBayAction({ type: "reset" })
  }, [])

  const requestCopyToBay = useCallback((targetLoadoutId) => {
    setPendingBayAction({ type: "copy", targetLoadoutId })
  }, [])

  const cancelBayAction = useCallback(() => {
    setPendingBayAction(null)
  }, [])

  const confirmBayAction = useCallback(() => {
    if (pendingBayAction?.type === "reset") handleResetLoadout()
    if (pendingBayAction?.type === "copy") handleCopyToBay(pendingBayAction.targetLoadoutId)
    setPendingBayAction(null)
  }, [handleCopyToBay, handleResetLoadout, pendingBayAction])

  const handleOpenStep = useCallback((nextStepId) => {
    commitActiveLoadoutName()
    setActiveStepId(nextStepId)
  }, [commitActiveLoadoutName])

  const openTestRange = useCallback(() => {
    commitActiveLoadoutName()
    setIsSpecSheetOpen(false)
    setRangeRunToken((token) => token + 1)
    setIsRangeOpen(true)
    emitFeedback?.(FEEDBACK_EVENTS.ARMORY_RANGE_START)
  }, [commitActiveLoadoutName, emitFeedback])

  const closeTestRange = useCallback(() => {
    setIsRangeOpen(false)
  }, [])

  const runTestRangeAgain = useCallback(() => {
    setRangeRunToken((token) => token + 1)
    emitFeedback?.(FEEDBACK_EVENTS.ARMORY_RANGE_START)
  }, [emitFeedback])

  const openSpecSheet = useCallback(() => {
    commitActiveLoadoutName()
    setIsSpecSheetOpen(true)
    triggerFirstTouchTip("blueprint")
  }, [commitActiveLoadoutName, triggerFirstTouchTip])

  const closeSpecSheet = useCallback(() => {
    setIsSpecSheetOpen(false)
  }, [])

  // The active build's five readouts across all three modes (Phase 8's mode
  // matrix). buildLoadoutPresentation is already mode-parameterized, so this
  // is just re-deriving it per mode — never persisted, never sent anywhere.
  const compareModePresentations = useMemo(() => {
    if (!activeLoadout || !modes.length) return []

    return modes.map((mode) => ({
      mode,
      presentation: buildLoadoutPresentation(mode, activeLoadout),
    }))
  }, [activeLoadout, modes])

  const openBayCompare = useCallback((targetLoadoutId) => {
    if (!targetLoadoutId) return
    setCompareGhostLoadoutId(targetLoadoutId)
    setCompareView("bay")
    setIsCompareOpen(true)
    triggerFirstTouchTip("compare")
  }, [triggerFirstTouchTip])

  const openModeMatrix = useCallback(() => {
    commitActiveLoadoutName()
    setCompareView("matrix")
    setIsCompareOpen(true)
    triggerFirstTouchTip("compare")
  }, [commitActiveLoadoutName, triggerFirstTouchTip])

  const closeCompareBench = useCallback(() => {
    setIsCompareOpen(false)
  }, [])

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
    cancelNameplateEdit()
    goToNextWalkthroughStep()
  }, [cancelNameplateEdit, goToNextWalkthroughStep])

  const handleWalkthroughSaveName = useCallback(() => {
    commitNameplateEdit()
    goToNextWalkthroughStep()
  }, [commitNameplateEdit, goToNextWalkthroughStep])

  const handleWalkthroughRunRange = useCallback(() => {
    setIsWalkthroughVisible(false)
    setWalkthroughSource(null)
    setWalkthroughSpotlightRect(null)
    openTestRange()
  }, [openTestRange])

  const handleWalkthroughGoToReady = useCallback(() => {
    setIsWalkthroughVisible(false)
    setWalkthroughSource(null)
    setWalkthroughSpotlightRect(null)
    navigate("/game")
  }, [navigate])

  useEffect(() => {
    if (shouldAutoStartArmoryWalkthrough(buildWalkthroughStatus) && !isWalkthroughVisible) {
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
      currentWalkthroughStep.id === "range" &&
      buildWalkthroughStatus === BUILD_WALKTHROUGH_STATUS.NOT_STARTED
    ) {
      onBuildWalkthroughChange?.({ status: BUILD_WALKTHROUGH_STATUS.PRACTICE_PENDING })
    }
  }, [buildWalkthroughStatus, currentWalkthroughStep, onBuildWalkthroughChange])

  useArmoryWalkthrough({
    isWalkthroughVisible,
    currentWalkthroughStep,
    shellRef,
    workspaceRef,
    nameplateRef,
    machineRef,
    passiveLaneRef,
    hotbarEditorRef,
    reviewPanelRef,
    setWalkthroughSpotlightRect,
    spotlightLayoutKey: [
      activeModuleSlotId,
      activeStepId,
      editingPowerSlotIndex,
      localActiveLoadoutId,
      selectedModeId,
      JSON.stringify(activeLoadout?.moduleIds ?? {}),
      JSON.stringify(activeLoadout?.powerupIds ?? []),
    ].join("|"),
  })

  // Field Data (Phase 9): per-bay service records keyed on the stable
  // `loadoutId`, not the display name — a rename never orphans its history.
  const loadoutStatsById = useMemo(
    () => Object.fromEntries(loadoutStats.map((entry) => [entry.loadoutId, entry])),
    [loadoutStats]
  )
  const activeLoadoutStats = activeLoadout?.id
    ? selectLoadoutStatsEntry(loadoutStats, activeLoadout.id)
    : null

  const isReady = Boolean(selectedMode && activeLoadout && activePresentation && selectedModuleSlot)

  const passiveStepSummary = getStepSummary("passives", activeLoadout, activePresentation, selectedMode)
  const hotbarStepSummary = getStepSummary("hotbar", activeLoadout, activePresentation, selectedMode)
  const reviewStepSummary = getStepSummary("review", activeLoadout, activePresentation, selectedMode)

  // Grouped controller→screen contract: shared build context and DOM refs stay
  // top-level (refs inside the grouped objects trip react-hooks/refs), while
  // everything step- or overlay-specific lives on its API object so later
  // phases can add capability without prop explosions.
  return {
    isReady,
    shellRef,
    workspaceRef,
    nameplateRef,
    machineRef,
    passiveLaneRef,
    hotbarEditorRef,
    reviewPanelRef,
    steps: ARMORY_STEPS,
    activeStepId,
    handleOpenStep,
    playerLevel,
    selectedMode,
    activeLoadout,
    activePresentation,
    machineApi: {
      buttonSkinClass,
      buttonSkinImageSrc,
      buttonSkinImageScale,
      nameDraft,
      setNameDraft,
      isEditingName: isEditingNameplate,
      startNameEdit: startNameplateEdit,
      commitNameEdit: commitNameplateEdit,
      cancelNameEdit: cancelNameplateEdit,
      isResetPending: pendingBayAction?.type === "reset",
      requestReset: requestResetLoadout,
      confirmBayAction,
      cancelBayAction,
      openModuleLane,
      openSpecSheet,
      openModeMatrix,
      previewInitialButtonSize: previewPresentation?.roundRules?.initialButtonSize ?? null,
    },
    bayApi: {
      savedLoadouts: localSavedLoadouts,
      loadoutPresentations,
      loadoutStatsById,
      activeLoadoutId: localActiveLoadoutId,
      activateLoadout: handleActivateLoadout,
      pendingCopyTargetId: pendingBayAction?.type === "copy" ? pendingBayAction.targetLoadoutId : null,
      requestCopyToBay,
      confirmBayAction,
      cancelBayAction,
      openBayCompare,
    },
    passiveApi: {
      selectedModuleSlot,
      setActiveModuleSlotId,
      moduleOptionsBySlot,
      selectModule: handleSelectModule,
      previewedModuleId: previewedPart?.slotKey === selectedModuleSlot?.key
        ? previewedPart.moduleId
        : null,
      previewPresentation,
      previewModule: handlePreviewModule,
      clearPreview: clearModulePreview,
      summary: passiveStepSummary,
    },
    hotbarApi: {
      editingPowerSlotIndex,
      setEditingPowerSlotIndex,
      selectedPowerupId,
      installPower: handleInstallPower,
      swapPowerSlots: handleSwapPowerSlots,
      previewedPowerId,
      previewPresentation: powerPreviewPresentation,
      previewPower: handlePreviewPower,
      clearPreview: clearPowerPreview,
      summary: hotbarStepSummary,
    },
    reviewApi: {
      modes,
      onModeChange,
      summary: reviewStepSummary,
    },
    rangeApi: {
      isOpen: isRangeOpen,
      runToken: rangeRunToken,
      open: openTestRange,
      close: closeTestRange,
      runAgain: runTestRangeAgain,
      arenaThemeClass,
      buttonSkinClass,
      buttonSkinImageSrc,
      buttonSkinImageScale,
    },
    specSheetApi: {
      isOpen: isSpecSheetOpen,
      open: openSpecSheet,
      close: closeSpecSheet,
      showDetails: showReviewDetails,
      setShowDetails: setShowReviewDetails,
      loadoutStats: activeLoadoutStats,
    },
    compareApi: {
      isOpen: isCompareOpen,
      view: compareView,
      setView: setCompareView,
      ghostLoadout: compareGhostLoadoutId
        ? getLoadoutById(localSavedLoadouts, compareGhostLoadoutId)
        : null,
      ghostPresentation: compareGhostLoadoutId ? loadoutPresentations[compareGhostLoadoutId] : null,
      modePresentations: compareModePresentations,
      openBayCompare,
      openModeMatrix,
      close: closeCompareBench,
    },
    walkthroughApi: {
      currentStep: currentWalkthroughStep,
      stepIndex: walkthroughStepIndex,
      stepCount: WALKTHROUGH_STEPS.length,
      spotlightRect: walkthroughSpotlightRect,
      source: walkthroughSource,
      open: openWalkthrough,
      close: closeWalkthrough,
      goBack: goToPreviousWalkthroughStep,
      goNext: goToNextWalkthroughStep,
      keepCurrentName: handleWalkthroughKeepCurrentName,
      saveName: handleWalkthroughSaveName,
      goToReady: handleWalkthroughGoToReady,
      runRange: handleWalkthroughRunRange,
    },
    firstTouchApi: {
      activeTipId: activeFirstTouchTipId,
      activeTipMessage: activeFirstTouchTipId ? FIRST_TOUCH_TIP_MESSAGES[activeFirstTouchTipId] : null,
      dismiss: dismissFirstTouchTip,
      notifyLockedPart: handleInspectLockedPart,
    },
    unlockWallApi: {
      isOpen: isUnlockWallOpen,
      open: openUnlockWall,
      close: closeUnlockWall,
    },
    ceremonyApi: {
      part: ceremonyQueue[0] ?? null,
      remainingCount: ceremonyQueue.length,
      installNow: installCeremonyPartNow,
      rackIt: rackCeremonyPart,
      skipAll: skipCeremonyQueue,
    },
    blueprintApi: {
      notice: blueprintNotice,
      exportCode: exportActiveBlueprint,
      importCode: importBlueprintToActiveBay,
      clearNotice: clearBlueprintNotice,
    },
  }
}
