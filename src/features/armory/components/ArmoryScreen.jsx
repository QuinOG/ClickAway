import { useState } from "react"
import { Link } from "react-router-dom"

import {
  LOADOUT_POWERUPS,
  MODULE_SLOTS,
  getPassiveModuleById,
  getPowerupById,
} from "../../../constants/buildcraft.js"
import {
  getModuleOptionPresentation,
  getPowerupOptionPresentation,
} from "../../../constants/buildcraftPresentation.js"
import {
  BuildIdentityGlyph,
  ModuleSlotGlyph,
  PowerupGlyph,
} from "../../buildcraft/loadoutBuildcraftGlyphIcons.jsx"
import {
  getModuleExactChips,
  getPowerupExactChips,
} from "../armoryUtils.js"
import ArmoryBayWall from "./ArmoryBayWall.jsx"
import ArmoryCadenceTimeline from "./ArmoryCadenceTimeline.jsx"
import ArmoryCompareBench from "./ArmoryCompareBench.jsx"
import ArmoryInstruments from "./ArmoryInstruments.jsx"
import ArmoryMachine from "./ArmoryMachine.jsx"
import ArmoryPartsGallery from "./ArmoryPartsGallery.jsx"
import ArmorySpecSheet from "./ArmorySpecSheet.jsx"
import ArmoryTestRange from "./ArmoryTestRange.jsx"
import {
  ArmoryDetailPanel,
  ArmoryHotbarButton,
  ArmoryRailStepButton,
  ArmoryStepCard,
  ReviewModeButton,
} from "./ArmorySharedUiComponents.jsx"
import ArmoryWalkthroughOverlay from "./ArmoryWalkthroughOverlay.jsx"

