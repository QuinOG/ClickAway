import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

import {
  DEFAULT_SAVED_LOADOUTS,
  MODULE_SLOTS,
  PASSIVE_LOADOUT_MODULES,
  getLoadoutById,
  getPassiveModuleById,
  getPowerupById,
} from "../../../constants/buildcraft.js"
import { BUILD_WALKTHROUGH_STATUS, shouldAutoStartArmoryWalkthrough } from "../../../constants/buildWalkthrough.js"
import {
  buildLoadoutPresentation,
  getModuleOptionPresentation,
  getPowerupOptionPresentation,
} from "../../../constants/buildcraftPresentation.js"
import { ARMORY_STEPS, DEFAULT_ARMORY_STEP_ID, WALKTHROUGH_STEPS } from "../armoryConstants.js"
import {
  buildCommittedNameResult,
  getStepSummary,
  measureSpotlightRect,
} from "../armoryUtils.js"
import { useArmoryUrlState } from "../useArmoryUrlState.js"

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
}) {
  const navigate = useNavigate()
  const shellRef = useRef(null)
  const workspaceRef = useRef(null)
  const nameplateRef = useRef(null)
  const passiveLaneRef = useRef(null)
  const hotbarEditorRef = useRef(null)
  const reviewPanelRef = useRef(null)
  const [localSavedLoadouts, setLocalSavedLoadouts] = useState(savedLoadouts)
  const [localActiveLoadoutId, setLocalActiveLoadoutId] = useState(activeLoadoutId)
  const [activeStepId, setActiveStepId] = useState(DEFAULT_ARMORY_STEP_ID)
  const [activeModuleSlotId, setActiveModuleSlotId] = useState(MODULE_SLOTS[0]?.id ?? "tempoCore")
  const [editingPowerSlotIndex, setEditingPowerSlotIndex] = useState(0)
  const [nameDraft, setNameDraft] = useState("")
  const [isEditingNameplate, setIsEditingNameplate] = useState(false)
  // One pending workshop confirm at a time: { type: "reset" } or { type: "copy", targetLoadoutId }.
  const [pendingBayAction, setPendingBayAction] = useState(null)
  const [showReviewDetails, setShowReviewDetails] = useState(false)
  const [isWalkthroughVisible, setIsWalkthroughVisible] = useState(false)
  const [walkthroughSource, setWalkthroughSource] = useState(null)
  const [walkthroughStepIndex, setWalkthroughStepIndex] = useState(0)
  const [walkthroughSpotlightRect, setWalkthroughSpotlightRect] = useState(null)

  const buildWalkthroughStatus = buildWalkthrough?.status ?? BUILD_WALKTHROUGH_STATUS.DISMISSED
  const currentWalkthroughStep = isWalkthroughVisible
    ? WALKTHROUGH_STEPS[walkthroughStepIndex] ?? WALKTHROUGH_STEPS[0]
    : null

  useArmoryUrlState({
    buildWalkthroughStatus,
    isWalkthroughVisible,
    activeStepId,
    setActiveStepId,
    activeModuleSlotId,
    setActiveModuleSlotId,
    editingPowerSlotIndex,
    setEditingPowerSlotIndex,
  })

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

    if (currentWalkthroughStep.targetId === "nameplate") targetElement = nameplateRef.current
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

  const updateSingleLoadout = useCallback((targetLoadoutId, recipe) => {
    const nextSavedLoadouts = localSavedLoadouts.map((loadout) => (
      loadout.id === targetLoadoutId ? recipe(loadout) : loadout
    ))
    commitLoadoutState(nextSavedLoadouts)
  }, [commitLoadoutState, localSavedLoadouts])

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

    commitLoadoutState(nextSavedLoadouts, nextLoadoutId)
  }, [activeLoadout, commitLoadoutState, localActiveLoadoutId, localSavedLoadouts, nameDraft])

  // Rolling a different machine onto the stage abandons any half-finished
  // rename or confirm aimed at the previous build.
  useEffect(() => {
    setIsEditingNameplate(false)
    setPendingBayAction(null)
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
  }, [activeLoadout, updateSingleLoadout])

  const handleSelectPowerup = useCallback((powerupId) => {
    if (!activeLoadout) return

    const nextPowerupIds = [...activeLoadout.powerupIds]
    nextPowerupIds[editingPowerSlotIndex] = powerupId

    updateSingleLoadout(activeLoadout.id, (loadout) => ({
      ...loadout,
      powerupIds: nextPowerupIds,
    }))
  }, [activeLoadout, editingPowerSlotIndex, updateSingleLoadout])

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
      currentWalkthroughStep.id === "review" &&
      buildWalkthroughStatus === BUILD_WALKTHROUGH_STATUS.NOT_STARTED
    ) {
      onBuildWalkthroughChange?.({ status: BUILD_WALKTHROUGH_STATUS.PRACTICE_PENDING })
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
    },
    bayApi: {
      savedLoadouts: localSavedLoadouts,
      loadoutPresentations,
      activeLoadoutId: localActiveLoadoutId,
      activateLoadout: handleActivateLoadout,
      pendingCopyTargetId: pendingBayAction?.type === "copy" ? pendingBayAction.targetLoadoutId : null,
      requestCopyToBay,
      confirmBayAction,
      cancelBayAction,
    },
    passiveApi: {
      selectedModuleSlot,
      setActiveModuleSlotId,
      moduleOptionsBySlot,
      selectedModule,
      selectedModuleCopy,
      selectModule: handleSelectModule,
      summary: passiveStepSummary,
    },
    hotbarApi: {
      editingPowerSlotIndex,
      setEditingPowerSlotIndex,
      selectedPowerupId,
      selectedPowerup,
      selectedPowerCopy,
      selectedPowerSlotPresentation,
      selectPowerup: handleSelectPowerup,
      summary: hotbarStepSummary,
    },
    reviewApi: {
      modes,
      onModeChange,
      showDetails: showReviewDetails,
      setShowDetails: setShowReviewDetails,
      summary: reviewStepSummary,
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
      keepTuning: handleWalkthroughKeepTuning,
    },
  }
}