export default function ArmoryScreen({
  shellRef,
  workspaceRef,
  nameplateRef,
  passiveLaneRef,
  hotbarEditorRef,
  reviewPanelRef,
  steps,
  activeStepId,
  handleOpenStep,
  playerLevel,
  selectedMode,
  activeLoadout,
  activePresentation,
  machineApi,
  bayApi,
  passiveApi,
  hotbarApi,
  reviewApi,
  rangeApi,
  specSheetApi,
  compareApi,
  walkthroughApi,
}) {
  // Identity drives the scene's lighting "weather" (see armory.css data-identity rules).
  const sceneIdentity = (activePresentation.identity.label || "Balanced").toLowerCase()

  // Which rack key is mid-drag, so its tab reads as lifted off the rack.
  const [draggedKeyIndex, setDraggedKeyIndex] = useState(null)

  // Inspection footer for the passive parts gallery: previewed part wins over
  // the installed one so hovering answers "what would I get?" before commit.
  const installedModuleId = activeLoadout.moduleIds?.[passiveApi.selectedModuleSlot.key] ?? ""
  const inspectedModuleId = passiveApi.previewedModuleId ?? installedModuleId
  const inspectedModule = getPassiveModuleById(inspectedModuleId)
  const inspectedModuleCopy = getModuleOptionPresentation(inspectedModule?.id)

  // Same contract for the tool rack, plus the cadence recomputed for the
  // previewed arrangement (buildRoundRules applies powerupAwardMultiplier).
  const inspectedPowerId = hotbarApi.previewedPowerId ?? hotbarApi.selectedPowerupId
  const inspectedPower = getPowerupById(inspectedPowerId)
  const inspectedPowerCopy = getPowerupOptionPresentation(inspectedPowerId)
  const editingSlotPresentation = (hotbarApi.previewPresentation ?? activePresentation)
    .powerSlots?.[hotbarApi.editingPowerSlotIndex] ?? null

  // Powers racked on another key stay live in the gallery and install as a swap.
  const powerParts = LOADOUT_POWERUPS.map((powerup) => {
    const rackedIndex = activeLoadout.powerupIds.indexOf(powerup.id)

    return {
      ...powerup,
      rackedOnKey: rackedIndex !== -1 && rackedIndex !== hotbarApi.editingPowerSlotIndex
        ? rackedIndex + 1
        : null,
    }
  })

  return (
    <div className="armoryScene armoryPage" data-identity={sceneIdentity} ref={shellRef}>
      <div className="armorySceneBackdrop" aria-hidden="true" />
      <aside className="armoryRail">
        <div className="armoryRailTop">
          <h1 className="armoryRailEyebrow">Armory</h1>
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
              <span className="armoryRailHint">Saves instantly. Ready uses this bay next round.</span>
            </div>
          </div>
        </div>

        <div className="armoryRailProgress" aria-label="Armory steps">
          {steps.map((step, index) => (
            <ArmoryRailStepButton
              key={step.id}
              step={step}
              index={index}
              isActive={step.id === activeStepId}
              onClick={() => handleOpenStep(step.id)}
            />
          ))}
        </div>

        <ArmoryBayWall bayApi={bayApi} />

        <div className="armoryRailActions">
          <button type="button" className="secondaryButton" onClick={() => walkthroughApi.open("manual")}>
            Restart Walkthrough
          </button>
          <Link className="secondaryButton secondaryButton-lg" to="/game">
            Back to Game
          </Link>
        </div>
      </aside>

      <ArmoryMachine
        loadout={activeLoadout}
        presentation={activePresentation}
        nameplateRef={nameplateRef}
        machineApi={machineApi}
      />

      <div className="armoryWorkspace" ref={workspaceRef}>
        <ArmoryInstruments
          presentation={activePresentation}
          previewPresentation={passiveApi.previewPresentation}
        />

        <div className="armoryStepStack">
          <ArmoryStepCard
            step={steps[0]}
            index={0}
            summary={passiveApi.summary}
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
                    className={`armoryLaneTab ${slot.id === passiveApi.selectedModuleSlot.id ? "isActive" : ""} tone-${slot.id}`}
                    onClick={() => passiveApi.setActiveModuleSlotId(slot.id)}
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

            <div className={`armoryLanePanel tone-${passiveApi.selectedModuleSlot.id}`} ref={passiveLaneRef}>
              <div className="armoryLanePanelHeader">
                <span className={`armoryLanePanelIcon tone-${passiveApi.selectedModuleSlot.id}`} aria-hidden="true">
                  <ModuleSlotGlyph slotId={passiveApi.selectedModuleSlot.id} />
                </span>
                <div className="armoryLanePanelCopy">
                  <h3 className="armoryLanePanelTitle">{passiveApi.selectedModuleSlot.label}</h3>
                  <p className="armoryLanePanelLead">{passiveApi.selectedModuleSlot.description}</p>
                </div>
              </div>

              <ArmoryPartsGallery
                tone={passiveApi.selectedModuleSlot.id}
                galleryLabel={`${passiveApi.selectedModuleSlot.label} parts`}
                parts={passiveApi.moduleOptionsBySlot[passiveApi.selectedModuleSlot.id]}
                playerLevel={playerLevel}
                installedPartId={installedModuleId}
                previewedPartId={passiveApi.previewedModuleId}
                renderPartGlyph={() => <ModuleSlotGlyph slotId={passiveApi.selectedModuleSlot.id} />}
                onPreviewPart={passiveApi.previewModule}
                onClearPreview={passiveApi.clearPreview}
                onInstallPart={(moduleId) => passiveApi.selectModule(passiveApi.selectedModuleSlot.key, moduleId)}
                footer={(
                  <ArmoryDetailPanel
                    eyebrow={inspectedModuleId !== installedModuleId ? "Previewing part" : "Installed part"}
                    title={inspectedModule?.label ?? passiveApi.selectedModuleSlot.label}
                    lead={inspectedModuleCopy.youGet}
                    rows={[
                      { label: "Tradeoff", value: inspectedModuleCopy.youGiveUp },
                      { label: "Best in", value: inspectedModuleCopy.bestIn },
                    ]}
                    exactChips={getModuleExactChips(inspectedModule)}
                  />
                )}
              />
            </div>
          </ArmoryStepCard>

          <ArmoryStepCard
            step={steps[1]}
            index={1}
            summary={hotbarApi.summary}
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
                    isActive={hotbarApi.editingPowerSlotIndex === index}
                    isDragging={draggedKeyIndex === index}
                    onClick={() => hotbarApi.setEditingPowerSlotIndex(index)}
                    dragProps={{
                      draggable: true,
                      onDragStart: (event) => {
                        setDraggedKeyIndex(index)
                        event.dataTransfer.setData("text/plain", String(index))
                        event.dataTransfer.effectAllowed = "move"
                      },
                      onDragEnd: () => setDraggedKeyIndex(null),
                      onDragOver: (event) => event.preventDefault(),
                      onDrop: (event) => {
                        event.preventDefault()
                        setDraggedKeyIndex(null)
                        const fromIndex = Number(event.dataTransfer.getData("text/plain"))
                        if (Number.isInteger(fromIndex)) hotbarApi.swapPowerSlots(fromIndex, index)
                      },
                    }}
                  />
                ))}
              </div>

              <ArmoryPartsGallery
                tone="power"
                galleryLabel="Power tools"
                parts={powerParts}
                playerLevel={playerLevel}
                installedPartId={hotbarApi.selectedPowerupId}
                previewedPartId={hotbarApi.previewedPowerId}
                renderPartGlyph={(part) => <PowerupGlyph powerupId={part.id} />}
                onPreviewPart={hotbarApi.previewPower}
                onClearPreview={hotbarApi.clearPreview}
                onInstallPart={hotbarApi.installPower}
                footer={(
                  <>
                    <ArmoryCadenceTimeline
                      powerSlots={activePresentation.powerSlots}
                      previewPowerSlots={hotbarApi.previewPresentation?.powerSlots ?? null}
                      startingCharges={activePresentation.roundRules.startingPowerupCharges}
                    />
                    <ArmoryDetailPanel
                      eyebrow={`Key ${hotbarApi.editingPowerSlotIndex + 1}`}
                      title={inspectedPower?.label ?? "Choose Power"}
                      lead={inspectedPowerCopy.youGet}
                      rows={[
                        { label: "Tradeoff", value: inspectedPowerCopy.youGiveUp },
                        { label: "Best in", value: inspectedPowerCopy.bestIn },
                      ]}
                      exactChips={getPowerupExactChips(
                        inspectedPower,
                        editingSlotPresentation?.awardEvery ?? inspectedPower?.awardEvery ?? 0
                      )}
                    />
                  </>
                )}
              />
            </div>
          </ArmoryStepCard>

          <ArmoryStepCard
            step={steps[2]}
            index={2}
            summary={reviewApi.summary}
            isActive={activeStepId === "review"}
            onActivate={() => handleOpenStep("review")}
          >
            <div className="armoryRangeLauncher" ref={reviewPanelRef}>
              <div className="armoryReviewModeRow" aria-label="Range mode">
                {reviewApi.modes.map((mode) => (
                  <ReviewModeButton
                    key={mode.id}
                    mode={mode}
                    isActive={mode.id === selectedMode.id}
                    onClick={() => reviewApi.onModeChange?.(mode.id)}
                  />
                ))}
              </div>

              <section className="armoryRangeLauncherHero">
                <div className="armoryRangeLauncherCopy">
                  <p className="armoryReviewEyebrow">{selectedMode.label} rules</p>
                  <h3 className="armoryReviewTitle">Take {activeLoadout.name} to the range</h3>
                  <p className="armoryReviewLead">
                    Run a live 10-second sample with real shrink, movement, and your hotbar.
                  </p>
                  <p className="armoryReviewNote">No XP, no coins, no rank — nothing is saved.</p>
                </div>
                <div className="armoryRangeLauncherActions">
                  <button type="button" className="primaryButton" onClick={rangeApi.open}>
                    Run the Range
                  </button>
                  <button
                    type="button"
                    className="secondaryButton"
                    onClick={specSheetApi.open}
                  >
                    Open Spec Sheet
                  </button>
                </div>
              </section>
            </div>
          </ArmoryStepCard>
        </div>
      </div>

      <ArmorySpecSheet
        isOpen={specSheetApi.isOpen}
        onClose={specSheetApi.close}
        loadoutName={activeLoadout.name}
        modeLabel={selectedMode.label}
        presentation={activePresentation}
        showDetails={specSheetApi.showDetails}
        onToggleDetails={specSheetApi.setShowDetails}
        loadoutStats={specSheetApi.loadoutStats}
      />

      <ArmoryTestRange
        isOpen={rangeApi.isOpen}
        roundRules={activePresentation.roundRules}
        modeLabel={selectedMode.label}
        loadoutName={activeLoadout.name}
        runToken={rangeApi.runToken}
        onRunAgain={rangeApi.runAgain}
        onExit={rangeApi.close}
        arenaThemeClass={rangeApi.arenaThemeClass}
        buttonSkinClass={rangeApi.buttonSkinClass}
        buttonSkinImageSrc={rangeApi.buttonSkinImageSrc}
        buttonSkinImageScale={rangeApi.buttonSkinImageScale}
      />

      <ArmoryCompareBench
        isOpen={compareApi.isOpen}
        onClose={compareApi.close}
        view={compareApi.view}
        onChangeView={compareApi.setView}
        modeLabel={selectedMode.label}
        activeLoadout={activeLoadout}
        activePresentation={activePresentation}
        ghostLoadout={compareApi.ghostLoadout}
        ghostPresentation={compareApi.ghostPresentation}
        modePresentations={compareApi.modePresentations}
      />

      <ArmoryWalkthroughOverlay
        step={walkthroughApi.currentStep}
        stepIndex={walkthroughApi.stepIndex}
        stepCount={walkthroughApi.stepCount}
        spotlightRect={walkthroughApi.spotlightRect}
        selectedModeLabel={selectedMode.label}
        isManual={walkthroughApi.source === "manual"}
        onSkip={walkthroughApi.close}
        onBack={walkthroughApi.goBack}
        onNext={walkthroughApi.goNext}
        onKeepCurrentName={walkthroughApi.keepCurrentName}
        onSaveName={walkthroughApi.saveName}
        onGoToReady={walkthroughApi.goToReady}
        onKeepTuning={walkthroughApi.keepTuning}
      />
    </div>
  )
}
